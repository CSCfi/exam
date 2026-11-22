// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package excel

import base.BaseIntegrationSpec
import models.assessment.{ExamRecord, ExamScore}
import models.enrolment.*
import models.exam.*
import models.facility.{ExamMachine, ExamRoom}
import models.questions.*
import models.sections.{ExamSection, ExamSectionQuestion}
import models.user.{Language, User}
import org.apache.poi.ss.usermodel.*
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import play.i18n.MessagesApi
import services.excel.ExcelBuilder

import java.io.{ByteArrayInputStream, ByteArrayOutputStream, OutputStream}
import java.time.Instant
import scala.jdk.CollectionConverters.*

/** Builds the reports from models kept in memory and reads the workbooks back */
class ExcelBuilderSpec extends BaseIntegrationSpec:

  private def builder = app.injector.instanceOf[ExcelBuilder]

  private def workbook(stream: OutputStream => Unit): XSSFWorkbook =
    val os = new ByteArrayOutputStream()
    stream(os)
    new XSSFWorkbook(new ByteArrayInputStream(os.toByteArray))

  private val formatter = new DataFormatter()
  private def texts(row: Row): List[String] =
    (0 until row.getLastCellNum).map(i => formatter.formatCellValue(row.getCell(i))).toList
  private def rows(sheet: Sheet): List[List[String]] =
    (0 to sheet.getLastRowNum).map(i => texts(sheet.getRow(i))).toList

  /** The row as header -> cell */
  private def byHeader(sheet: Sheet, rowIndex: Int): Map[String, Cell] =
    val header = texts(sheet.getRow(0))
    header.zipWithIndex.map((h, i) => h -> sheet.getRow(rowIndex).getCell(i)).toMap

  private def user(id: Long, first: String, last: String): User =
    val u = new User
    u.id = id
    u.firstName = first
    u.lastName = last
    u.email = s"${first.toLowerCase}@example.org"
    u.eppn = s"${first.toLowerCase}@example.org"
    u.userIdentifier = s"id$id"
    u

  private val teacher = user(1, "Tea", "Cher")
  private val student = user(2, "Stu", "Dent")
  private val t0      = Instant.parse("2030-06-12T08:00:00Z")

  private def course: Course =
    val c = new Course
    c.code = "MA1"
    c.name = "Maths"
    c.credits = 5.0
    val scale = new GradeScale
    scale.description = "ZERO_TO_FIVE"
    c.gradeScale = scale
    c

  private def examType(name: String): ExamType =
    val t = new ExamType
    t.`type` = name
    t

  private def exam(id: Long, name: String, state: ExamState = ExamState.PUBLISHED): Exam =
    val e = new Exam
    e.id = id
    e.name = name
    e.state = state
    e.creator = teacher
    e.created = t0
    e.periodStart = t0
    e.periodEnd = t0.plusSeconds(86400 * 30)
    e.duration = 90
    e.course = course
    e.examType = examType("FINAL")
    e.examSections = new java.util.HashSet()
    e.children = new java.util.ArrayList()
    e.examEnrolments = new java.util.ArrayList()
    e

  private def question(id: Long, `type`: QuestionType, parent: Question = null): Question =
    val q = new Question
    q.id = id
    q.`type` = `type`
    q.parent = parent
    q

  /** An essay with the given evaluation: points, or 1 / 0 for approved / rejected */
  private def essay(
      id: Long,
      q: Question,
      evaluation: QuestionEvaluationType,
      score: Double,
      seq: Int
  ) =
    val esq = new ExamSectionQuestion
    esq.id = id
    esq.question = q
    esq.evaluationType = evaluation
    esq.maxScore = 10.0
    esq.sequenceNumber = seq
    val answer = new EssayAnswer
    answer.evaluatedScore = score
    esq.essayAnswer = answer
    esq

  private def section(id: Long, name: String, seq: Int, questions: ExamSectionQuestion*) =
    val s = new ExamSection
    s.id = id
    s.name = name
    s.sequenceNumber = seq
    s.sectionQuestions = new java.util.HashSet(questions.asJava)
    questions.foreach(_.examSection = s)
    s

  private def room: ExamRoom =
    val r = new ExamRoom
    r.id = 7
    r.name = "Aquarium"
    r.roomCode = "A1"
    r

  private def machine: ExamMachine =
    val m = new ExamMachine
    m.id = 70
    m.name = "PC-1"
    m.ipAddress = "10.0.0.1"
    m.room = room
    m

  private def reservation(id: Long): Reservation =
    val r = new Reservation
    r.id = id
    r.startAt = t0
    r.endAt = t0.plusSeconds(3600)
    r

  private def participation(e: Exam, res: Reservation): ExamParticipation =
    val p = new ExamParticipation
    p.user = student
    p.exam = e
    p.reservation = res
    p.started = t0
    p.ended = t0.plusSeconds(3600)
    p.duration = Instant.ofEpochSecond(3600)
    p

  "ExcelBuilder" when:
    "exporting an exam" should:
      "accept a name that is not a valid sheet name, and keep the columns in order" in:
        val e = exam(1, "Tentti 1/2026: [syksy] with a name far longer than 31 characters")

        val wb    = workbook(builder.streamExam(e))
        val sheet = wb.getSheetAt(0)

        sheet.getSheetName.length must be <= 31
        texts(sheet.getRow(0)).take(5) must be(
          List("Creator ID", "First name", "Last name", "Exam type", "Course code")
        )
        texts(sheet.getRow(1)).take(5) must be(List("1", "Tea", "Cher", "FINAL", "MA1"))

    "exporting participations" should:
      "list local, external and examination event participations" in:
        val graded = exam(1, "Final", ExamState.GRADED)
        graded.gradedByUser = teacher

        val local = reservation(10)
        local.machine = machine
        val external = reservation(11)
        val er       = new ExternalReservation
        er.roomName = "Elsewhere"
        er.roomCode = "E1"
        er.machineName = "EXT-1"
        external.externalReservation = er

        val wb = workbook(
          builder.streamAllExams(
            List(
              participation(graded, local),
              participation(graded, external),
              participation(graded, null) // BYOD or home exam
            )
          )
        )
        val sheet = wb.getSheetAt(0)
        sheet.getLastRowNum must be(3)
        val room = (1 to 3).map(i => byHeader(sheet, i)).map { r =>
          List("reservation id", "room name", "machine name", "machine IP")
            .map(h => formatter.formatCellValue(r(h)))
        }
        room must be(
          Seq(
            List("10", "Aquarium", "PC-1", "10.0.0.1"),
            List("11", "Elsewhere", "EXT-1", "external"),
            List("", "", "", "")
          )
        )
        formatter.formatCellValue(byHeader(sheet, 1)("exam grade scale")) must be("ZERO_TO_FIVE")

      "list a student's activity without a language set" in:
        val wb = workbook(builder.streamStudentActivity(
          student,
          List(participation(exam(1, "Final"), null))
        ))

        texts(wb.getSheet("student").getRow(1)) must be(List(
          "2",
          "Stu",
          "Dent",
          "stu@example.org",
          ""
        ))
        texts(wb.getSheet("participations").getRow(0)).head must be("graded by teacher id")

    "exporting question scores" should:
      "give each question its column and mark graded, ungraded and removed answers" in:
        val q1     = question(100, QuestionType.EssayQuestion)
        val q2     = question(101, QuestionType.EssayQuestion)
        val parent = exam(1, "Final")
        parent.examSections.add(
          section(
            1,
            "Basics",
            0,
            essay(1, q1, QuestionEvaluationType.Points, 0, 0),
            essay(2, q2, QuestionEvaluationType.Selection, 0, 1)
          )
        )
        def copy(id: Long, state: ExamState, removedToo: Boolean): Exam =
          val child = exam(id, "Final", state)
          val questions = List(
            essay(
              id * 10 + 1,
              question(id * 10 + 1, QuestionType.EssayQuestion, q1),
              QuestionEvaluationType.Points,
              3.5,
              0
            ),
            essay(
              id * 10 + 2,
              question(id * 10 + 2, QuestionType.EssayQuestion, q2),
              QuestionEvaluationType.Selection,
              1,
              1
            )
          ) ++ Option.when(removedToo)(
            // Its question is no longer in the exam
            essay(
              id * 10 + 3,
              question(
                id * 10 + 3,
                QuestionType.EssayQuestion,
                question(999, QuestionType.EssayQuestion)
              ),
              QuestionEvaluationType.Points,
              1,
              2
            )
          )
          child.examSections.add(section(id, "Basics", 0, questions*))
          val p = participation(child, null)
          child.examParticipation = p
          child

        val wb = workbook(
          builder.streamScores(
            parent,
            List(
              copy(2, ExamState.GRADED, removedToo = true),
              copy(3, ExamState.REVIEW, removedToo = false)
            )
          )
        )
        val sheet  = wb.getSheetAt(0)
        val header = texts(sheet.getRow(0))
        header must contain allOf ("questionId_100", "questionId_101", "removed", "Kokonaispisteet")

        val graded = byHeader(sheet, 1)
        graded("questionId_100").getNumericCellValue must be(3.5)
        graded("questionId_101").getStringCellValue must be("APPROVED")
        graded("removed").getNumericCellValue must be(1.0)
        graded("Kokonaispisteet").getNumericCellValue must be(4.5)
        graded("examState").getStringCellValue must be("GRADED")

        val inReview = byHeader(sheet, 2)
        inReview("questionId_100").getStringCellValue must be("-")
        inReview("Kokonaispisteet").getStringCellValue must be("-")

    "exporting a student's own scores" should:
      "list the questions section by section in order, with section and total scores" in:
        val e = exam(1, "Final", ExamState.GRADED)
        e.examSections.add(
          section(
            2,
            "Second",
            1,
            essay(
              3,
              question(30, QuestionType.EssayQuestion),
              QuestionEvaluationType.Selection,
              0,
              0
            )
          )
        )
        e.examSections.add(
          section(
            1,
            "First",
            0,
            essay(2, question(20, QuestionType.EssayQuestion), QuestionEvaluationType.Points, 2, 1),
            essay(1, question(10, QuestionType.EssayQuestion), QuestionEvaluationType.Points, 4, 0)
          )
        )
        val english = new Language
        english.code = "en"
        val reader = user(2, "Stu", "Dent")
        reader.language = english

        val wb = workbook(
          builder.streamStudentReport(e, reader, app.injector.instanceOf[MessagesApi])
        )
        val sheet = wb.getSheetAt(0)
        sheet.getSheetName must be("Points")
        rows(sheet) must be(
          List(
            List(
              "First name",
              "Last name",
              "Email",
              "Student number",
              "Question 1: Essay",
              "Question 2: Essay",
              "Points for the section First",
              "Question 1: Essay",
              "Points for the section Second",
              "Total score"
            ),
            List("Stu", "Dent", "stu@example.org", "id2", "4", "2", "6", "REJECTED", "0", "6")
          )
        )

    "exporting exam records" should:
      "write credits and scores as numbers" in:
        val e     = exam(1, "Final", ExamState.GRADED_LOGGED)
        val score = new ExamScore
        score.id = 5
        score.student = "stu@example.org"
        score.credits = "5.0"
        score.examScore = "12.5"
        score.studentGrade = "4"
        val record = new ExamRecord
        record.exam = e
        record.student = student
        record.teacher = teacher
        record.examScore = score

        val sheet = workbook(builder.streamExamRecords(List(record))).getSheetAt(0)
        val row   = byHeader(sheet, 1)

        texts(sheet.getRow(0)) must be(ExamScore.getHeaders.toList)
        row("credits").getCellType must be(CellType.NUMERIC)
        row("credits").getNumericCellValue must be(5.0)
        row("examScore").getNumericCellValue must be(12.5)
        row("studentGrade").getStringCellValue must be("4")
        row("courseUnitName").getStringCellValue must be("Maths")

    "exporting a teacher's exams" should:
      "count the copies in review, graded and logged" in:
        val parent = exam(1, "Final")
        List(
          ExamState.REVIEW,
          ExamState.REVIEW_STARTED,
          ExamState.GRADED,
          ExamState.GRADED_LOGGED,
          ExamState.ABORTED
        )
          .zipWithIndex
          .foreach((s, i) => parent.children.add(exam(10 + i, "Final", s)))

        val sheet = workbook(builder.streamTeacherExams(List(parent))).getSheetAt(0)
        val row   = byHeader(sheet, 1)

        List("in review", "graded", "logged").map(h => row(h).getStringCellValue) must be(List(
          "2",
          "1",
          "1"
        ))
        row("active during").getStringCellValue must be("2030-06-12 - 2030-07-12")

    "exporting enrolments" should:
      "give the reservation time only when there is one" in:
        val proto = exam(1, "Final")
        def enrolment(res: Reservation) =
          val ee = new ExamEnrolment
          ee.user = student
          ee.enrolledOn = t0.minusSeconds(86400)
          ee.reservation = res
          ee
        proto.examEnrolments.add(enrolment(reservation(10)))
        proto.examEnrolments.add(enrolment(null))

        val sheet = workbook(builder.streamEnrolments(proto)).getSheetAt(0)

        rows(sheet).tail.map(_.drop(3)) must be(
          List(
            List("2030-06-12T08:00:00Z", "2030-06-11T08:00:00Z"),
            List("", "2030-06-11T08:00:00Z")
          )
        )

    "exporting reviews" should:
      "fill in what is missing with N/A" in:
        val e = exam(1, "Final", ExamState.GRADED)
        e.gradedTime = t0
        val grade = new Grade
        grade.name = "4"
        e.grade = grade
        e.answerLanguage = "fi"

        val row = byHeader(workbook(builder.streamReviews(List(e))).getSheetAt(0), 1)

        row("graded by").getStringCellValue must be("N/A")
        row("grade").getStringCellValue must be("4")
        row("exam type").getStringCellValue must be("N/A")

    "exporting reservations" should:
      "give the machine and room of each" in:
        val res = reservation(10)
        res.machine = machine
        val ee = new ExamEnrolment
        ee.id = 3
        ee.user = student
        ee.exam = exam(1, "Final")
        ee.enrolledOn = t0
        ee.reservation = res

        val row = byHeader(workbook(builder.streamReservations(List(ee))).getSheetAt(0), 1)

        List("machine name", "room name", "room code", "reservation begins")
          .map(h => row(h).getStringCellValue) must be(
          List("PC-1", "Aquarium", "A1", "2030-06-12T08:00:00Z")
        )

    "exporting a generic report" should:
      "write the given headers and rows" in:
        val sheet = workbook(
          builder.streamGenericReport(List("a", "b"), List(List("1", "2"), List("3", "4")))
        ).getSheetAt(0)

        rows(sheet) must be(List(List("a", "b"), List("1", "2"), List("3", "4")))
