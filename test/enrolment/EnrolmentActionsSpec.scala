// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.*
import models.exam.*
import models.user.User
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

import java.time.Instant
import java.time.temporal.ChronoUnit.{DAYS, HOURS, MINUTES}

/** Enrolling to exams and managing enrolments, besides creating them */
class EnrolmentActionsSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  // The course registry check is covered by EnrolmentControllerSpec
  override protected def appBuilder: GuiceApplicationBuilder =
    super.appBuilder.configure("exam.integration.enrolmentPermissionCheck.active" -> false)

  private def student: User =
    DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find.get

  private def someoneElse(): User =
    val u = new User
    u.email = "other.student@uni.fi"
    u.eppn = "other.student@uni.fi"
    u.save()
    u

  /** Exam 1, a public room exam, published and open for a month */
  private def openExam(implementation: ExamImplementation = ExamImplementation.AQUARIUM): Exam =
    ensureTestDataLoaded()
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())
    val e = DB.find(classOf[Exam], 1L)
    e.state = ExamState.PUBLISHED
    e.periodEnd = Instant.now().plus(30, DAYS)
    e.implementation = implementation
    e.update()
    e

  private def privately(e: Exam, state: ExamState = ExamState.PUBLISHED): Exam =
    e.executionType = DB.find(classOf[ExamExecutionType]).where().eq("type", "PRIVATE").find.get
    e.state = state
    e.update()
    e

  private def enrol(e: Exam, u: User): ExamEnrolment =
    val enrolment = new ExamEnrolment
    enrolment.exam = e
    enrolment.user = u
    enrolment.save()
    enrolment

  private def reserve(enrolment: ExamEnrolment, start: Instant, externalRef: String = null): Unit =
    val r = new Reservation
    r.user = enrolment.user
    r.startAt = start
    r.endAt = start.plus(2, HOURS)
    r.externalRef = externalRef
    r.save()
    enrolment.reservation = r
    enrolment.update()

  private def event(e: Exam, start: Instant, capacity: Int = 10): ExaminationEventConfiguration =
    val ee = new ExaminationEvent
    ee.start = start
    ee.description = "Event"
    ee.capacity = capacity
    ee.save()
    val config = new ExaminationEventConfiguration
    config.exam = e
    config.examinationEvent = ee
    config.hash = java.util.UUID.randomUUID().toString
    config.save()
    config

  private def book(enrolment: ExamEnrolment, config: ExaminationEventConfiguration): Unit =
    enrolment.examinationEventConfiguration = config
    enrolment.update()

  private def reload(enrolment: ExamEnrolment): Option[ExamEnrolment] =
    Option(DB.find(classOf[ExamEnrolment], enrolment.id))

  private def call(
      method: String,
      url: String,
      session: Session,
      body: Option[JsValue] = None
  ): Result = runIO(makeRequest(method, url, body, session = session))

  private def enrolTo(e: Exam, session: Session): Result =
    call("POST", s"/app/enrolments/${e.id}", session, Some(Json.obj("code" -> e.course.code)))

  private def ids(result: Result): Seq[Long] =
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[JsArray].value.toSeq.map(j => (j \ "id").as[Long])

  "Enrolling" when:
    "looking up exams by course" should:
      "list the open public exams of the course" in:
        val (_, session) = runIO(loginAsStudent())
        val e            = openExam()

        ids(call("GET", s"/app/enrolments?code=${e.course.code}", session)) must contain(e.id)

        e.periodEnd = Instant.now().minus(1, DAYS)
        e.update()
        ids(call("GET", s"/app/enrolments?code=${e.course.code}", session)) must not contain e.id

      "give the exam's details only with its course code" in:
        val (_, session) = runIO(loginAsStudent())
        val e            = openExam()

        val found = call("GET", s"/app/enrolments/${e.id}?code=${e.course.code}", session)
        statusOf(found) must be(Status.OK)
        (contentAsJsonOf(found) \ "id").as[Long] must be(e.id)
        statusOf(call("GET", s"/app/enrolments/${e.id}?code=NOPE", session)) must be(
          Status.NOT_FOUND
        )

    "checking the student's enrolments to an exam" should:
      "give the ones still to come" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam()
        val upcoming        = enrolTo(e, session)
        statusOf(upcoming) must be(Status.OK)

        ids(call("GET", s"/app/enrolments/exam/${e.id}", session)) must be(
          Seq((contentAsJsonOf(upcoming) \ "id").as[Long])
        )

      "leave out an enrolment whose reservation is over" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam()
        val enrolment       = enrol(e, user)
        reserve(enrolment, Instant.now().minus(1, DAYS))
        // Already handled as a no-show, so it is not picked up again
        enrolment.noShow = true
        enrolment.update()

        ids(call("GET", s"/app/enrolments/exam/${e.id}", session)) must be(empty)

      "tell when no trials are left" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam()
        e.trialCount = 1
        e.update()
        // An earlier attempt, still under review
        val attempt = new Exam
        attempt.name = e.name
        attempt.parent = e
        attempt.state = ExamState.REVIEW
        attempt.save()
        val earlier = enrol(attempt, user)

        statusOf(call("GET", s"/app/enrolments/exam/${e.id}", session)) must be(
          Status.UNAUTHORIZED
        )

        earlier.retrialPermitted = true
        earlier.update()
        statusOf(call("GET", s"/app/enrolments/exam/${e.id}", session)) must be(Status.OK)

      "refuse an unknown exam" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(call("GET", "/app/enrolments/exam/999999", session)) must be(Status.BAD_REQUEST)

    "creating an enrolment" should:
      "refuse an unknown exam" in:
        val (_, session) = runIO(loginAsStudent())
        openExam()
        statusOf(call(
          "POST",
          "/app/enrolments/999999",
          session,
          Some(Json.obj("code" -> "x"))
        )) must be(Status.NOT_FOUND)

      "refuse a second enrolment to an examination event exam" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam(ExamImplementation.CLIENT_AUTH)
        enrol(e, user)

        val result = enrolTo(e, session)
        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_error_enrolment_exists")

      "refuse while the student's examination event is on" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam(ExamImplementation.CLIENT_AUTH)
        book(enrol(e, user), event(e, Instant.now().minus(10, MINUTES)))

        val result = enrolTo(e, session)
        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_reservation_in_effect")

      "replace an enrolment to an examination event still to come" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam(ExamImplementation.CLIENT_AUTH)
        val old             = enrol(e, user)
        book(old, event(e, Instant.now().plus(2, DAYS)))

        statusOf(enrolTo(e, session)) must be(Status.OK)
        reload(old) must be(None)
        DB.find(classOf[ExamEnrolment]).where().eq("user", user).list.size must be(1)

      "wait for the assessment of an exam taken at another organisation" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam()
        reserve(enrol(e, user), Instant.now().minus(1, DAYS), externalRef = "abc123")

        val result = enrolTo(e, session)
        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_enrolment_assessment_not_received")

    "removing an enrolment" should:
      "remove the student's own" in:
        val (user, session) = runIO(loginAsStudent())
        val enrolment       = enrol(openExam(), user)

        statusOf(call("DELETE", s"/app/enrolments/${enrolment.id}", session)) must be(Status.OK)
        reload(enrolment) must be(None)

      "ask to cancel the reservation first" in:
        val (user, session) = runIO(loginAsStudent())
        val enrolment       = enrol(openExam(), user)
        reserve(enrolment, Instant.now().plus(1, DAYS))

        val result = call("DELETE", s"/app/enrolments/${enrolment.id}", session)
        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_cancel_reservation_first")
        reload(enrolment) must not be empty

      "keep enrolments to private exams" in:
        val (user, session) = runIO(loginAsStudent())
        val enrolment       = enrol(privately(openExam()), user)

        statusOf(call("DELETE", s"/app/enrolments/${enrolment.id}", session)) must be(
          Status.FORBIDDEN
        )
        reload(enrolment) must not be empty

      "not find another student's enrolment" in:
        val (_, session) = runIO(loginAsStudent())
        val enrolment    = enrol(openExam(), someoneElse())

        statusOf(call("DELETE", s"/app/enrolments/${enrolment.id}", session)) must be(
          Status.NOT_FOUND
        )
        reload(enrolment) must not be empty

    "the student writing additional information" should:
      "store it on their own enrolment only" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam()
        val own             = enrol(e, user)
        val other           = enrol(e, someoneElse())
        val body            = Some(Json.obj("information" -> "Need a left-handed desk"))

        statusOf(call("PUT", s"/app/enrolments/${own.id}", session, body)) must be(Status.OK)
        reload(own).get.information must be("Need a left-handed desk")

        statusOf(call("PUT", s"/app/enrolments/${other.id}", session, body)) must be(
          Status.NOT_FOUND
        )
        reload(other).get.information must be(null)

  "Teachers enrolling students" when:
    "adding a student to a private exam" should:
      "enrol a known user by id" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = privately(openExam(), ExamState.DRAFT)

        val result = call(
          "POST",
          s"/app/enrolments/student/${e.id}",
          session,
          Some(Json.obj("uid" -> student.id.longValue))
        )
        statusOf(result) must be(Status.OK)
        DB.find(classOf[ExamEnrolment]).where().eq("exam", e).eq("user", student).find must not be
          empty

      "not pre-enrol the same address twice" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = privately(openExam(), ExamState.DRAFT)
        val body         = Some(Json.obj("email" -> "newcomer@uni.fi"))

        statusOf(call("POST", s"/app/enrolments/student/${e.id}", session, body)) must be(Status.OK)
        statusOf(call("POST", s"/app/enrolments/student/${e.id}", session, body)) must be(
          Status.BAD_REQUEST
        )
        DB.find(classOf[ExamEnrolment]).where().eq("preEnrolledUserEmail", "newcomer@uni.fi")
          .list.size must be(1)

      "refuse an unknown exam" in:
        val (_, session) = runIO(loginAsTeacher())
        openExam()
        statusOf(call(
          "POST",
          "/app/enrolments/student/999999",
          session,
          Some(Json.obj("uid" -> student.id.longValue))
        )) must be(Status.NOT_FOUND)

    "removing a student from a private exam" should:
      "let the owner do it before publishing" in:
        val (_, session) = runIO(loginAsTeacher())
        val enrolment    = enrol(privately(openExam(), ExamState.DRAFT), student)

        statusOf(call("DELETE", s"/app/enrolments/student/${enrolment.id}", session)) must be(
          Status.OK
        )
        reload(enrolment) must be(None)

      "not once the exam is published" in:
        val (_, session) = runIO(loginAsTeacher())
        val enrolment    = enrol(privately(openExam()), student)

        statusOf(call("DELETE", s"/app/enrolments/student/${enrolment.id}", session)) must be(
          Status.FORBIDDEN
        )
        reload(enrolment) must not be empty

      "not let other teachers do it" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val e                  = privately(openExam(), ExamState.DRAFT)
        e.creator = DB.find(classOf[User]).where().eq("eppn", "admin@funet.fi").find.get
        e.examOwners.clear()
        e.update()
        val enrolment = enrol(e, student)

        statusOf(call("DELETE", s"/app/enrolments/student/${enrolment.id}", session)) must be(
          Status.FORBIDDEN
        )
        reload(enrolment) must not be empty

    "permitting a retrial" should:
      "mark the enrolment" in:
        val (_, session) = runIO(loginAsTeacher())
        val enrolment    = enrol(openExam(), student)

        statusOf(call("PUT", s"/app/enrolments/${enrolment.id}/retrial", session)) must be(
          Status.OK
        )
        reload(enrolment).get.retrialPermitted must be(true)
        statusOf(call("PUT", "/app/enrolments/999999/retrial", session)) must be(Status.NOT_FOUND)

  "Choosing an examination event" when:
    "the student picks one" should:
      "check and take a place in an event still to come" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam(ExamImplementation.CLIENT_AUTH)
        val enrolment       = enrol(e, user)
        val config          = event(e, Instant.now().plus(2, DAYS))
        val url             = s"/app/enrolments/${enrolment.id}/examination/${config.id}"

        statusOf(call("GET", url, session)) must be(Status.OK)
        statusOf(call("POST", url, session)) must be(Status.OK)
        reload(enrolment).get.examinationEventConfiguration.id must be(config.id)

      "refuse a full event" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam(ExamImplementation.CLIENT_AUTH)
        val enrolment       = enrol(e, user)
        val config          = event(e, Instant.now().plus(2, DAYS), capacity = 1)
        book(enrol(e, someoneElse()), config)
        val url = s"/app/enrolments/${enrolment.id}/examination/${config.id}"

        statusOf(call("GET", url, session)) must be(Status.FORBIDDEN)
        statusOf(call("POST", url, session)) must be(Status.FORBIDDEN)
        reload(enrolment).get.examinationEventConfiguration must be(null)

      "refuse an event already started" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam(ExamImplementation.CLIENT_AUTH)
        val enrolment       = enrol(e, user)
        val config          = event(e, Instant.now().minus(1, HOURS))

        statusOf(call(
          "POST",
          s"/app/enrolments/${enrolment.id}/examination/${config.id}",
          session
        )) must be(Status.NOT_FOUND)

      "give up the chosen event" in:
        val (user, session) = runIO(loginAsStudent())
        val e               = openExam(ExamImplementation.CLIENT_AUTH)
        val enrolment       = enrol(e, user)
        book(enrolment, event(e, Instant.now().plus(2, DAYS)))

        statusOf(call("DELETE", s"/app/enrolments/${enrolment.id}/examination", session)) must be(
          Status.OK
        )
        reload(enrolment).get.examinationEventConfiguration must be(null)
        statusOf(call("DELETE", s"/app/enrolments/${enrolment.id}/examination", session)) must be(
          Status.NOT_FOUND
        )

    "an administrator cancels an event" should:
      "remove it and free its participants" in:
        val (_, session) = runIO(loginAsAdmin())
        val e            = openExam(ExamImplementation.CLIENT_AUTH)
        val config       = event(e, Instant.now().plus(2, DAYS))
        val enrolment    = enrol(e, student)
        book(enrolment, config)

        statusOf(call("DELETE", s"/app/enrolments/configs/${config.id}", session)) must be(
          Status.OK
        )
        Option(DB.find(classOf[ExaminationEventConfiguration], config.id)) must be(None)
        Option(DB.find(classOf[ExaminationEvent], config.examinationEvent.id)) must be(None)
        reload(enrolment).get.examinationEventConfiguration must be(null)

      "keep an event already started" in:
        val (_, session) = runIO(loginAsAdmin())
        val config = event(openExam(ExamImplementation.CLIENT_AUTH), Instant.now().minus(1, HOURS))

        statusOf(call("DELETE", s"/app/enrolments/configs/${config.id}", session)) must be(
          Status.FORBIDDEN
        )
        Option(DB.find(classOf[ExaminationEventConfiguration], config.id)) must not be empty
        statusOf(call("DELETE", "/app/enrolments/configs/999999", session)) must be(
          Status.BAD_REQUEST
        )

  "Administrators" when:
    "listing the enrolments of a reservation" should:
      "give the enrolment that holds it" in:
        val (_, session) = runIO(loginAsAdmin())
        val enrolment    = enrol(openExam(), student)
        reserve(enrolment, Instant.now().plus(1, DAYS))

        ids(call(
          "GET",
          s"/app/enrolments/reservation/${reload(enrolment).get.reservation.id}",
          session
        )) must be(Seq(enrolment.id.longValue))
