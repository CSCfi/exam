// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package exam

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.ExamFeedbackReleaseType
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.*
import models.facility.Software
import models.questions.{Question, QuestionType}
import models.sections.ExamSectionQuestion
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.libs.json.Json.JsValueWrapper
import play.api.mvc.{Result, Session}

import java.time.Instant
import java.time.temporal.ChronoUnit.{DAYS, HOURS}
import java.util.Date
import scala.jdk.CollectionConverters.*

/** Creating, copying, changing and removing exams, and their owners */
class ExamManagementSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def user(eppn: String): User = DB.find(classOf[User]).where().eq("eppn", eppn).find.get
  private def arvon: User              = user("teacher@b.funet.fi")

  private def call(
      method: String,
      url: String,
      session: Session,
      body: Option[JsValue] = None
  ): Result = runIO(makeRequest(method, url, body, session = session))

  private def ok(result: Result): Result =
    statusOf(result) must be(Status.OK)
    result

  private def refused(result: Result, status: Int, message: String): Unit =
    statusOf(result) must be(status)
    contentAsStringOf(result) must be(message)

  /** A new draft made through the API, as the teacher would */
  private def draft(session: Session): Exam =
    val result = ok(call(
      "POST",
      "/app/exams",
      session,
      Some(Json.obj(
        "implementation" -> "AQUARIUM",
        "executionType"  -> Json.obj("type" -> "PUBLIC")
      ))
    ))
    DB.find(classOf[Exam], (contentAsJsonOf(result) \ "id").as[Long])

  private def reload(e: Exam): Exam = DB.find(classOf[Exam], e.id)

  private def detach(e: Exam): Exam =
    e.creator = arvon
    e.examOwners.clear()
    e.examOwners.add(arvon)
    e.update()
    e

  private def upcomingReservation(e: Exam): Unit =
    val r = new Reservation
    r.startAt = Instant.now().plus(1, DAYS)
    r.endAt = r.startAt.plus(1, HOURS)
    r.save()
    val enrolment = new ExamEnrolment
    enrolment.exam = e
    enrolment.reservation = r
    enrolment.save()

  private val periodStart = Instant.now().truncatedTo(DAYS)
  private val periodEnd   = periodStart.plus(30, DAYS)

  /** The exam as the editor sends it */
  private def edited(e: Exam, changes: (String, JsValueWrapper)*): JsObject =
    Json.obj(
      "name"        -> Option(e.name).getOrElse[String]("Exam"),
      "duration"    -> 60,
      "periodStart" -> periodStart.toEpochMilli,
      "periodEnd"   -> periodEnd.toEpochMilli,
      "trialCount"  -> 1
    ) ++ Json.obj(changes*)

  private def update(e: Exam, body: JsObject, session: Session): Result =
    call("PUT", s"/app/exams/${e.id}", session, Some(body))

  /** Named and in a section of its own, ready for publishing */
  private def publishable(e: Exam): Exam =
    e.examSections.forEach { s =>
      s.name = "Section"
      s.update()
    }
    e

  "Creating an exam" when:
    "a teacher starts a draft" should:
      "make an exam with one section, Finnish, owned by the teacher" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val e                  = draft(session)

        e.state must be(ExamState.DRAFT)
        e.examSections.size must be(1)
        e.examLanguages.asScala.map(_.code) must be(Seq("fi"))
        e.examOwners.asScala.map(_.id) must contain(teacher.id)
        e.trialCount must be(1)
        e.hash must not be null

      "refuse an examination event exam without the permission, and a draft without type" in:
        val (_, session) = runIO(loginAsTeacher())

        refused(
          call(
            "POST",
            "/app/exams",
            session,
            Some(Json.obj(
              "implementation" -> "CLIENT_AUTH",
              "executionType"  -> Json.obj("type" -> "PUBLIC")
            ))
          ),
          Status.FORBIDDEN,
          "i18n_access_forbidden"
        )
        statusOf(call("POST", "/app/exams", session, Some(Json.obj()))) must be(Status.BAD_REQUEST)

    "copying an exam" should:
      "make a draft of it without the course" in:
        val (teacher, session) = runIO(loginAsTeacher())
        ensureTestDataLoaded()
        val source = DB.find(classOf[Exam], 1L)

        val result = ok(call(
          "POST",
          s"/app/exams/${source.id}",
          session,
          Some(Json.obj("examinationType" -> "AQUARIUM", "type" -> "PRIVATE"))
        ))
        val copy = DB.find(classOf[Exam], (contentAsJsonOf(result) \ "id").as[Long])
        copy.name must be(s"**COPY**${source.name}")
        copy.state must be(ExamState.DRAFT)
        copy.course must be(null)
        copy.parent must be(null)
        copy.creator.id must be(teacher.id)
        copy.executionType.`type` must be("PRIVATE")
        copy.examSections.size must be(source.examSections.size)

      "need the type of the copy and permission for examination events" in:
        val (_, session) = runIO(loginAsTeacher())
        ensureTestDataLoaded()
        def copy(body: JsObject) = call("POST", "/app/exams/1", session, Some(body))

        statusOf(copy(Json.obj("type" -> "PUBLIC"))) must be(Status.BAD_REQUEST)
        statusOf(copy(Json.obj("examinationType" -> "AQUARIUM", "type" -> "NOPE"))) must be(
          Status.NOT_FOUND
        )
        statusOf(copy(Json.obj("examinationType" -> "WHATEVER", "type" -> "PUBLIC"))) must be(
          Status.FORBIDDEN
        )
        statusOf(call(
          "POST",
          "/app/exams/999999",
          session,
          Some(Json.obj("examinationType" -> "AQUARIUM", "type" -> "PUBLIC"))
        )) must be(Status.NOT_FOUND)

  "Reading an exam" when:
    "opening it in the editor" should:
      "give it to its owners, and to others only when shared" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)

        ok(call("GET", s"/app/exams/${e.id}", session))
        detach(e)
        statusOf(call("GET", s"/app/exams/${e.id}", session)) must be(Status.FORBIDDEN)
        statusOf(call("GET", s"/app/exams/${e.id}/preview", session)) must be(Status.FORBIDDEN)
        e.shared = true
        e.update()
        ok(call("GET", s"/app/exams/${e.id}", session))
        statusOf(call("GET", "/app/exams/999999", session)) must be(Status.NOT_FOUND)

    "previewing it" should:
      "hide the text of a cloze test, which holds the answers" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        val q            = new Question
        q.`type` = QuestionType.ClozeTestQuestion
        q.question = """<p>Sky is <span cloze="true" id="c1">blue</span></p>"""
        q.save()
        val esq = new ExamSectionQuestion
        esq.examSection = e.examSections.asScala.head
        esq.question = q
        esq.save()

        val json = contentAsJsonOf(ok(call("GET", s"/app/exams/${e.id}/preview", session)))
        val question =
          (json \ "examSections" \ 0 \ "sectionQuestions" \ 0 \ "question" \ "question").toOption
        question.forall(_ == JsNull) must be(true)
        contentAsStringOf(ok(call("GET", s"/app/exams/${e.id}/preview", session))) must not include
          "blue"

  "Changing an exam" when:
    "saving the editor" should:
      "store the details" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)

        ok(update(
          e,
          edited(e, "name" -> "Renamed", "instruction" -> "<p>Read all</p>", "trialCount" -> 2),
          session
        ))
        val saved = reload(e)
        (saved.name, saved.duration.intValue, saved.trialCount.intValue) must be(("Renamed", 60, 2))
        saved.instruction must be("<p>Read all</p>")
        (saved.periodStart, saved.periodEnd) must be((periodStart, periodEnd))

      "set and clear the feedback release" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)

        ok(update(
          e,
          edited(e, "feedbackConfig" -> Json.obj("releaseType" -> "ONCE_LOCKED")),
          session
        ))
        reload(e).examFeedbackConfig.releaseType must be(ExamFeedbackReleaseType.ONCE_LOCKED)
        ok(update(e, edited(e, "feedbackConfig" -> JsNull), session))
        reload(e).examFeedbackConfig must be(null)

      "refuse a name missing, another teacher's exam and an unknown one" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)

        statusOf(update(e, edited(e) - "name", session)) must be(Status.BAD_REQUEST)
        statusOf(update(detach(e), edited(e), session)) must be(Status.FORBIDDEN)
        statusOf(call("PUT", "/app/exams/999999", session, Some(edited(e)))) must be(
          Status.NOT_FOUND
        )

    "publishing" should:
      "publish a complete exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = publishable(draft(session))

        ok(update(e, edited(e, "state" -> "PUBLISHED"), session))
        reload(e).state must be(ExamState.PUBLISHED)

      "point out what is missing" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        def publish(changes: (String, JsValueWrapper)*) =
          update(e, edited(e, ("state" -> ("PUBLISHED": JsValueWrapper)) +: changes*), session)

        refused(publish(), Status.BAD_REQUEST, "i18n_exam_contains_unnamed_sections")
        publishable(e)
        refused(
          publish("periodEnd" -> periodStart.minus(1, DAYS).toEpochMilli),
          Status.BAD_REQUEST,
          "i18n_error_end_sooner_than_start"
        )
        val noLanguages = reload(e)
        noLanguages.examLanguages.clear()
        noLanguages.update()
        refused(publish(), Status.BAD_REQUEST, "no exam languages specified")
        reload(e).state must be(ExamState.DRAFT)

      "need participants for a private exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = publishable(draft(session))
        e.executionType = DB.find(classOf[ExamExecutionType]).where().eq("type", "PRIVATE").find.get
        e.update()

        refused(
          update(e, edited(e, "state" -> "PUBLISHED"), session),
          Status.BAD_REQUEST,
          "i18n_no_participants"
        )

    "students have booked" should:
      "only let a teacher widen the period, not change the duration" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        ok(update(e, edited(e), session))
        upcomingReservation(e)

        refused(
          update(e, edited(e, "periodEnd" -> periodEnd.minus(1, DAYS).toEpochMilli), session),
          Status.FORBIDDEN,
          "i18n_error_future_reservations_exist"
        )
        refused(
          update(e, edited(e, "duration" -> 90), session),
          Status.FORBIDDEN,
          "i18n_error_future_reservations_exist"
        )
        ok(update(e, edited(e, "periodEnd" -> periodEnd.plus(1, DAYS).toEpochMilli), session))
        reload(e).periodEnd must be(periodEnd.plus(1, DAYS))

      "let an administrator change them" in:
        val (_, teacherSession) = runIO(loginAsTeacher())
        val e                   = draft(teacherSession)
        ok(update(e, edited(e), teacherSession))
        upcomingReservation(e)
        val (_, session) = runIO(loginAsAdmin())

        ok(update(e, edited(e, "duration" -> 90), session))
        reload(e).duration.intValue must be(90)

    "choosing languages and software" should:
      "toggle a language" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)

        ok(call("PUT", s"/app/exams/${e.id}/language/sv", session))
        reload(e).examLanguages.asScala.map(_.code).toSet must be(Set("fi", "sv"))
        ok(call("PUT", s"/app/exams/${e.id}/language/fi", session))
        reload(e).examLanguages.asScala.map(_.code).toSet must be(Set("sv"))
        statusOf(call("PUT", s"/app/exams/${detach(e).id}/language/en", session)) must be(
          Status.FORBIDDEN
        )

      "require software that some machine has" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        def software(name: String) =
          DB.find(classOf[Software]).where().eq("name", name).find.get

        ok(call("PUT", s"/app/exam/${e.id}/software/${software("Notepad").id}", session))
        reload(e).softwares.asScala.map(_.name) must be(Seq("Notepad"))
        refused(
          call("PUT", s"/app/exam/${e.id}/software/${software("Excel").id}", session),
          Status.BAD_REQUEST,
          "i18n_no_required_softwares"
        )
        reload(e).softwares.asScala.map(_.name) must be(Seq("Notepad"))
        ok(call("PUT", s"/app/exam/${e.id}/software/${software("Notepad").id}", session))
        reload(e).softwares must be(empty)

    "choosing the course" should:
      "accept an active course" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        val course       = new Course
        course.code = "TEST-1"
        course.name = "Testing"
        course.creditsLanguage = "en"
        course.save()

        ok(call("PUT", s"/app/exams/${e.id}/course/${course.id}", session))
        reload(e).course.id must be(course.id)
        reload(e).examLanguages.asScala.map(_.code) must be(Seq("en"))

      "refuse a course already over, and a change once students have booked" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        val over         = new Course
        over.code = "TEST-2"
        over.name = "Over"
        over.endDate = Date.from(Instant.now().minus(1, DAYS))
        over.save()

        refused(
          call("PUT", s"/app/exams/${e.id}/course/${over.id}", session),
          Status.FORBIDDEN,
          "i18n_error_course_not_active"
        )
        upcomingReservation(e)
        refused(
          call("PUT", s"/app/exams/${e.id}/course/1", session),
          Status.FORBIDDEN,
          "i18n_error_future_reservations_exist"
        )

  "Removing an exam" when:
    "the owner removes it" should:
      "mark it deleted" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)

        ok(call("DELETE", s"/app/exams/${e.id}", session))
        reload(e).state must be(ExamState.DELETED)

      "keep an exam already taken or booked, and another teacher's" in:
        val (_, session) = runIO(loginAsTeacher())
        val taken        = draft(session)
        val attempt      = new Exam
        attempt.name = "Attempt"
        attempt.parent = taken
        attempt.state = ExamState.REVIEW
        attempt.save()
        refused(
          call("DELETE", s"/app/exams/${taken.id}", session),
          Status.FORBIDDEN,
          "i18n_exam_removal_not_possible"
        )

        val booked = draft(session)
        upcomingReservation(booked)
        statusOf(call("DELETE", s"/app/exams/${booked.id}", session)) must be(Status.FORBIDDEN)

        val others = detach(draft(session))
        statusOf(call("DELETE", s"/app/exams/${others.id}", session)) must be(Status.FORBIDDEN)
        Seq(taken, booked, others).map(reload(_).state).distinct must be(Seq(ExamState.DRAFT))

  "Exam owners" when:
    "managed by an owner" should:
      "be listed, added and removed" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val e                  = draft(session)
        def owners: Set[Long] =
          contentAsJsonOf(ok(call("GET", s"/app/exam/${e.id}/owners", session))).as[JsArray]
            .value.map(o => (o \ "id").as[Long]).toSet

        owners must be(Set(teacher.id.longValue))
        ok(call("POST", s"/app/exam/${e.id}/owner/${arvon.id}", session))
        owners must be(Set(teacher.id.longValue, arvon.id.longValue))
        ok(call("DELETE", s"/app/exam/${e.id}/owner/${arvon.id}", session))
        owners must be(Set(teacher.id.longValue))
        statusOf(call("POST", s"/app/exam/${e.id}/owner/999999", session)) must be(
          Status.NOT_FOUND
        )

      "not be changed by another teacher" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val e                  = detach(draft(session))

        statusOf(call("POST", s"/app/exam/${e.id}/owner/${teacher.id}", session)) must be(
          Status.FORBIDDEN
        )
        reload(e).examOwners.asScala.map(_.id) must not contain teacher.id

  "Listing exams" when:
    "a teacher looks at theirs" should:
      "give the exams they own or review" in:
        val (_, session) = runIO(loginAsTeacher())
        val own          = draft(session)
        val reviewed     = detach(draft(session))
        val inspection   = new models.assessment.ExamInspection
        inspection.exam = reviewed
        inspection.user = user("teacher@funet.fi")
        inspection.save()
        val others = detach(draft(session))

        val listed = contentAsJsonOf(ok(call("GET", "/app/reviewerexams", session))).as[JsArray]
          .value.map(j => (j \ "id").as[Long])
        listed must contain allOf (own.id, reviewed.id)
        listed must not contain others.id

        val searched = contentAsJsonOf(ok(call("GET", "/app/exams", session))).as[JsArray]
          .value.map(j => (j \ "id").as[Long])
        searched must contain(own.id)
        searched must not contain reviewed.id

      "filter them by course" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        e.name = "With course"
        e.course = DB.find(classOf[Course], 1L)
        e.update()
        val listed = contentAsJsonOf(ok(call("GET", "/app/examsearch?courseIds=1", session)))
          .as[JsArray].value.map(j => (j \ "id").as[Long])
        listed must contain(e.id)
        contentAsJsonOf(ok(call("GET", "/app/examsearch?courseIds=999999", session))).as[JsArray]
          .value must be(empty)

    "the editor loads its choices" should:
      "give the exam types, execution types and grade scales" in:
        val (_, session) = runIO(loginAsTeacher())
        ensureTestDataLoaded()
        // The test data leaves them all inactive
        val public = DB.find(classOf[ExamExecutionType]).where().eq("type", "PUBLIC").find.get
        public.active = true
        public.update()
        def listed(url: String) = contentAsJsonOf(ok(call("GET", url, session))).as[JsArray].value

        listed("/app/examtypes").map(j =>
          (j \ "type").as[String]
        ) must contain allOf ("PARTIAL", "FINAL")
        listed("/app/executiontypes").map(j => (j \ "type").as[String]) must be(Seq("PUBLIC"))
        listed("/app/gradescales") must not be empty
