// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.{ExamInspection, ExamRecord}
import models.enrolment.ExamParticipation
import models.exam.*
import models.user.User
import org.apache.poi.ss.usermodel.DataFormatter
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}
import play.api.test.Helpers.contentAsBytes

import java.io.ByteArrayInputStream
import java.time.{Instant, LocalDate, ZoneId}
import scala.concurrent.Future

class ExamRecordControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def exam: Exam =
    DB.find(classOf[Exam]).where().eq("name", "Algoritmit, 2013").isNotNull("parent").find
      .getOrElse(fail("No exam found"))

  private def inspect(user: User): Unit =
    val inspection = new ExamInspection()
    inspection.user = user
    inspection.exam = exam
    inspection.save()

  /** The exam graded and ready to register; the participation ended at `ended` */
  private def graded(customCredit: java.lang.Double, ended: Instant, grader: User): Exam =
    val e = exam
    e.grade = DB.find(classOf[Grade]).where().eq("gradeScale.id", e.gradeScale.id).list.head
    e.gradingType = GradeType.GRADED
    e.creditType = e.examType
    e.answerLanguage = "fi"
    e.gradedByUser = grader
    e.customCredit = customCredit
    e.state = ExamState.GRADED
    e.update()
    val participation = DB.find(classOf[ExamParticipation]).where().eq("exam.id", e.id).find
      .getOrElse(fail("No participation found"))
    participation.ended = ended
    participation.update()
    e

  private def register(id: Long, session: Session): Result =
    runIO(makeRequest("POST", "/app/exam/record", Some(Json.obj("id" -> id)), session = session))

  private def record(examId: Long): ExamRecord =
    DB.find(classOf[ExamRecord]).fetch("examScore").where().eq("exam.id", examId).find
      .getOrElse(fail("No record found"))

  private val helsinki = ZoneId.of("Europe/Helsinki")

  "ExamRecordController" when:
    "registering a graded exam" should:
      "record the score, credits and the exam date on the organisation's calendar" in:
        val (user, session) = runIO(loginAsAdmin())
        inspect(user)
        // 01:30 in Helsinki on 13 June, still 12 June in UTC
        val e = graded(5.0, Instant.parse("2030-06-12T22:30:00Z"), user)

        statusOf(register(e.id, session)) must be(Status.OK)

        val score = record(e.id).examScore
        score.credits must be("5.0")
        score.examDate must be("2030-06-13")
        score.registrationDate must be(LocalDate.now(helsinki).toString)
        score.lecturer must be(user.eppn)
        DB.find(classOf[Exam], e.id).state must be(ExamState.GRADED_LOGGED)

      "register a course without credits, leaving them empty" in:
        val (user, session) = runIO(loginAsAdmin())
        inspect(user)
        val e      = graded(null, Instant.parse("2030-06-12T10:00:00Z"), user)
        val course = e.course
        course.credits = null
        course.update()

        statusOf(register(e.id, session)) must be(Status.OK)
        record(e.id).examScore.credits must be("")

      "refuse a second registration" in:
        val (user, session) = runIO(loginAsAdmin())
        inspect(user)
        val e = graded(5.0, Instant.parse("2030-06-12T10:00:00Z"), user)
        statusOf(register(e.id, session)) must be(Status.OK)

        val again = register(e.id, session)
        statusOf(again) must be(Status.FORBIDDEN)
        contentAsStringOf(again) must be("i18n_error_exam_already_graded_logged")
        DB.find(classOf[ExamRecord]).where().eq("exam.id", e.id).list must have size 1

      "refuse a teacher who neither owns nor reviews the exam" in:
        val (user, session) = runIO(loginAsTeacher())
        val e               = graded(5.0, Instant.parse("2030-06-12T10:00:00Z"), user)
        // The test teacher made the exam: hand it to someone else
        val parent = e.parent
        parent.creator = DB.find(classOf[User]).where().ne("id", user.id).list.head
        parent.examOwners.clear()
        parent.update()

        statusOf(register(e.id, session)) must be(Status.FORBIDDEN)
        DB.find(classOf[ExamRecord]).where().eq("exam.id", e.id).list must be(empty)

      "refuse an exam that is not yet fully graded" in:
        val (user, session) = runIO(loginAsAdmin())
        inspect(user)
        val e = graded(5.0, Instant.parse("2030-06-12T10:00:00Z"), user)
        e.answerLanguage = null
        e.update()

        statusOf(register(e.id, session)) must be(Status.FORBIDDEN)
        DB.find(classOf[Exam], e.id).state must be(ExamState.GRADED)

      "answer 404 for an unknown exam" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(register(999999L, session)) must be(Status.NOT_FOUND)

    "exporting registered records" should:
      "give them as Excel, with empty credits left empty" in:
        val (user, session) = runIO(loginAsAdmin())
        inspect(user)
        val e      = graded(null, Instant.parse("2030-06-12T10:00:00Z"), user)
        val course = e.course
        course.credits = null
        course.update()
        statusOf(register(e.id, session)) must be(Status.OK)

        val result = runIO(
          makeRequest(
            "POST",
            s"/app/exam/record/export/report/${e.parent.id}",
            Some(Json.obj("ids" -> e.id.toString)),
            session = session
          )
        )
        statusOf(result) must be(Status.OK)
        val sheet = new XSSFWorkbook(
          new ByteArrayInputStream(contentAsBytes(Future.successful(result)).toArray)
        ).getSheetAt(0)
        val fmt = new DataFormatter()
        val headers = (0 until sheet.getRow(0).getLastCellNum).map(i =>
          sheet.getRow(0).getCell(i).getStringCellValue
        )
        sheet.getLastRowNum must be(1)
        fmt.formatCellValue(sheet.getRow(1).getCell(headers.indexOf("credits"))) must be("")

      "give them as CSV" in:
        val (user, session) = runIO(loginAsAdmin())
        inspect(user)
        val e = graded(5.0, Instant.parse("2030-06-12T10:00:00Z"), user)
        statusOf(register(e.id, session)) must be(Status.OK)

        val result = runIO(
          makeRequest(
            "POST",
            s"/app/exam/record/export/${e.parent.id}",
            Some(Json.obj("ids" -> e.id.toString)),
            session = session
          )
        )
        statusOf(result) must be(Status.OK)
        val csv = contentAsBytes(Future.successful(result)).utf8String
        csv must include(record(e.id).examScore.student)
        csv must include("2030-06-12")
