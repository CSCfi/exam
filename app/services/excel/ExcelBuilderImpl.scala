// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.excel

import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment
import models.assessment.{ExamRecord, ExamScore}
import models.exam.Exam
import models.exam.ExamState
import models.questions.QuestionEvaluationType
import models.questions.QuestionType
import models.sections.{ExamSection, ExamSectionQuestion}
import models.user.User
import org.apache.poi.common.usermodel.HyperlinkType
import org.apache.poi.ss.usermodel.*
import org.apache.poi.xssf.streaming.SXSSFWorkbook
import play.i18n.{Lang, MessagesApi}
import services.config.ConfigReader

import java.io.OutputStream
import javax.inject.Inject
import scala.jdk.CollectionConverters.*

import ExcelBuilder.CellType

class ExcelBuilderImpl @Inject() (configReader: ConfigReader) extends ExcelBuilder
    with EbeanQueryExtensions:

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

  override def streamExamRecords(examId: Long, childIds: List[Long])(os: OutputStream): Unit =
    val examRecords = fetchExamRecords(examId, childIds)
    streamTo(os)(wb => buildExamRecordsSheet(wb, examRecords))

  private def fetchExamRecords(examId: Long, childIds: List[Long]): List[ExamRecord] =
    DB
      .find(classOf[ExamRecord])
      .fetch("examScore")
      .where()
      .eq("exam.parent.id", examId)
      .in("exam.id", childIds)
      .list

  private def buildExamRecordsSheet(wb: Workbook, examRecords: List[ExamRecord]): Unit =
    val sheet     = wb.createSheet("Exam records")
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

    val sheet          = wb.createSheet(messages.get(lang, "reports.scores"))
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

  override def streamScores(examId: Long, childIds: List[Long])(os: OutputStream): Unit =
    streamTo(os)(wb => buildScoreSheetContent(wb, examId, childIds))

  private def buildScoreSheetContent(wb: Workbook, examId: Long, childIds: List[Long]): Unit =
    val sheet    = wb.createSheet("Question scores")
    val hostname = configReader.getHostName

    val linkStyle = wb.createCellStyle()
    val linkFont  = wb.createFont()
    linkFont.setColor(IndexedColors.BLUE.getIndex)
    linkFont.setUnderline(Font.U_SINGLE)
    linkStyle.setFont(linkFont)

    val parentExam = Option(
      DB.find(classOf[Exam])
        .fetch("examSections.sectionQuestions.question")
        .where()
        .eq("id", examId)
        .findOneOrEmpty()
        .orElse(null)
    ).getOrElse(throw new RuntimeException("parent exam not found"))

    val childExams = DB
      .find(classOf[Exam])
      .fetch("examParticipation.user")
      .fetch("examSections.sectionQuestions.question")
      .fetch("examRecord.examScore")
      .where()
      .eq("parent.id", examId)
      .in("id", childIds)
      .findList()
      .asScala
      .toList

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
    val wb = new SXSSFWorkbook(rowWindowSize)
    try
      build(wb)
      wb.write(os)
    finally wb.close()

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

  private def autosizeColumns(header: Row, sheet: Sheet): Unit =
    (0 until header.getLastCellNum).foreach(i => sheet.autoSizeColumn(i, true))
