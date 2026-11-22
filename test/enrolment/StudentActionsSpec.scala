// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.AutoEvaluationConfig
import models.enrolment.*
import models.exam.{Exam, ExamImplementation, ExamState}
import models.user.User
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*
import play.api.mvc.{Result, Session}
import play.api.test.Helpers.contentAsBytes
import services.config.ByodConfigHandler

import java.io.ByteArrayInputStream
import java.time.Instant
import java.time.temporal.ChronoUnit.{DAYS, HOURS}
import java.util.UUID
import scala.concurrent.Future

/** What students see of their exams, enrolments and results */
class StudentActionsSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  override protected def appBuilder: GuiceApplicationBuilder =
    super.appBuilder.configure("exam.integration.enrolmentPermissionCheck.active" -> false)

  /** Exam 1, published and open for enrolment */
  private def openExam(implementation: ExamImplementation = ExamImplementation.AQUARIUM): Exam =
    ensureTestDataLoaded()
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())
    val e = DB.find(classOf[Exam], 1L)
    e.state = ExamState.PUBLISHED
    e.periodEnd = Instant.now().plus(30, DAYS)
    e.implementation = implementation
    e.update()
    e

  /** The student's copy of exam 1 in the given state, with their participation */
  private def attempt(student: User, state: ExamState): Exam =
    val parent = openExam()
    val copy   = new Exam
    copy.name = parent.name
    copy.course = parent.course
    copy.parent = parent
    copy.creator = student
    copy.state = state
    copy.duration = parent.duration
    copy.save()
    val p = new ExamParticipation
    p.exam = copy
    p.user = student
    p.started = Instant.now().minus(3, DAYS)
    p.ended = p.started.plus(1, HOURS)
    p.save()
    copy.examParticipation = p
    copy

  private def enrol(e: Exam, u: User): ExamEnrolment =
    val enrolment = new ExamEnrolment
    enrolment.exam = e
    enrolment.user = u
    enrolment.save()
    enrolment

  private def someoneElse(): User =
    val u = new User
    u.email = "other.student@uni.fi"
    u.save()
    u

  private def event(e: Exam, start: Instant): ExaminationEventConfiguration =
    val ee = new ExaminationEvent
    ee.start = start
    ee.description = "Event"
    ee.capacity = 10
    ee.save()
    val config = new ExaminationEventConfiguration
    config.exam = e
    config.examinationEvent = ee
    config.hash = UUID.randomUUID().toString
    config.save()
    config

  private def get(url: String, session: Session): Result =
    runIO(makeRequest("GET", url, session = session))

  private def ids(result: Result): Seq[Long] =
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[JsArray].value.toSeq.map(j => (j \ "id").as[Long])

  "A student" when:
    "reading the feedback of an exam" should:
      "get it once the grade is registered" in:
        val (student, session) = runIO(loginAsStudent())
        val copy               = attempt(student, ExamState.GRADED_LOGGED)

        val result = get(s"/app/feedback/exams/${copy.id}", session)
        statusOf(result) must be(Status.OK)
        (contentAsJsonOf(result) \ "id").as[Long] must be(copy.id)

      "get it from an automatically graded exam once notified" in:
        val (student, session) = runIO(loginAsStudent())
        val copy               = attempt(student, ExamState.GRADED)
        statusOf(get(s"/app/feedback/exams/${copy.id}", session)) must be(Status.NOT_FOUND)

        val config = new AutoEvaluationConfig
        config.exam = copy
        config.save()
        copy.autoEvaluationNotified = Instant.now()
        copy.update()
        statusOf(get(s"/app/feedback/exams/${copy.id}", session)) must be(Status.OK)
        statusOf(get(s"/app/feedback/exams/${copy.id}/score", session)) must be(Status.OK)

      "get nothing while the exam is being reviewed" in:
        val (student, session) = runIO(loginAsStudent())
        val copy               = attempt(student, ExamState.REVIEW)

        statusOf(get(s"/app/feedback/exams/${copy.id}", session)) must be(Status.NOT_FOUND)
        statusOf(get(s"/app/feedback/exams/${copy.id}/score", session)) must be(Status.NOT_FOUND)
        statusOf(get(s"/app/feedback/exams/${copy.id}/report", session)) must be(Status.NOT_FOUND)

      "get nothing of another student's exam" in:
        val (_, session) = runIO(loginAsStudent())
        val copy         = attempt(someoneElse(), ExamState.GRADED_LOGGED)

        statusOf(get(s"/app/feedback/exams/${copy.id}", session)) must be(Status.NOT_FOUND)
        statusOf(get(s"/app/feedback/exams/${copy.id}/score", session)) must be(Status.NOT_FOUND)

    "reading the score of an exam" should:
      "get the scores counted" in:
        val (student, session) = runIO(loginAsStudent())
        val copy               = attempt(student, ExamState.GRADED_LOGGED)

        val result = get(s"/app/feedback/exams/${copy.id}/score", session)
        statusOf(result) must be(Status.OK)
        val json = contentAsJsonOf(result)
        (json \ "id").as[Long] must be(copy.id)
        (json \ "maxScore").toOption must not be empty

      "get the score report as a spreadsheet" in:
        val (student, session) = runIO(loginAsStudent())
        val copy               = attempt(student, ExamState.GRADED_LOGGED)

        val result = get(s"/app/feedback/exams/${copy.id}/report", session)
        statusOf(result) must be(Status.OK)
        val bytes = contentAsBytes(Future.successful(result)).toArray
        val wb    = new XSSFWorkbook(new ByteArrayInputStream(bytes))
        wb.getNumberOfSheets must be(1)
        wb.getSheetAt(0).getPhysicalNumberOfRows must be(2)

    "listing finished exams" should:
      "list attempts no longer in progress and exams missed" in:
        val (student, session) = runIO(loginAsStudent())
        val graded             = attempt(student, ExamState.GRADED_LOGGED)
        val ongoing            = attempt(student, ExamState.STUDENT_STARTED)
        val missed             = enrol(openExam(), student)
        missed.noShow = true
        missed.update()

        val listed = ids(get("/app/student/finishedexams", session))
        listed must contain(graded.examParticipation.id)
        listed must not contain ongoing.examParticipation.id
        listed must contain(missed.id)

      "filter them by the exam's name" in:
        val (student, session) = runIO(loginAsStudent())
        val graded             = attempt(student, ExamState.GRADED_LOGGED)

        ids(get("/app/student/finishedexams?filter=alkeiden", session)) must contain(
          graded.examParticipation.id
        )
        ids(get("/app/student/finishedexams?filter=nothing-like-this", session)) must be(empty)

    "looking for exams to enrol to" should:
      "list the open public exams that can still be taken" in:
        val (_, session) = runIO(loginAsStudent())
        val e            = openExam()

        ids(get("/app/student/exams", session)) must contain(e.id)
        ids(get("/app/student/exams?filter=alkeiden", session)) must contain(e.id)
        ids(get("/app/student/exams?filter=nothing-like-this", session)) must be(empty)

      "list an examination event exam only with an event to come" in:
        val (_, session) = runIO(loginAsStudent())
        val e            = openExam(ExamImplementation.WHATEVER)
        event(e, Instant.now().minus(1, DAYS))

        ids(get("/app/student/exams", session)) must not contain e.id
        event(e, Instant.now().plus(1, DAYS))
        ids(get("/app/student/exams", session)) must contain(e.id)

    "reading their enrolments" should:
      "get their own enrolment and the exam's info" in:
        val (student, session) = runIO(loginAsStudent())
        val e                  = openExam()
        val enrolment          = enrol(e, student)

        val result = get(s"/app/student/enrolments/${enrolment.id}", session)
        statusOf(result) must be(Status.OK)
        (contentAsJsonOf(result) \ "exam" \ "id").as[Long] must be(e.id)
        statusOf(get(s"/app/student/exam/${e.id}/info", session)) must be(Status.OK)

      "get nothing of exams they are not enrolled to" in:
        val (_, session) = runIO(loginAsStudent())
        val e            = openExam()
        val enrolment    = enrol(e, someoneElse())

        statusOf(get(s"/app/student/enrolments/${enrolment.id}", session)) must be(
          Status.NOT_FOUND
        )
        statusOf(get(s"/app/student/exam/${e.id}/info", session)) must be(Status.NOT_FOUND)

    "downloading the SEB configuration" should:
      "get it for their examination event" in:
        val (student, session) = runIO(loginAsStudent())
        val e                  = openExam(ExamImplementation.CLIENT_AUTH)
        e.name = "Äidinkieli ja kirjallisuus"
        e.update()
        val byod   = app.injector.instanceOf[ByodConfigHandler]
        val config = event(e, Instant.now().plus(1, DAYS))
        config.settingsPasswordSalt = "salt-s"
        config.encryptedSettingsPassword = byod.getEncryptedPassword("settings-pw", "salt-s")
        config.quitPasswordSalt = "salt-q"
        config.encryptedQuitPassword = byod.getEncryptedPassword("quit-pw", "salt-q")
        config.update()
        val enrolment = enrol(e, student)
        enrolment.examinationEventConfiguration = config
        enrolment.update()

        val result = get(s"/app/student/enrolments/${enrolment.id}/configFile", session)
        statusOf(result) must be(Status.OK)
        headerOf(result, "Content-Disposition").get must include(".seb")
        contentAsBytes(Future.successful(result)).length must be > 0

      "not get it for an exam taken in an exam room" in:
        val (student, session) = runIO(loginAsStudent())
        val enrolment          = enrol(openExam(), student)

        statusOf(get(s"/app/student/enrolments/${enrolment.id}/configFile", session)) must be(
          Status.FORBIDDEN
        )
