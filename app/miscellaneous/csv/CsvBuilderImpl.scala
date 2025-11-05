// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.csv

import com.opencsv.{CSVParserBuilder, CSVReader, CSVReaderBuilder, CSVWriter}
import io.ebean.DB
import miscellaneous.scala.DbApiHelper
import models.admin.ExamScore
import models.assessment.{Comment, ExamRecord}
import models.exam.{Exam, Grade, GradeScale}
import models.user.{Role, User}
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import org.jsoup.Jsoup
import org.jsoup.safety.Safelist
import play.api.Logging
import play.api.libs.json.{JsArray, JsValue}

import java.io.{File, FileReader, FileWriter}
import java.util.Date
import scala.jdk.CollectionConverters.*
import scala.util.{Try, Using}

class CsvBuilderImpl extends CsvBuilder with DbApiHelper with Logging:

  override def build(startDate: Long, endDate: Long): File =
    val start = new Date(startDate)
    val end   = new Date(endDate)
    val examRecords = DB.find(classOf[ExamRecord])
      .fetch("examScore")
      .where()
      .between("timeStamp", start, end)
      .findList()
      .asScala
      .toList

    writeRecordsToFile(examRecords, "csv-output", ExamScore.getHeaders)

  override def build(examId: Long, childIds: List[Long]): File =
    val examRecords = DB.find(classOf[ExamRecord])
      .fetch("examScore")
      .where()
      .eq("exam.parent.id", examId)
      .in("exam.id", childIds)
      .findList()
      .asScala
      .toList

    writeRecordsToFile(examRecords, "csv-output-", ExamScore.getHeaders)

  override def build(node: JsValue): File =
    val file = File.createTempFile("csv-output-", ".tmp")

    Using.resource(new CSVWriter(new FileWriter(file))) { writer =>
      writer.writeNext(getHeaders)
      node.as[JsArray].value.foreach { assessment =>
        writer.writeNext(values(assessment).toArray)
      }
    }

    file

  override def parseGrades(csvFile: File, user: User, role: Role.Name): Unit =
    detectDelimiter(csvFile) match
      case None =>
        logger.warn("Cannot read grades")
      case Some(reader) =>
        Using.resource(reader) { r =>
          Iterator.continually(r.readNext())
            .takeWhile(_ != null)
            .filterNot(isHeaderOrInvalid)
            .foreach(processGradeRecord(_, user, role))
        }

  // Helper methods

  private def writeRecordsToFile(records: List[ExamRecord], prefix: String, headers: Array[String]): File =
    val file = File.createTempFile(prefix, ".tmp")

    Using.resource(new CSVWriter(new FileWriter(file))) { writer =>
      writer.writeNext(headers)
      records.foreach { record =>
        writer.writeNext(
          record.getExamScore.asArray(record.getStudent, record.getTeacher, record.getExam)
        )
      }
    }

    file

  private def detectDelimiter(csvFile: File): Option[CSVReader] =
    val GradesFirstRowColumnCount = 6

    def tryDelimiter(separator: Char): Option[(CSVReader, Int)] =
      Try {
        val parser = new CSVParserBuilder().withSeparator(separator).build()
        val reader = new CSVReaderBuilder(new FileReader(csvFile)).withCSVParser(parser).build()
        val firstRow = reader.readNext()
        (reader, Option(firstRow).map(_.length).getOrElse(0))
      }.toOption

    val colonResult     = tryDelimiter(',')
    val semicolonResult = tryDelimiter(';')

    colonResult match
      case Some((reader, GradesFirstRowColumnCount)) => Some(reader)
      case _ =>
        semicolonResult match
          case Some((reader, GradesFirstRowColumnCount)) => Some(reader)
          case _ =>
            logger.warn("Invalid column count")
            // Close any opened readers
            colonResult.foreach(_._1.close())
            semicolonResult.foreach(_._1.close())
            None

  private def isHeaderOrInvalid(records: Array[String]): Boolean =
    records.length < 2 || records(0).equalsIgnoreCase("exam id")

  private def processGradeRecord(records: Array[String], user: User, role: Role.Name): Unit =
    parseExamId(records(0)) match
      case None =>
        logger.warn("Invalid input, unable to grade")
      case Some(examId) =>
        findExam(examId, user, role) match
          case None =>
            logger.warn(s"Exam with id $examId not found or inaccessible, unable to grade it")
          case Some(exam) =>
            val gradeName = records(1)
            val scale     = Option(exam.getGradeScale).getOrElse(exam.getCourse.getGradeScale)

            findGrade(gradeName, scale) match
              case None =>
                logger.warn(s"No grade found with name $gradeName")
              case Some(grade) =>
                updateExam(exam, grade, user, records)

  private def parseExamId(idStr: String): Option[Long] =
    Try(idStr.toLong).toOption

  private def findExam(examId: Long, user: User, role: Role.Name): Option[Exam] =
    var query = DB.find(classOf[Exam])
      .where()
      .idEq(examId)
      .isNotNull("parent")
      .disjunction()
      .eq("state", Exam.State.REVIEW)
      .eq("state", Exam.State.REVIEW_STARTED)
      .endJunction()

    if role == Role.Name.ADMIN then
      query = query.eq("parent.examOwners", user)

    Option(query.findOne())

  private def findGrade(gradeName: String, scale: GradeScale): Option[Grade] =
    val grades = DB.find(classOf[Grade])
      .where()
      .eq("name", gradeName)
      .eq("gradeScale", scale)
      .findList()
      .asScala
      .toList

    grades match
      case grade :: Nil => Some(grade)
      case Nil =>
        logger.warn(s"No grade found with name $gradeName")
        None
      case _ =>
        logger.warn(s"Multiple grades found with name $gradeName")
        None

  private def updateExam(exam: Exam, grade: Grade, user: User, records: Array[String]): Unit =
    exam.setGrade(grade)
    exam.setGradedByUser(user)
    exam.setGradedTime(DateTime.now())
    exam.setState(Exam.State.GRADED)
    exam.setAnswerLanguage(exam.getExamLanguages.asScala.head.getCode)
    exam.setCreditType(exam.getExamType)

    // Handle feedback if present
    if records.length > 2 then
      val feedback = records(2)
      if feedback != null && feedback.nonEmpty then
        val comment = Option(exam.getExamFeedback).getOrElse {
          val newComment = new Comment()
          newComment.setCreatorWithDate(user)
          newComment
        }
        comment.setModifierWithDate(user)
        comment.setComment(Jsoup.clean(feedback, Safelist.relaxed()))
        comment.save()
        exam.setExamFeedback(comment)

    exam.update()

  private def getHeaders: Array[String] =
    Array(
      "id",
      "studentFirstName",
      "studentLastName",
      "studentEmail",
      "examName",
      "examDate",
      "creditType",
      "credits",
      "creditLanguage",
      "studentGrade",
      "gradeScale",
      "examScore",
      "lecturer",
      "lecturerFirstName",
      "lecturerLastName",
      "lecturerEmail",
      "lecturerEmployeeNumber",
      "date",
      "additionalInfo"
    )

  private def values(assessment: JsValue): Seq[String] =
    val dtf = DateTimeFormat.forPattern("yyyy-MM-dd")

    val student = (assessment \ "user").get
    val exam    = (assessment \ "exam").get
    val teacher = (exam \ "gradedByUser").get

    Seq(
      (assessment \ "_id").asOpt[String].getOrElse(""),
      (student \ "firstName").asOpt[String].getOrElse(""),
      (student \ "lastName").asOpt[String].getOrElse(""),
      (student \ "email").asOpt[String].getOrElse(""),
      (exam \ "name").asOpt[String].getOrElse(""),
      (assessment \ "ended").asOpt[Long].map(dtf.print).getOrElse(""),
      (exam \ "creditType" \ "type").asOpt[String].getOrElse(""),
      (exam \ "customCredit").asOpt[String].getOrElse(""),
      (exam \ "answerLanguage").asOpt[String].getOrElse(""),
      (exam \ "grade" \ "name").asOpt[String].getOrElse(""),
      (exam \ "gradeScale" \ "description").asOpt[String].getOrElse(""),
      (exam \ "totalScore").asOpt[String].getOrElse(""),
      (teacher \ "eppn").asOpt[String].getOrElse(""),
      (teacher \ "firstName").asOpt[String].getOrElse(""),
      (teacher \ "lastName").asOpt[String].getOrElse(""),
      (teacher \ "email").asOpt[String].getOrElse(""),
      (teacher \ "employeeNumber").asOpt[String].getOrElse(""),
      (exam \ "gradedTime").asOpt[String].getOrElse(""),
      (exam \ "additionalInfo").asOpt[String].getOrElse("")
    )

