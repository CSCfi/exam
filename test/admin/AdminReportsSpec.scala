// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package admin

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.{ExamEnrolment, ExamParticipation, Reservation}
import models.exam.{Course, Exam, ExamState}
import models.facility.ExamRoom
import models.user.User
import org.apache.poi.ss.usermodel.DataFormatter
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}
import play.api.test.Helpers.contentAsBytes

import java.io.ByteArrayInputStream
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit.HOURS
import java.time.{Instant, LocalDate, ZoneId}
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

/** The administrator's reports and statistics */
class AdminReportsSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private val zone  = ZoneId.of("Europe/Helsinki")
  private val today = LocalDate.now(zone)
  // Just after midnight in Finland, still the day before in UTC
  private val earlyToday = today.atTime(0, 30).atZone(zone).toInstant
  private val Day        = DateTimeFormatter.ofPattern("dd.MM.yyyy")
  private val todayParam = today.format(Day)

  private def user(eppn: String): User = DB.find(classOf[User]).where().eq("eppn", eppn).find.get
  private def olli: User               = user("teacher@funet.fi")
  private def student: User            = user("student@funet.fi")

  private def call(
      method: String,
      url: String,
      session: Session,
      body: Option[JsValue] = None
  ): Result = runIO(makeRequest(method, url, body, session = session))

  private def ok(result: Result): Result =
    statusOf(result) must be(Status.OK)
    result

  /** Every cell of the workbook as text */
  private def cells(result: Result): Seq[String] =
    val wb = new XSSFWorkbook(
      new ByteArrayInputStream(contentAsBytes(Future.successful(ok(result))).toArray)
    )
    val formatter = new DataFormatter()
    wb.sheetIterator().asScala.toSeq.flatMap(_.asScala).flatMap(_.asScala).map(
      formatter.formatCellValue
    )

  /** A student's attempt at exam 1, made and taken early today */
  private def attempt(state: ExamState, name: String = "Taken today"): (Exam, ExamParticipation) =
    ensureTestDataLoaded()
    val parent = DB.find(classOf[Exam], 1L)
    val copy   = new Exam
    copy.name = name
    copy.parent = parent
    copy.course = parent.course
    copy.state = state
    copy.duration = 60
    copy.creator = student
    copy.created = earlyToday
    copy.gradedTime = earlyToday
    copy.save()
    val reservation = new Reservation
    reservation.user = student
    reservation.machine = DB.find(classOf[ExamRoom], 1L).examMachines.get(0)
    reservation.startAt = earlyToday
    reservation.endAt = earlyToday.plus(1, HOURS)
    reservation.save()
    val p = new ExamParticipation
    p.exam = copy
    p.user = student
    p.reservation = reservation
    p.started = earlyToday.plusSeconds(60)
    p.ended = earlyToday.plusSeconds(1800)
    p.save()
    (copy, p)

  "Reports" when:
    "asked for a single day" should:
      "include what happened early that day, on the organisation's calendar" in:
        val (_, session) = runIO(loginAsAdmin())
        val (copy, p)    = attempt(ExamState.GRADED, "Graded early today")
        val enrolment    = new ExamEnrolment
        enrolment.exam = copy
        enrolment.user = student
        enrolment.reservation = p.reservation
        enrolment.enrolledOn = earlyToday
        enrolment.save()
        val proto = new Exam
        proto.name = "Made early today"
        proto.course = copy.course
        proto.creator = olli
        proto.state = ExamState.DRAFT
        // As a new draft gets them
        proto.examType = DB.find(classOf[models.exam.ExamType], 2)
        proto.periodStart = earlyToday
        proto.periodEnd = earlyToday.plusSeconds(86400)
        proto.save()
        proto.created = earlyToday
        proto.update()
        val range = s"$todayParam/$todayParam"

        cells(call("GET", s"/app/reports/reviewsbydate/$range", session)) must contain(
          "Graded early today"
        )
        cells(call("GET", s"/app/reports/allexams/$range", session)) must contain(
          "Graded early today"
        )
        cells(call("GET", s"/app/reports/student/${student.id}/$range", session)) must contain(
          "Graded early today"
        )
        cells(call("GET", s"/app/reports/resbydate/1/$range", session)) must contain(
          "Graded early today"
        )
        cells(call("GET", s"/app/reports/teacherexamsbydate/${olli.id}/$range", session)) must
          contain("Made early today")

      "leave out what happened the day before" in:
        val (_, session) = runIO(loginAsAdmin())
        attempt(ExamState.GRADED, "Graded early today")
        val yesterday = today.minusDays(1).format(Day)

        val report =
          cells(call("GET", s"/app/reports/reviewsbydate/$yesterday/$yesterday", session))
        report must not contain "Graded early today"

    "asked for an exam" should:
      "give it as a spreadsheet or JSON, and its enrolments" in:
        val (_, session) = runIO(loginAsAdmin())
        ensureTestDataLoaded()
        val e = DB.find(classOf[Exam], 1L)

        contentAsJsonOf(ok(call("GET", "/app/reports/examnames", session))).as[JsArray].value
          .map(j => (j \ "id").as[Long]) must contain(e.id)
        cells(call("GET", s"/app/reports/examnames/${e.id}/xlsx", session)) must contain(e.name)
        (contentAsJsonOf(ok(call("GET", s"/app/reports/examnames/${e.id}/json", session))) \ "id")
          .as[Long] must be(e.id)
        statusOf(call("GET", s"/app/reports/examnames/${e.id}/pdf", session)) must be(
          Status.BAD_REQUEST
        )
        statusOf(call("GET", "/app/reports/examnames/999999/xlsx", session)) must be(
          Status.NOT_FOUND
        )

        val enrolment = new ExamEnrolment
        enrolment.exam = e
        enrolment.user = student
        enrolment.enrolledOn = Instant.now()
        enrolment.save()
        cells(call("GET", s"/app/reports/examenrollments/${e.id}", session)) must contain(
          s"${student.firstName} ${student.lastName}"
        )
        statusOf(call("GET", "/app/reports/examenrollments/999999", session)) must be(
          Status.NOT_FOUND
        )
        statusOf(call("GET", s"/app/reports/student/999999/$todayParam/$todayParam", session)) must
          be(Status.NOT_FOUND)

      "build a report of the rows it is given" in:
        val (_, session) = runIO(loginAsAdmin())

        cells(call(
          "POST",
          "/app/reports/generic/xlsx",
          session,
          Some(Json.obj(
            "headers" -> Json.arr("Name", "Count"),
            "rows"    -> Json.arr(Json.arr("A", "1"))
          ))
        )) must be(Seq("Name", "Count", "A", "1"))

    "a teacher asks" should:
      "be refused" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(call("GET", "/app/reports/examnames", session)) must be(Status.FORBIDDEN)
        statusOf(call("GET", s"/app/reports/reviewsbydate/$todayParam/$todayParam", session)) must
          be(Status.FORBIDDEN)

  "Statistics" when:
    "filtered by department and period" should:
      "count the attempts, responses and bookings" in:
        val (_, session) = runIO(loginAsAdmin())
        val (copy, p)    = attempt(ExamState.GRADED)
        val course       = DB.find(classOf[Course], copy.course.id)
        course.department = "Physics"
        course.update()
        val enrolment = new ExamEnrolment
        enrolment.exam = copy
        enrolment.user = student
        enrolment.reservation = p.reservation
        enrolment.enrolledOn = earlyToday
        enrolment.save()
        // As the page sends it: the day's local midnight, in UTC
        val midnight          = today.atStartOfDay(zone).toInstant
        val query             = s"dept=Physics&start=$midnight&end=$midnight"
        def json(url: String) = contentAsJsonOf(ok(call("GET", url, session)))

        (json("/app/statistics/departments") \ "departments").as[Seq[String]] must contain(
          "Physics"
        )
        json(s"/app/statistics/exams?$query").as[JsArray].value.map(j =>
          (j \ "participations").as[Int]
        )
          .sum must be >= 1
        (json(s"/app/statistics/responses?$query") \ "assessed").as[Int] must be >= 1
        (json(s"/app/statistics/reservations?$query") \ "appearances").as[Int] must be >= 1
        json(s"/app/statistics/participations?$query").as[JsObject].values
          .map(_.as[JsArray].value.size).sum must be >= 1
        json(s"/app/statistics/reservations/iop?$query").as[JsArray].value must be(empty)

        (json("/app/statistics/responses?dept=Nowhere") \ "assessed").as[Int] must be(0)

    "exporting question scores" should:
      "give the scores of the chosen attempts" in:
        val (_, session) = runIO(loginAsAdmin())
        val (copy, _)    = attempt(ExamState.GRADED)

        val result = call(
          "POST",
          s"/app/statistics/questionreport/${copy.parent.id}",
          session,
          Some(Json.obj("ids" -> s"${copy.id}"))
        )
        cells(result) must not be empty
        statusOf(call(
          "POST",
          "/app/statistics/questionreport/999999",
          session,
          Some(Json.obj("ids" -> s"${copy.id}"))
        )) must be(Status.NOT_FOUND)
