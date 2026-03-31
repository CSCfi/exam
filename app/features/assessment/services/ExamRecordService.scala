// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.DB
import io.ebean.annotation.Transactional
import models.assessment.{ExamRecord, ExamScore}
import models.enrolment.ExamParticipation
import models.exam.Exam
import models.exam.ExamState
import models.exam.GradeType
import models.user.{PermissionType, Role, User}
import play.api.Logging
import services.csv.CsvBuilder
import services.excel.ExcelBuilder
import services.file.FileHandler
import services.mail.EmailComposer

import java.io.OutputStream
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.*

class ExamRecordService @Inject() (
    private val emailComposer: EmailComposer,
    private val csvBuilder: CsvBuilder,
    private val excelBuilder: ExcelBuilder,
    private val fileHandler: FileHandler
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  @Transactional
  def addExamRecord(examId: Long, user: User): Either[ExamRecordError, Unit] =
    DB.find(classOf[Exam])
      .fetch("parent")
      .fetch("parent.creator")
      .fetch("examSections.sectionQuestions.question")
      .where()
      .idEq(examId)
      .find match
      case Some(exam) =>
        val gradeRequired = exam.gradingType == GradeType.GRADED
        validateExamState(exam, gradeRequired, user) match
          case Some(error) => Left(error)
          case None =>
            exam.state = ExamState.GRADED_LOGGED
            exam.update()
            DB.find(classOf[ExamParticipation]).fetch("user").where.eq(
              "exam.id",
              exam.id
            ).find match
              case Some(participation) =>
                val record = createRecord(exam, participation, gradeRequired)
                val score  = createScore(record, participation.ended)
                score.save()
                record.examScore = score
                record.save()
                emailComposer.scheduleEmail(1.seconds) {
                  emailComposer.composeInspectionReady(exam.creator, Some(user), exam)
                  logger.info(s"Inspection ready notification email sent to ${user.email}")
                }
                Right(())
              case None => Left(ExamRecordError.ParticipationNotFound)
      case None => Left(ExamRecordError.ExamNotFound)

  def registerExamWithoutRecord(examId: Long, user: User): Either[ExamRecordError, Unit] =
    DB.find(classOf[Exam])
      .fetch("languageInspection")
      .fetch("parent")
      .fetch("parent.creator")
      .where()
      .idEq(examId)
      .find match
      case Some(exam) =>
        validateExamState(exam, false, user) match
          case Some(error) => Left(error)
          case None =>
            exam.state = ExamState.GRADED_LOGGED
            exam.grade = null
            exam.gradingType = GradeType.NOT_GRADED
            exam.update()
            Right(())
      case None => Left(ExamRecordError.ExamNotFound)

  /** Streams exam records CSV (by date range) to the given output stream. Caller must close the
    * stream.
    */
  def streamExamRecordsAsCsvByDate(start: Long, end: Long)(os: OutputStream): Unit =
    csvBuilder.streamExamRecordsByDate(start, end)(os)

  /** Streams selected exam records CSV to the given output stream. Caller must close the stream. */
  def streamSelectedExamRecordsAsCsv(examId: Long, ids: List[Long])(os: OutputStream): Unit =
    csvBuilder.streamExamRecords(examId, ids)(os)

  /** Streams the exam records Excel to the given output stream. Caller must close the stream. */
  def streamSelectedExamRecordsAsExcel(examId: Long, ids: List[Long])(os: OutputStream): Unit =
    val records = DB
      .find(classOf[ExamRecord])
      .fetch("examScore")
      .where()
      .eq("exam.parent.id", examId)
      .in("exam.id", ids.asJava)
      .list
    excelBuilder.streamExamRecords(records)(os)

  private def validateExamState(
      exam: Exam,
      gradeRequired: Boolean,
      user: User
  ): Option[ExamRecordError] =
    if !isAllowedToRegister(exam, user) then Some(ExamRecordError.AccessForbidden)
    else
      // Side effect: Set graded-by-user if auto-graded
      if Option(exam.gradedByUser).isEmpty && Option(exam.autoEvaluationConfig).isEmpty then
        exam.gradedByUser = user

      val missingRequiredFields =
        (Option(exam.grade).isEmpty && gradeRequired) ||
          Option(exam.creditType).isEmpty ||
          Option(exam.answerLanguage).isEmpty ||
          Option(exam.gradedByUser).isEmpty

      if missingRequiredFields then Some(ExamRecordError.NotYetGraded)
      else
        val invalidState =
          exam.hasState(ExamState.ABORTED, ExamState.GRADED_LOGGED, ExamState.ARCHIVED) ||
            Option(exam.examRecord).nonEmpty

        if invalidState then Some(ExamRecordError.AlreadyGradedLogged)
        else None

  private def isAllowedToRegister(exam: Exam, user: User): Boolean =
    exam.parent.isOwnedOrCreatedBy(user) ||
      user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) ||
      isApprovedInLanguageInspection(exam, user)

  private def isApprovedInLanguageInspection(exam: Exam, user: User): Boolean =
    Option(exam.languageInspection).exists { li =>
      li.approved &&
      Option(li.finishedAt).isDefined &&
      user.hasPermission(PermissionType.CAN_INSPECT_LANGUAGE)
    }

  private def createRecord(exam: Exam, participation: ExamParticipation, releasable: Boolean) =
    val student = participation.user
    val teacher = exam.gradedByUser
    val record  = new ExamRecord
    record.exam = exam
    record.student = student
    record.teacher = teacher
    record.timeStamp = Instant.now()
    record.releasable = releasable
    record

  private def createScore(record: ExamRecord, examDate: Instant) =
    val exam  = record.exam
    val score = new ExamScore
    score.additionalInfo = exam.additionalInfo
    score.student = record.student.eppn
    score.studentId = record.student.userIdentifier
    if Option(exam.customCredit).isEmpty then
      score.credits = exam.course.credits.toString
    else score.credits = exam.customCredit.toString
    score.examScore = exam.getTotalScore.toString
    score.lecturer = record.teacher.eppn
    score.lecturerId = record.teacher.userIdentifier
    score.lecturerEmployeeNumber = record.teacher.employeeNumber
    score.lecturerFirstName = record.teacher.firstName
    score.lecturerLastName = record.teacher.lastName
    val dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    score.registrationDate = dtf.format(Instant.now().atZone(ZoneOffset.UTC).toLocalDate)
    score.examDate = dtf.format(examDate.atZone(ZoneOffset.UTC).toLocalDate)
    score.courseImplementation = exam.course.courseImplementation
    score.courseUnitCode = exam.course.code
    score.courseUnitLevel = exam.course.level
    score.courseUnitType = exam.course.courseUnitType
    score.creditLanguage = exam.answerLanguage
    score.creditType = exam.creditType.`type`
    score.identifier = exam.course.identifier
    val scale = Option(exam.gradeScale).getOrElse(exam.course.gradeScale)
    if Option(scale.externalRef).isDefined then score.gradeScale = scale.externalRef
    else score.gradeScale = scale.description
    val grade = exam.grade
    score.studentGrade = Option(grade).map(_.name).getOrElse("POINT_GRADED")
    val organisation = exam.course.organisation
    score.institutionName = Option(organisation).map(_.name).orNull
    score
