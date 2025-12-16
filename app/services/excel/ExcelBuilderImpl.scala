// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.excel

import io.ebean.DB
import ExcelBuilder.CellType
import models.assessment
import models.assessment.{ExamRecord, ExamScore}
import models.exam.Exam
import models.questions.Question
import models.sections.{ExamSection, ExamSectionQuestion}
import models.user.User
import org.apache.poi.common.usermodel.HyperlinkType
import org.apache.poi.ss.usermodel._
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import play.i18n.{Lang, MessagesApi}
import services.config.ConfigReader

import java.io.ByteArrayOutputStream
import javax.inject.Inject
import scala.jdk.CollectionConverters._
import scala.util.Using

class ExcelBuilderImpl @Inject() (configReader: ConfigReader) extends ExcelBuilder:

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

  override def build(examId: Long, childIds: List[Long]): ByteArrayOutputStream =
    val examRecords = DB
      .find(classOf[ExamRecord])
      .fetch("examScore")
      .where()
      .eq("exam.parent.id", examId)
      .in("exam.id", childIds)
      .findList()
      .asScala
      .toList

    Using.resource(new XSSFWorkbook()) { wb =>
      val sheet     = wb.createSheet("Exam records")
      val headers   = ExamScore.getHeaders
      val headerRow = sheet.createRow(0)

      headers.indices.foreach(i => headerRow.createCell(i).setCellValue(headers(i)))

      examRecords.zipWithIndex.foreach { case (record, index) =>
        val data    = record.getExamScore.asCells(record.getStudent, record.getTeacher, record.getExam)
        val dataRow = sheet.createRow(index + 1)

        data.asScala.zipWithIndex.foreach { case (entry, cellIndex) =>
          val cell = dataRow.createCell(cellIndex)
          val cellType = entry._2 match
            case assessment.ExamScore.CellType.DECIMAL => CellType.DECIMAL
            case assessment.ExamScore.CellType.STRING  => CellType.STRING
          setValue(cell, entry._1, cellType)
        }
      }

      // Auto-size columns
      headers.indices.foreach(i => sheet.autoSizeColumn(i, true))

      val bos = new ByteArrayOutputStream()
      wb.write(bos)
      bos
    }

  override def buildStudentReport(exam: Exam, student: User, messages: MessagesApi): ByteArrayOutputStream =
    val lang = Option(student.getLanguage)
      .flatMap(l => Option(l.getCode))
      .map(Lang.forCode)
      .getOrElse(Lang.forCode("en"))

    Using.resource(new XSSFWorkbook()) { wb =>
      val sheet          = wb.createSheet(messages.get(lang, "reports.scores"))
      val defaultHeaders = getStudentReportHeaderMap(student)
      val headerRow      = sheet.createRow(0)
      val valueRow       = sheet.createRow(sheet.getLastRowNum + 1)

      // Add default headers and values
      defaultHeaders.foreach { case (header, value) =>
        appendCell(headerRow, messages.get(lang, header))
        appendCell(valueRow, value)
      }

      // Add question scores
      exam.getExamSections.asScala.toList.sorted.foreach { es =>
        es.getSectionQuestions.asScala.toList.sorted.zipWithIndex.foreach { case (esq, questionIndex) =>
          val questionNumber = questionIndex + 1
          val questionType = esq.getQuestion.getType match
            case Question.Type.EssayQuestion          => messages.get(lang, "reports.question.type.essay")
            case Question.Type.ClozeTestQuestion      => messages.get(lang, "reports.question.type.cloze")
            case Question.Type.MultipleChoiceQuestion => messages.get(lang, "reports.question.type.multiplechoice")
            case Question.Type.WeightedMultipleChoiceQuestion =>
              messages.get(lang, "reports.question.type.weightedmultiplechoide")
            case Question.Type.ClaimChoiceQuestion => messages.get(lang, "reports.question.type.claim")

          appendCell(headerRow, s"${messages.get(lang, "reports.question")} $questionNumber: $questionType")

          val (scoreValue, scoreType) = getScoreTuple(esq)
          val valueCell               = valueRow.createCell(valueRow.getLastCellNum)
          setValue(valueCell, scoreValue, scoreType)
        }

        appendCell(headerRow, messages.get(lang, "reports.scores.sectionScore", es.getName))
        appendCell(valueRow, es.getTotalScore)
      }

      appendCell(headerRow, messages.get(lang, "reports.scores.totalScore"))
      appendCell(valueRow, exam.getTotalScore)

      autosizeColumns(headerRow, sheet)

      val bos = new ByteArrayOutputStream()
      wb.write(bos)
      bos
    }

  override def buildScoreExcel(examId: Long, childIds: List[Long]): ByteArrayOutputStream =
    Using.resource(new XSSFWorkbook()) { wb =>
      val sheet    = wb.createSheet("Question scores")
      val hostname = configReader.getHostName

      // Create cell style for hyperlinks
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

      // Map section name -> question IDs
      val questionIdsBySectionName = collection.mutable.LinkedHashMap[String, Set[Long]]()

      parentExam.getExamSections.asScala.foreach { es =>
        questionIdsBySectionName(es.getName) = extractQuestionIdsFromSection(es)
      }

      // Add missing questions/sections from child exams
      childExams.flatMap(_.getExamSections.asScala).foreach { es =>
        val sectionName      = es.getName
        val childQuestionIds = extractQuestionIdsFromSection(es)
        questionIdsBySectionName.updateWith(sectionName) {
          case Some(existing) => Some(existing ++ childQuestionIds)
          case None           => Some(childQuestionIds)
        }
      }

      // Create the header row
      val headerRow = sheet.createRow(0)
      ScoreReportDefaultHeaders.indices.foreach(i => headerRow.createCell(i).setCellValue(ScoreReportDefaultHeaders(i)))

      // Column index mappings
      val questionColumnIndexesBySectionName = collection.mutable.Map[String, Map[Long, Int]]()
      val sectionTotalIndexesBySectionName   = collection.mutable.Map[String, Int]()

      // Build header columns
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

      // Create data rows for each child exam
      childExams.foreach { exam =>
        Option(exam.getExamParticipation).flatMap(p => Option(p.getUser)).foreach { student =>
          val examScore = Option(exam.getExamRecord).map(_.getExamScore)
          val isGraded = exam.getState match
            case Exam.State.GRADED | Exam.State.GRADED_LOGGED | Exam.State.ARCHIVED => true
            case _                                                                  => false

          val defaultCells = getScoreReportDefaultCells(student, exam, examScore)
          val currentRow   = sheet.createRow(sheet.getLastRowNum + 1)
          appendCellsToRow(currentRow, defaultCells)

          exam.getExamSections.asScala.foreach { es =>
            val sectionName = es.getName
            es.getSectionQuestions.asScala.foreach { esq =>
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

      val bos = new ByteArrayOutputStream()
      wb.write(bos)
      bos
    }

  // Private helper methods

  private def getStudentReportHeaderMap(student: User): Map[String, String] =
    Map(
      "reports.studentFirstName" -> student.getFirstName,
      "reports.studentLastName"  -> student.getLastName,
      "reports.studentEmail"     -> student.getEmail,
      "reports.studentId"        -> student.getUserIdentifier
    )

  private def getScoreReportDefaultCells(
      student: User,
      exam: Exam,
      examScore: Option[ExamScore]
  ): List[(String, CellType)] =
    List(
      (student.getId.toString, CellType.STRING),
      (student.getEppn, CellType.STRING),
      (student.getFirstName, CellType.STRING),
      (student.getLastName, CellType.STRING),
      (student.getEmail, CellType.STRING),
      (student.getIdentifier, CellType.STRING),
      (exam.getState.name(), CellType.STRING),
      (examScore.map(_.getId.toString).getOrElse(""), CellType.STRING)
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
    if esq.getEvaluationType == Question.EvaluationType.Selection then
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
    es.getSectionQuestions.asScala.map(getQuestionId).toSet

  private def getDeletedQuestionIds(parent: Exam, childExams: List[Exam]): Set[Long] =
    val parentQuestionIds = parent.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .filter(esq => Option(esq.getQuestion).flatMap(q => Option(q.getId)).isDefined)
      .map(_.getQuestion.getId.longValue())
      .toSet

    childExams
      .flatMap(_.getExamSections.asScala)
      .flatMap(_.getSectionQuestions.asScala)
      .filter(esq => isQuestionRemoved(esq, parentQuestionIds))
      .map(getQuestionId)
      .toSet

  private def getQuestionId(question: ExamSectionQuestion): Long =
    Option(question.getQuestion)
      .flatMap(q => Option(q.getParent).map(_.getId.longValue()).orElse(Some(q.getId.longValue())))
      .getOrElse(question.getId.longValue())

  private def isQuestionRemoved(question: ExamSectionQuestion, parentIds: Set[Long]): Boolean =
    Option(question.getQuestion)
      .flatMap(q => Option(q.getParent).map(p => !parentIds.contains(p.getId.longValue())))
      .getOrElse(true)

  private def autosizeColumns(header: Row, sheet: Sheet): Unit =
    (0 until header.getLastCellNum).foreach(i => sheet.autoSizeColumn(i, true))
