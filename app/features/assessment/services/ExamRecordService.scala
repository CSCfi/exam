// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

import io.ebean.DB
import io.ebean.annotation.Transactional
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.assessment.{ExamRecord, ExamScore}
import models.enrolment.ExamParticipation
import models.exam.{Exam, Grade}
import models.user.{Permission, Role, User}
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import play.api.Logging
import services.csv.CsvBuilder
import services.excel.ExcelBuilder
import services.file.FileHandler
import services.mail.EmailComposer

import java.util.Base64
import javax.inject.Inject
import scala.concurrent.duration._
import scala.util._

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
        val gradeRequired = exam.getGradingType == Grade.Type.GRADED
        validateExamState(exam, gradeRequired, user) match
          case Some(error) => Left(error)
          case None =>
            exam.setState(Exam.State.GRADED_LOGGED)
            exam.update()
            DB.find(classOf[ExamParticipation]).fetch("user").where.eq(
              "exam.id",
              exam.getId
            ).find match
              case Some(participation) =>
                val record = createRecord(exam, participation, gradeRequired)
                val score  = createScore(record, participation.getEnded)
                score.save()
                record.setExamScore(score)
                record.save()
                emailComposer.scheduleEmail(1.seconds) {
                  emailComposer.composeInspectionReady(exam.getCreator, Some(user), exam)
                  logger.info(s"Inspection ready notification email sent to ${user.getEmail}")
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
            exam.setState(Exam.State.GRADED_LOGGED)
            exam.setGrade(null)
            exam.setGradingType(Grade.Type.NOT_GRADED)
            exam.update()
            Right(())
      case None => Left(ExamRecordError.ExamNotFound)

  def exportExamRecordsAsCsv(start: Long, end: Long): Either[ExamRecordError, (String, String)] =
    Try(csvBuilder.build(start, end)) match
      case Success(file) =>
        val contentDisposition = fileHandler.getContentDisposition(file)
        fileHandler.encodeAndDelete(file).left.map { error =>
          logger.error(s"Failed to encode and delete file: $error")
          ExamRecordError.ErrorCreatingCsvFile
        }.map(content => (content, contentDisposition))
      case Failure(ex) =>
        logger.error("Error creating CSV file", ex)
        Left(ExamRecordError.ErrorCreatingCsvFile)

  def exportSelectedExamRecordsAsCsv(
      examId: Long,
      ids: List[Long]
  ): Either[ExamRecordError, (String, String)] =
    Try(csvBuilder.build(examId, ids)) match
      case Success(file) =>
        val contentDisposition = fileHandler.getContentDisposition(file)
        fileHandler.encodeAndDelete(file).left.map { error =>
          logger.error(s"Failed to encode and delete file: $error")
          ExamRecordError.ErrorCreatingCsvFile
        }.map(content => (content, contentDisposition))
      case Failure(ex) =>
        logger.error("Error creating CSV file", ex)
        Left(ExamRecordError.ErrorCreatingCsvFile)

  def exportSelectedExamRecordsAsExcel(
      examId: Long,
      ids: List[Long]
  ): Either[ExamRecordError, String] =
    Using(excelBuilder.build(examId, ids)) { bos =>
      Base64.getEncoder.encodeToString(bos.toByteArray)
    } match
      case Success(content) => Right(content)
      case Failure(ex) =>
        logger.error("Error creating Excel file", ex)
        Left(ExamRecordError.ErrorCreatingExcelFile)

  private def validateExamState(
      exam: Exam,
      gradeRequired: Boolean,
      user: User
  ): Option[ExamRecordError] =
    if !isAllowedToRegister(exam, user) then Some(ExamRecordError.AccessForbidden)
    else
      // Side effect: Set graded-by-user if auto-graded
      if Option(exam.getGradedByUser).isEmpty && Option(exam.getAutoEvaluationConfig).isEmpty then
        exam.setGradedByUser(user)

      val missingRequiredFields =
        (Option(exam.getGrade).isEmpty && gradeRequired) ||
          Option(exam.getCreditType).isEmpty ||
          Option(exam.getAnswerLanguage).isEmpty ||
          Option(exam.getGradedByUser).isEmpty

      if missingRequiredFields then Some(ExamRecordError.NotYetGraded)
      else
        val invalidState =
          exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) ||
            Option(exam.getExamRecord).nonEmpty

        if invalidState then Some(ExamRecordError.AlreadyGradedLogged)
        else None

  private def isAllowedToRegister(exam: Exam, user: User): Boolean =
    exam.getParent.isOwnedOrCreatedBy(user) ||
      user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) ||
      isApprovedInLanguageInspection(exam, user)

  private def isApprovedInLanguageInspection(exam: Exam, user: User): Boolean =
    Option(exam.getLanguageInspection).exists { li =>
      li.getApproved &&
      Option(li.getFinishedAt).isDefined &&
      user.hasPermission(Permission.Type.CAN_INSPECT_LANGUAGE)
    }

  private def createRecord(exam: Exam, participation: ExamParticipation, releasable: Boolean) =
    val student = participation.getUser
    val teacher = exam.getGradedByUser
    val record  = new ExamRecord
    record.setExam(exam)
    record.setStudent(student)
    record.setTeacher(teacher)
    record.setTimeStamp(DateTime.now)
    record.setReleasable(releasable)
    record

  private def createScore(record: ExamRecord, examDate: DateTime) =
    val exam  = record.getExam
    val score = new ExamScore
    score.setAdditionalInfo(exam.getAdditionalInfo)
    score.setStudent(record.getStudent.getEppn)
    score.setStudentId(record.getStudent.getUserIdentifier)
    if Option(exam.getCustomCredit).isEmpty then
      score.setCredits(exam.getCourse.getCredits.toString)
    else score.setCredits(exam.getCustomCredit.toString)
    score.setExamScore(exam.getTotalScore.toString)
    score.setLecturer(record.getTeacher.getEppn)
    score.setLecturerId(record.getTeacher.getUserIdentifier)
    score.setLecturerEmployeeNumber(record.getTeacher.getEmployeeNumber)
    score.setLecturerFirstName(record.getTeacher.getFirstName)
    score.setLecturerLastName(record.getTeacher.getLastName)
    val dtf = DateTimeFormat.forPattern("yyyy-MM-dd")
    // Record transfer timestamp (date)
    score.setRegistrationDate(dtf.print(DateTime.now))
    score.setExamDate(dtf.print(examDate))
    score.setCourseImplementation(exam.getCourse.getCourseImplementation)
    score.setCourseUnitCode(exam.getCourse.getCode)
    score.setCourseUnitLevel(exam.getCourse.getLevel)
    score.setCourseUnitType(exam.getCourse.getCourseUnitType)
    score.setCreditLanguage(exam.getAnswerLanguage)
    score.setCreditType(exam.getCreditType.getType)
    score.setIdentifier(exam.getCourse.getIdentifier)
    val scale = Option(exam.getGradeScale).getOrElse(exam.getCourse.getGradeScale)
    if Option(scale.getExternalRef).isDefined then score.setGradeScale(scale.getExternalRef)
    else score.setGradeScale(scale.getDescription)
    val grade = exam.getGrade
    score.setStudentGrade(Option(grade).map(_.getName).getOrElse("POINT_GRADED"))
    val organisation = exam.getCourse.getOrganisation
    score.setInstitutionName(Option(organisation).map(_.getName).orNull)
    score
