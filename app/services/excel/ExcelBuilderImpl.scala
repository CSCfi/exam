// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.excel

import models.assessment
import models.assessment.{ExamRecord, ExamScore}
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.Exam
import models.exam.ExamState
import models.questions.QuestionEvaluationType
import models.questions.QuestionType
import models.sections.{ExamSection, ExamSectionQuestion}
import models.user.User
import org.apache.poi.common.usermodel.HyperlinkType
import org.apache.poi.ss.usermodel.*
import org.apache.poi.xssf.streaming.{SXSSFSheet, SXSSFWorkbook}
import play.api.Logging
import play.i18n.{Lang, MessagesApi}
import services.config.ConfigReader

import java.io.OutputStream
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.concurrent.Semaphore
import javax.inject.Inject
import scala.jdk.CollectionConverters.*
import scala.util.Try

import ExcelBuilder.CellType

class ExcelBuilderImpl @Inject() (configReader: ConfigReader) extends ExcelBuilder with Logging:

  // Limit the number of concurrent workbook builds to prevent memory exhaustion
  private val buildSemaphore = new Semaphore(3)

  private val ScoreReportDefaultHeaders = Array(
    "studentInternalId",
    "student",
    "studentFirstName",
    "studentLastName",
    "studentEmail",
    "studentId",
    "examState",
    "submissionId"
  )

  override def streamExamRecords(examRecords: List[ExamRecord])(os: OutputStream): Unit =
    streamTo(os)(wb => buildExamRecordsSheet(wb, examRecords))

  private def buildExamRecordsSheet(wb: Workbook, examRecords: List[ExamRecord]): Unit =
    val sheet = wb.createSheet("Exam records").asInstanceOf[SXSSFSheet]
    sheet.trackAllColumnsForAutoSizing()
    val headers   = ExamScore.getHeaders
    val headerRow = sheet.createRow(0)
    headers.indices.foreach(i => headerRow.createCell(i).setCellValue(headers(i)))
    examRecords.zipWithIndex.foreach { case (record, index) =>
      val data    = record.examScore.asCells(record.student, record.teacher, record.exam)
      val dataRow = sheet.createRow(index + 1)
      data.zipWithIndex.foreach { case ((value, scoreType), cellIndex) =>
        val cell = dataRow.createCell(cellIndex)
        val cellType = scoreType match
          case assessment.ExamScore.CellType.DECIMAL => CellType.DECIMAL
          case assessment.ExamScore.CellType.STRING  => CellType.STRING
        setValue(cell, value, cellType)
      }
    }
    headers.indices.foreach(i => sheet.autoSizeColumn(i, true))

  override def streamStudentReport(
      exam: Exam,
      student: User,
      messages: MessagesApi
  )(os: OutputStream): Unit =
    streamTo(os)(wb => buildStudentReportSheet(wb, exam, student, messages))

  private def buildStudentReportSheet(
      wb: Workbook,
      exam: Exam,
      student: User,
      messages: MessagesApi
  ): Unit =
    val lang = Option(student.language)
      .flatMap(l => Option(l.code))
      .map(Lang.forCode)
      .getOrElse(Lang.forCode("en"))

    val sheet = wb.createSheet(messages.get(lang, "reports.scores")).asInstanceOf[SXSSFSheet]
    sheet.trackAllColumnsForAutoSizing()
    val defaultHeaders = getStudentReportHeaderMap(student)
    val headerRow      = sheet.createRow(0)
    val valueRow       = sheet.createRow(sheet.getLastRowNum + 1)

    defaultHeaders.foreach { case (header, value) =>
      appendCell(headerRow, messages.get(lang, header))
      appendCell(valueRow, value)
    }

    exam.examSections.asScala.toList.sorted.foreach { es =>
      es.sectionQuestions.asScala.toList.sorted.zipWithIndex.foreach {
        case (esq, questionIndex) =>
          val questionNumber = questionIndex + 1
          val questionType = esq.question.`type` match
            case QuestionType.EssayQuestion => messages.get(lang, "reports.question.type.essay")
            case QuestionType.ClozeTestQuestion =>
              messages.get(lang, "reports.question.type.cloze")
            case QuestionType.MultipleChoiceQuestion =>
              messages.get(lang, "reports.question.type.multiplechoice")
            case QuestionType.WeightedMultipleChoiceQuestion =>
              messages.get(lang, "reports.question.type.weightedmultiplechoide")
            case QuestionType.ClaimChoiceQuestion =>
              messages.get(lang, "reports.question.type.claim")

          appendCell(
            headerRow,
            s"${messages.get(lang, "reports.question")} $questionNumber: $questionType"
          )

          val (scoreValue, scoreType) = getScoreTuple(esq)
          val valueCell               = valueRow.createCell(valueRow.getLastCellNum)
          setValue(valueCell, scoreValue, scoreType)
      }

      appendCell(headerRow, messages.get(lang, "reports.scores.sectionScore", es.name))
      appendCell(valueRow, es.getTotalScore)
    }

    appendCell(headerRow, messages.get(lang, "reports.scores.totalScore"))
    appendCell(valueRow, exam.getTotalScore)

    autosizeColumns(headerRow, sheet)

  override def streamScores(parentExam: Exam, childExams: List[Exam])(os: OutputStream): Unit =
    streamTo(os)(wb => buildScoreSheetContent(wb, parentExam, childExams))

  private def buildScoreSheetContent(wb: Workbook, parentExam: Exam, childExams: List[Exam]): Unit =
    val sheet = wb.createSheet("Question scores").asInstanceOf[SXSSFSheet]
    sheet.trackAllColumnsForAutoSizing()
    val hostname = configReader.getHostName

    val linkStyle = wb.createCellStyle()
    val linkFont  = wb.createFont()
    linkFont.setColor(IndexedColors.BLUE.getIndex)
    linkFont.setUnderline(Font.U_SINGLE)
    linkStyle.setFont(linkFont)

    val deletedQuestionIds = getDeletedQuestionIds(parentExam, childExams)

    val questionIdsBySectionName = collection.mutable.LinkedHashMap[String, Set[Long]]()
    parentExam.examSections.asScala.foreach { es =>
      questionIdsBySectionName(es.name) = extractQuestionIdsFromSection(es)
    }
    childExams.flatMap(_.examSections.asScala).foreach { es =>
      val sectionName      = es.name
      val childQuestionIds = extractQuestionIdsFromSection(es)
      questionIdsBySectionName.updateWith(sectionName) {
        case Some(existing) => Some(existing ++ childQuestionIds)
        case None           => Some(childQuestionIds)
      }
    }

    val headerRow = sheet.createRow(0)
    ScoreReportDefaultHeaders.indices.foreach(i =>
      headerRow.createCell(i).setCellValue(ScoreReportDefaultHeaders(i))
    )

    val questionColumnIndexesBySectionName = collection.mutable.Map[String, Map[Long, Int]]()
    val sectionTotalIndexesBySectionName   = collection.mutable.Map[String, Int]()

    questionIdsBySectionName.foreach { case (sectionName, questionIds) =>
      val columnIndexesByQuestionIds = collection.mutable.Map[Long, Int]()
      questionIds.foreach { questionId =>
        if deletedQuestionIds.contains(questionId) then
          val columnIndex = appendCell(headerRow, "removed")
          columnIndexesByQuestionIds(questionId) = columnIndex
        else
          val link        = wb.getCreationHelper.createHyperlink(HyperlinkType.URL)
          val columnIndex = headerRow.getLastCellNum
          link.setAddress(s"$hostname/questions/$questionId")
          val cell = headerRow.createCell(columnIndex)
          cell.setCellStyle(linkStyle)
          cell.setHyperlink(link)
          cell.setCellValue(s"questionId_$questionId")
          columnIndexesByQuestionIds(questionId) = columnIndex
      }
      questionColumnIndexesBySectionName(sectionName) = columnIndexesByQuestionIds.toMap
      val sectionTotalIdx = appendCell(headerRow, s"Aihealueen $sectionName pisteet")
      sectionTotalIndexesBySectionName(sectionName) = sectionTotalIdx
    }

    val totalScoreIndex = appendCell(headerRow, "Kokonaispisteet")

    childExams.foreach { exam =>
      Option(exam.examParticipation).flatMap(p => Option(p.user)).foreach { student =>
        val examScore = Option(exam.examRecord).map(_.examScore)
        val isGraded = exam.state match
          case ExamState.GRADED | ExamState.GRADED_LOGGED | ExamState.ARCHIVED => true
          case _                                                               => false

        val defaultCells = getScoreReportDefaultCells(student, exam, examScore)
        val currentRow   = sheet.createRow(sheet.getLastRowNum + 1)
        appendCellsToRow(currentRow, defaultCells)

        exam.examSections.asScala.foreach { es =>
          val sectionName = es.name
          es.sectionQuestions.asScala.foreach { esq =>
            val questionId          = getQuestionId(esq)
            val questionColumnIndex = questionColumnIndexesBySectionName(sectionName)(questionId)
            if isGraded then
              val (scoreValue, scoreType) = getScoreTuple(esq)
              val currentCell             = currentRow.createCell(questionColumnIndex)
              setValue(currentCell, scoreValue, scoreType)
            else currentRow.createCell(questionColumnIndex).setCellValue("-")
          }
          val sectionIndex = sectionTotalIndexesBySectionName(sectionName)
          if isGraded then currentRow.createCell(sectionIndex).setCellValue(es.getTotalScore)
          else currentRow.createCell(sectionIndex).setCellValue("-")
        }

        if isGraded then currentRow.createCell(totalScoreIndex).setCellValue(exam.getTotalScore)
        else currentRow.createCell(totalScoreIndex).setCellValue("-")
      }
    }

    autosizeColumns(headerRow, sheet)

  override def streamTo(os: OutputStream, rowWindowSize: Int = 100)(build: Workbook => Unit): Unit =
    // Use semaphore to limit the number of concurrent workbook builds
    buildSemaphore.acquire()
    val wb = new SXSSFWorkbook(rowWindowSize)
    try
      build(wb)
      wb.write(os)
    finally
      wb.close()
      buildSemaphore.release()

  // Private helper methods

  private def getStudentReportHeaderMap(student: User): Map[String, String] =
    Map(
      "reports.studentFirstName" -> student.firstName,
      "reports.studentLastName"  -> student.lastName,
      "reports.studentEmail"     -> student.email,
      "reports.studentId"        -> student.userIdentifier
    )

  private def getScoreReportDefaultCells(
      student: User,
      exam: Exam,
      examScore: Option[ExamScore]
  ): List[(String, CellType)] =
    List(
      (student.id.toString, CellType.STRING),
      (student.eppn, CellType.STRING),
      (student.firstName, CellType.STRING),
      (student.lastName, CellType.STRING),
      (student.email, CellType.STRING),
      (student.identifier, CellType.STRING),
      (exam.state.name(), CellType.STRING),
      (examScore.map(_.id.toString).getOrElse(""), CellType.STRING)
    )

  private def setValue(cell: Cell, value: String, cellType: CellType): Unit =
    cellType match
      case CellType.DECIMAL => cell.setCellValue(value.toDouble)
      case CellType.STRING  => cell.setCellValue(value)

  private def appendCell(row: Row, value: String): Int =
    val cellIndex = if row.getLastCellNum < 0 then 0 else row.getLastCellNum.toInt
    val cell      = row.createCell(cellIndex)
    cell.setCellValue(value)
    cellIndex

  private def appendCell(row: Row, value: Double): Unit =
    val cellIndex = if row.getLastCellNum < 0 then 0 else row.getLastCellNum.toInt
    val cell      = row.createCell(cellIndex)
    cell.setCellValue(value)

  private def getScoreTuple(esq: ExamSectionQuestion): (String, CellType) =
    if esq.evaluationType == QuestionEvaluationType.Selection then
      if esq.isApproved && !esq.isRejected then ("APPROVED", CellType.STRING)
      else ("REJECTED", CellType.STRING)
    else (esq.getAssessedScore.toString, CellType.DECIMAL)

  private def appendCellsToRow(row: Row, cells: List[(String, CellType)]): Unit =
    val startIndex = if row.getLastCellNum > 0 then row.getLastCellNum.toInt else 0
    cells.zipWithIndex.foreach { case ((value, cellType), offset) =>
      val cell = row.createCell(startIndex + offset)
      setValue(cell, value, cellType)
    }

  private def extractQuestionIdsFromSection(es: ExamSection): Set[Long] =
    es.sectionQuestions.asScala.map(getQuestionId).toSet

  private def getDeletedQuestionIds(parent: Exam, childExams: List[Exam]): Set[Long] =
    val parentQuestionIds = parent.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .filter(esq => Option(esq.question).flatMap(q => Option(q.id)).isDefined)
      .map(_.question.id.longValue())
      .toSet

    childExams
      .flatMap(_.examSections.asScala)
      .flatMap(_.sectionQuestions.asScala)
      .filter(esq => isQuestionRemoved(esq, parentQuestionIds))
      .map(getQuestionId)
      .toSet

  private def getQuestionId(question: ExamSectionQuestion): Long =
    Option(question.question)
      .flatMap(q => Option(q.parent).map(_.id.longValue()).orElse(Some(q.id.longValue())))
      .getOrElse(question.id.longValue())

  private def isQuestionRemoved(question: ExamSectionQuestion, parentIds: Set[Long]): Boolean =
    Option(question.question)
      .flatMap(q => Option(q.parent).map(p => !parentIds.contains(p.id.longValue())))
      .getOrElse(true)

  private def autosizeColumns(header: Row, sheet: SXSSFSheet): Unit =
    (0 until header.getLastCellNum).foreach(i => sheet.autoSizeColumn(i, true))

  // --- Statistics / admin report implementations ---

  override def streamExam(exam: Exam)(os: OutputStream): Unit =
    streamTo(os)(wb => buildExamSheet(wb, exam))

  override def streamTeacherExams(exams: List[Exam])(os: OutputStream): Unit =
    streamTo(os)(wb => buildTeacherExamsSheet(wb, exams))

  override def streamEnrolments(proto: Exam)(os: OutputStream): Unit =
    streamTo(os)(wb => buildEnrolmentsSheet(wb, proto))

  override def streamReviews(exams: List[Exam])(os: OutputStream): Unit =
    streamTo(os)(wb => buildReviewsSheet(wb, exams))

  override def streamReservations(enrolments: List[ExamEnrolment])(os: OutputStream): Unit =
    streamTo(os)(wb => buildReservationsSheet(wb, enrolments))

  override def streamAllExams(participations: List[ExamParticipation])(os: OutputStream): Unit =
    streamTo(os)(wb => buildParticipationsSheet(wb, participations, includeStudentInfo = true))

  override def streamStudentActivity(student: User, participations: List[ExamParticipation])(
      os: OutputStream
  ): Unit =
    streamTo(os)(wb => buildStudentActivitySheets(wb, student, participations))

  private def buildExamSheet(wb: Workbook, exam: Exam): Unit =
    val values = Map(
      "Creator ID"       -> exam.creator.id.toString,
      "First name"       -> exam.creator.firstName,
      "Last name"        -> exam.creator.lastName,
      "Exam type"        -> exam.examType.`type`,
      "Course code"      -> exam.course.code,
      "Course name"      -> exam.course.name,
      "Course credits"   -> exam.course.credits.toString,
      "Course unit type" -> forceNotNull(exam.course.courseUnitType),
      "Course level"     -> forceNotNull(exam.course.level),
      "Created" -> DateTimeFormatter.ISO_LOCAL_DATE.format((exam.created).atZone(ZoneOffset.UTC)),
      "Begins"  -> DateTimeFormatter.ISO_LOCAL_DATE.format(exam.periodStart.atZone(ZoneOffset.UTC)),
      "Ends"    -> DateTimeFormatter.ISO_LOCAL_DATE.format(exam.periodEnd.atZone(ZoneOffset.UTC)),
      "Duration"    -> Option(exam.duration).map(_.toString).getOrElse("N/A"),
      "Grade scale" -> Option(exam.gradeScale).map(_.description).getOrElse("N/A"),
      "State"       -> exam.state.toString,
      "Attachment" -> Option(exam.attachment).map(a => s"${a.filePath}${a.fileName}").getOrElse(""),
      "Instructions" -> forceNotNull(exam.instruction),
      "Shared"       -> exam.shared.toString
    )
    val sheet     = wb.createSheet(exam.name)
    val headerRow = sheet.createRow(0)
    values.keys.zipWithIndex.foreach { case (key, i) => headerRow.createCell(i).setCellValue(key) }
    val dataRow = sheet.createRow(1)
    values.values.zipWithIndex.foreach { case (value, i) =>
      dataRow.createCell(i).setCellValue(value)
    }

  private def buildTeacherExamsSheet(wb: Workbook, exams: List[Exam]): Unit =
    val sheet = wb.createSheet("teacher's exams").asInstanceOf[SXSSFSheet]
    sheet.trackAllColumnsForAutoSizing()
    addSheetHeader(
      sheet,
      Array(
        "exam",
        "created",
        "state",
        "course code",
        "active during",
        "credits",
        "exam type",
        "in review",
        "graded",
        "logged"
      )
    )
    exams.zipWithIndex.foreach { case (parent, idx) =>
      val (inReview, graded, logged) =
        parent.children.asScala.foldLeft((0, 0, 0)) { case ((ir, g, l), child) =>
          child.state match
            case ExamState.REVIEW | ExamState.REVIEW_STARTED => (ir + 1, g, l)
            case ExamState.GRADED                            => (ir, g + 1, l)
            case ExamState.GRADED_LOGGED                     => (ir, g, l + 1)
            case _                                           => (ir, g, l)
        }
      addSheetRow(
        sheet,
        Array(
          parent.name,
          DateTimeFormatter.ISO_LOCAL_DATE.format((parent.created).atZone(ZoneOffset.UTC)),
          parent.state.toString,
          parent.course.code,
          s"${DateTimeFormatter.ISO_LOCAL_DATE.format((parent.periodStart).atZone(ZoneOffset.UTC))} - " +
            DateTimeFormatter.ISO_LOCAL_DATE.format((parent.periodEnd).atZone(ZoneOffset.UTC)),
          Option(parent.course.credits).map(_.toString).getOrElse(""),
          parent.examType.`type`,
          inReview.toString,
          graded.toString,
          logged.toString
        ),
        idx + 1
      )
    }
    (0 to 9).foreach(i => sheet.autoSizeColumn(i, true))

  private def buildEnrolmentsSheet(wb: Workbook, proto: Exam): Unit =
    val sheet = wb.createSheet("enrolments").asInstanceOf[SXSSFSheet]
    sheet.trackAllColumnsForAutoSizing()
    addSheetHeader(
      sheet,
      Array("student name", "student ID", "student EPPN", "reservation time", "enrolment time")
    )
    proto.examEnrolments.asScala.zipWithIndex.foreach { case (e, idx) =>
      addSheetRow(
        sheet,
        Array(
          s"${e.user.firstName} ${e.user.lastName}",
          forceNotNull(e.user.identifier),
          e.user.eppn,
          Option(e.reservation)
            .map(r =>
              DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(
                r.startAt.atZone(ZoneOffset.UTC).truncatedTo(ChronoUnit.SECONDS)
              )
            )
            .getOrElse(""),
          DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(
            e.enrolledOn.atZone(ZoneOffset.UTC).truncatedTo(ChronoUnit.SECONDS)
          )
        ),
        idx + 1
      )
    }
    (0 to 4).foreach(i => sheet.autoSizeColumn(i, true))

  private def buildReviewsSheet(wb: Workbook, exams: List[Exam]): Unit =
    val sheet = wb.createSheet("graded exams").asInstanceOf[SXSSFSheet]
    sheet.trackAllColumnsForAutoSizing()
    addSheetHeader(
      sheet,
      Array(
        "student",
        "exam",
        "course",
        "taken on",
        "graded on",
        "graded by",
        "credits",
        "grade",
        "exam type",
        "answer language"
      )
    )
    exams.zipWithIndex.foreach { case (e, idx) =>
      addSheetRow(
        sheet,
        Array(
          s"${e.creator.firstName} ${e.creator.lastName}",
          e.name,
          e.course.code,
          DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(
            (e.created).atZone(ZoneOffset.UTC).truncatedTo(ChronoUnit.SECONDS)
          ),
          DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(
            e.gradedTime.atZone(ZoneOffset.UTC).truncatedTo(ChronoUnit.SECONDS)
          ),
          safeParse(() => s"${e.gradedByUser.firstName} ${e.gradedByUser.lastName}"),
          Option(e.course.credits).map(_.toString).getOrElse(""),
          safeParse(() => e.grade.name),
          safeParse(() => e.creditType.`type`),
          e.answerLanguage
        ),
        idx + 1
      )
    }
    (0 to 9).foreach(i => sheet.autoSizeColumn(i, true))

  private def buildReservationsSheet(wb: Workbook, enrolments: List[ExamEnrolment]): Unit =
    val headers = Array(
      "enrolment id",
      "enrolled on",
      "user id",
      "user first name",
      "user last name",
      "exam id",
      "exam name",
      "reservation id",
      "reservation begins",
      "reservation ends",
      "machine id",
      "machine name",
      "machine IP",
      "room id",
      "room name",
      "room code"
    )
    val sheet = wb.createSheet("reservations").asInstanceOf[SXSSFSheet]
    sheet.trackAllColumnsForAutoSizing()
    addSheetHeader(sheet, headers)
    enrolments.zipWithIndex.foreach { case (e, idx) =>
      addSheetRow(
        sheet,
        Array(
          e.id.toString,
          DateTimeFormatter.ISO_LOCAL_DATE.format(e.enrolledOn.atZone(ZoneOffset.UTC)),
          e.user.id.toString,
          e.user.firstName,
          e.user.lastName,
          e.exam.id.toString,
          e.exam.name,
          e.reservation.id.toString,
          DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(
            e.reservation.startAt.atZone(ZoneOffset.UTC)
          ),
          DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(e.reservation.endAt.atZone(ZoneOffset.UTC)),
          e.reservation.machine.id.toString,
          e.reservation.machine.name,
          e.reservation.machine.ipAddress,
          e.reservation.machine.room.id.toString,
          e.reservation.machine.room.name,
          e.reservation.machine.room.roomCode
        ),
        idx + 1
      )
    }
    headers.indices.foreach(i => sheet.autoSizeColumn(i, true))

  private def buildStudentActivitySheets(
      wb: Workbook,
      student: User,
      participations: List[ExamParticipation]
  ): Unit =
    val studentSheet = wb.createSheet("student")
    addSheetHeader(studentSheet, Array("id", "first name", "last name", "email", "language"))
    val dataRow = studentSheet.createRow(1)
    dataRow.createCell(0).setCellValue(student.id.toDouble)
    dataRow.createCell(1).setCellValue(student.firstName)
    dataRow.createCell(2).setCellValue(student.lastName)
    dataRow.createCell(3).setCellValue(student.email)
    dataRow.createCell(4).setCellValue(student.language.code)
    buildParticipationsSheet(wb, participations, includeStudentInfo = false)

  private def buildParticipationsSheet(
      wb: Workbook,
      participations: List[ExamParticipation],
      includeStudentInfo: Boolean
  ): Unit =
    val sheet = wb.createSheet("participations").asInstanceOf[SXSSFSheet]
    sheet.trackAllColumnsForAutoSizing()
    val headers =
      (if includeStudentInfo then
         List("student id", "student first name", "student last name", "student email")
       else List.empty) ++
        List(
          "graded by teacher id",
          "graded by teacher first name",
          "graded by teacher last name",
          "graded by teacher email",
          "reservation id",
          "exam started",
          "exam ended",
          "actual duration",
          "room id",
          "room name",
          "room code",
          "machine id",
          "machine name",
          "machine IP",
          "course name",
          "course code",
          "exam id",
          "exam name",
          "exam duration",
          "exam state",
          "exam score",
          "exam grade scale",
          "exam grade",
          "graded on",
          "credit type"
        )
    addSheetHeader(sheet, headers.toArray)
    participations.zipWithIndex.foreach { case (p, idx) =>
      val studentInfo =
        if includeStudentInfo then
          List(p.user.id.toString, p.user.firstName, p.user.lastName, p.user.email)
        else List.empty
      val data = studentInfo ++ List(
        Option(p.exam.gradedByUser).map(_.id.toString).getOrElse(""),
        Option(p.exam.gradedByUser).map(_.firstName).getOrElse(""),
        Option(p.exam.gradedByUser).map(_.lastName).getOrElse(""),
        Option(p.exam.gradedByUser).map(_.email).getOrElse(""),
        p.reservation.id.toString,
        DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(p.started.atZone(ZoneOffset.UTC)),
        DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(p.ended.atZone(ZoneOffset.UTC)),
        DateTimeFormatter.ISO_OFFSET_TIME.format(p.duration.atZone(ZoneOffset.UTC)),
        Option(p.reservation.machine).map(_.room.id.toString).getOrElse("external"),
        Option(p.reservation.machine).map(_.room.name)
          .getOrElse(p.reservation.externalReservation.roomName),
        Option(p.reservation.machine).map(_.room.roomCode)
          .getOrElse(p.reservation.externalReservation.roomCode),
        Option(p.reservation.machine).map(_.id.toString).getOrElse("external"),
        Option(p.reservation.machine).map(_.name)
          .getOrElse(p.reservation.externalReservation.machineName),
        Option(p.reservation.machine).map(_.ipAddress).getOrElse("external"),
        Option(p.exam.course).map(_.name).getOrElse(""),
        Option(p.exam.course).map(_.code).getOrElse(""),
        p.exam.id.toString,
        p.exam.name,
        p.exam.duration.toString,
        p.exam.state.toString,
        p.exam.getTotalScore.toString,
        Option(p.exam.gradeScale).map(_.description)
          .getOrElse(p.exam.course.gradeScale.description),
        Option(p.exam.grade).map(_.name).getOrElse(""),
        Option(p.exam.gradedTime)
          .map(t =>
            DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(t.atZone(ZoneOffset.UTC))
          ).getOrElse(""),
        Option(p.exam.creditType).map(_.`type`).getOrElse("")
      )
      addSheetRow(sheet, data.toArray, idx + 1)
    }
    headers.indices.foreach(i => sheet.autoSizeColumn(i, true))

  private def addSheetHeader(sheet: Sheet, headers: Array[String]): Unit =
    val headerRow = sheet.createRow(0)
    headers.zipWithIndex.foreach { case (header, i) =>
      headerRow.createCell(i).setCellValue(header)
    }

  private def addSheetRow(sheet: Sheet, data: Array[String], rowIndex: Int): Unit =
    val dataRow = sheet.createRow(rowIndex)
    data.zipWithIndex.foreach { case (value, i) => dataRow.createCell(i).setCellValue(value) }

  private def safeParse(supplier: () => String): String =
    Try(supplier()).getOrElse {
      logger.warn("Invalid review data, omitting field from report")
      "N/A"
    }

  private def forceNotNull(src: String): String = Option(src).getOrElse("")
