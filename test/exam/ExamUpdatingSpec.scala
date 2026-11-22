// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package exam

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.AutoEvaluationReleaseType
import models.enrolment.*
import models.exam.*
import models.user.User
import play.api.http.Status
import play.api.inject.bind
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*
import play.api.libs.json.Json.JsValueWrapper
import play.api.mvc.{Result, Session}
import services.mail.{Dispatch, EmailSender, Mail}

import java.time.Instant
import java.time.temporal.ChronoUnit.{DAYS, HOURS}
import java.util.concurrent.ConcurrentLinkedQueue
import scala.jdk.CollectionConverters.*

/** The rules the exam editor's save goes through */
class ExamUpdatingSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  /** Keeps what would have been sent */
  private object Outbox extends EmailSender:
    val sent                                = new ConcurrentLinkedQueue[Dispatch]()
    override def send(mail: Dispatch): Unit = sent.add(mail)

  override protected def appBuilder: GuiceApplicationBuilder =
    super.appBuilder.overrides(bind[EmailSender].toInstance(Outbox))

  override def beforeEach(): Unit =
    super.beforeEach()
    Outbox.sent.clear()

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
    val e = DB.find(classOf[Exam], (contentAsJsonOf(result) \ "id").as[Long])
    e.examSections.forEach { s =>
      s.name = "Section"
      s.update()
    }
    e

  private def reload(e: Exam): Exam = DB.find(classOf[Exam], e.id)

  private def ofType(e: Exam, t: ExamExecutionType.Type): Exam =
    e.executionType = DB.find(classOf[ExamExecutionType]).where().eq("type", t.toString).find.get
    e.update()
    e

  private val periodStart = Instant.now().truncatedTo(DAYS)
  private val periodEnd   = periodStart.plus(30, DAYS)

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

  private def publish(e: Exam, session: Session, changes: (String, JsValueWrapper)*): Result =
    update(e, edited(e, ("state" -> ("PUBLISHED": JsValueWrapper)) +: changes*), session)

  private def upcomingReservation(e: Exam): Unit =
    val r = new Reservation
    r.startAt = Instant.now().plus(1, DAYS)
    r.endAt = r.startAt.plus(1, HOURS)
    r.save()
    val enrolment = new ExamEnrolment
    enrolment.exam = e
    enrolment.reservation = r
    enrolment.save()

  "Auto-evaluation" when:
    "set up, changed and turned off" should:
      "keep the release rule and only the grades given" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        val scale        = DB.find(classOf[GradeScale]).list.find(_.grades.size >= 2).get
        e.gradeScale = scale
        e.update()
        val grades = scale.grades.asScala.toList.sortBy(_.id)
        def evaluations(gs: List[Grade]) =
          JsArray(gs.zipWithIndex.map((g, i) =>
            Json.obj("grade" -> Json.obj("id" -> g.id.intValue), "percentage" -> (i * 10))
          ))
        def config = Option(reload(e).autoEvaluationConfig)

        ok(update(
          e,
          edited(
            e,
            "evaluationConfig" -> Json.obj(
              "releaseType"      -> "GIVEN_AMOUNT_DAYS",
              "amountDays"       -> 5,
              "gradeEvaluations" -> evaluations(grades)
            )
          ),
          session
        ))
        config.map(_.releaseType) must be(Some(AutoEvaluationReleaseType.GIVEN_AMOUNT_DAYS))
        config.map(_.amountDays.intValue) must be(Some(5))
        config.get.gradeEvaluations.size must be(grades.size)

        val releaseDate = Instant.now().plus(10, DAYS).truncatedTo(DAYS)
        ok(update(
          e,
          edited(
            e,
            "evaluationConfig" -> Json.obj(
              "releaseType"      -> "GIVEN_DATE",
              "releaseDate"      -> releaseDate.toEpochMilli,
              "gradeEvaluations" -> evaluations(grades.take(1))
            )
          ),
          session
        ))
        config.map(_.releaseType) must be(Some(AutoEvaluationReleaseType.GIVEN_DATE))
        config.map(_.amountDays) must be(Some(null))
        config.map(_.releaseDate.toInstant) must be(Some(releaseDate))
        config.get.gradeEvaluations.asScala.map(_.grade.id) must be(Set(grades.head.id))

        ok(update(e, edited(e, "evaluationConfig" -> JsNull), session))
        config must be(None)

      "not be set up for a maturity test" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = ofType(draft(session), ExamExecutionType.Type.MATURITY)
        e.gradeScale = DB.find(classOf[GradeScale]).list.find(!_.grades.isEmpty).get
        e.update()

        ok(update(
          e,
          edited(
            e,
            "evaluationConfig" -> Json.obj(
              "releaseType"      -> "IMMEDIATE",
              "gradeEvaluations" -> Json.arr()
            )
          ),
          session
        ))
        Option(reload(e).autoEvaluationConfig) must be(None)

  "Publishing" when:
    "a private exam has participants" should:
      "publish it and tell them, also those enrolled by email only" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = ofType(draft(session), ExamExecutionType.Type.PRIVATE)
        e.course = DB.find(classOf[Course], 1L)
        e.update()
        val student = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find.get
        Seq(Some(student), None).foreach { u =>
          val en = new ExamEnrolment
          en.exam = e
          en.user = u.orNull
          en.preEnrolledUserEmail = if u.isEmpty then "coming@later.fi" else null
          en.save()
        }

        ok(publish(e, session))
        reload(e).state must be(ExamState.PUBLISHED)
        // Sent a second after the save
        val deadline = System.currentTimeMillis() + 10000
        while Outbox.sent.size < 2 && System.currentTimeMillis() < deadline do Thread.sleep(100)
        Outbox.sent.asScala.collect { case m: Mail => m.recipient }.toSet must be(
          Set(student.email, "coming@later.fi")
        )

    "the exam type needs more" should:
      "ask for it" in:
        val (_, session) = runIO(loginAsTeacher())

        val maturity = ofType(draft(session), ExamExecutionType.Type.MATURITY)
        refused(
          publish(maturity, session),
          Status.BAD_REQUEST,
          "language inspection requirement not configured"
        )

        val printout = ofType(draft(session), ExamExecutionType.Type.PRINTOUT)
        refused(publish(printout, session), Status.BAD_REQUEST, "no examination dates specified")
        val date = new ExaminationDate
        date.exam = printout
        date.date = java.util.Date.from(periodEnd)
        date.save()
        ok(publish(printout, session))

        val seb = draft(session)
        seb.implementation = ExamImplementation.CLIENT_AUTH
        seb.update()
        val event = new ExaminationEvent
        event.start = Instant.now().plus(5, DAYS)
        event.save()
        val config = new ExaminationEventConfiguration
        config.exam = seb
        config.examinationEvent = event
        config.save()
        refused(publish(seb, session), Status.BAD_REQUEST, "settings password not configured")

  "Changing dates" when:
    "students have booked" should:
      "let a teacher move the start earlier, not later" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        ok(update(e, edited(e), session))
        upcomingReservation(e)

        refused(
          update(e, edited(e, "periodStart" -> periodStart.plus(1, DAYS).toEpochMilli), session),
          Status.FORBIDDEN,
          "i18n_error_future_reservations_exist"
        )
        ok(update(e, edited(e, "periodStart" -> periodStart.minus(1, DAYS).toEpochMilli), session))
        reload(e).periodStart must be(periodStart.minus(1, DAYS))

    "an examination event is set" should:
      "not let the period end before it" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        e.implementation = ExamImplementation.CLIENT_AUTH
        e.update()
        val event = new ExaminationEvent
        event.start = periodEnd.minus(2, DAYS)
        event.save()
        val config = new ExaminationEventConfiguration
        config.exam = e
        config.examinationEvent = event
        config.save()

        refused(
          update(e, edited(e, "periodEnd" -> periodEnd.minus(5, DAYS).toEpochMilli), session),
          Status.FORBIDDEN,
          "i18n_error_future_reservations_exist"
        )

    "the exam is a printout" should:
      "only take the duration" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = ofType(draft(session), ExamExecutionType.Type.PRINTOUT)
        val before       = reload(e).periodStart
        upcomingReservation(e)

        ok(update(e, edited(e, "duration" -> 120), session))
        reload(e).duration.intValue must be(120)
        reload(e).periodStart must be(before)

  "Other settings" when:
    "saved by a teacher" should:
      "keep the home organisation among the organisations" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)

        ok(update(e, edited(e, "organisations" -> "other-org"), session))
        reload(e).organisations must be("test-org;other-org")
        ok(update(e, edited(e, "organisations" -> "other-org;test-org"), session))
        reload(e).organisations must be("other-org;test-org")

      "fall back to an aquarium exam when the chosen kind is not in use" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        ok(update(e, edited(e, "implementation" -> "WHATEVER"), session))
        reload(e).implementation must be(ExamImplementation.AQUARIUM)

      "leave anonymity as it is" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(session)
        // New drafts are anonymous when anonymous review is in use, as it is here
        reload(e).anonymous must be(true)
        ok(update(e, edited(e, "anonymous" -> false), session))
        reload(e).anonymous must be(true)

    "saved by an administrator" should:
      "change the anonymity of a public exam" in:
        val (_, teacher) = runIO(loginAsTeacher())
        val e            = draft(teacher)
        val (_, session) = runIO(loginAsAdmin())
        ok(update(e, edited(e, "anonymous" -> false), session))
        reload(e).anonymous must be(false)
