// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assessment

import controllers.base.scala.ExamBaseController
import impl.mail.EmailComposer
import io.ebean.DB
import io.ebean.annotation.Transactional
import miscellaneous.csv.CsvBuilder
import miscellaneous.excel.ExcelBuilder
import miscellaneous.file.FileHandler
import miscellaneous.scala.DbApiHelper
import models.admin.ExamScore
import models.assessment.ExamRecord
import models.enrolment.ExamParticipation
import models.exam.{Exam, Grade}
import models.user.{Permission, Role, User}
import org.apache.pekko.actor.ActorSystem
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import play.api.Logging
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}
import system.AuditedAction
import validation.scala.CommaJoinedListValidator
import validation.scala.core.{ScalaAttrs, Validators}

import java.util.Base64
import javax.inject.Inject
import scala.concurrent.duration.DurationInt
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try, Using}

class ExamRecordController @Inject() (
    val controllerComponents: ControllerComponents,
    val validators: Validators,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val emailComposer: EmailComposer,
    val csvBuilder: CsvBuilder,
    val excelBuilder: ExcelBuilder,
    val fileHandler: FileHandler,
    val actorSystem: ActorSystem,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with ExamBaseController
    with DbApiHelper
    with Logging:

  private val XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  @Transactional
  def addExamRecord(): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
      .andThen(audited)(parse.json) { request =>
        (request.body \ "id").asOpt[Long] match
          case Some(id) =>
            DB.find(classOf[Exam])
              .fetch("parent")
              .fetch("parent.creator")
              .fetch("examSections.sectionQuestions.question")
              .where()
              .idEq(id)
              .find match
              case Some(exam) =>
                val user          = request.attrs(Auth.ATTR_USER)
                val gradeRequired = exam.getGradingType == Grade.Type.GRADED
                validateExamState(exam, gradeRequired, user).getOrElse {
                  exam.setState(Exam.State.GRADED_LOGGED)
                  exam.update()
                  DB.find(classOf[ExamParticipation]).fetch("user").where.eq("exam.id", exam.getId).find match
                    case Some(participation) =>
                      val record = createRecord(exam, participation, gradeRequired)
                      val score  = createScore(record, participation.getEnded)
                      score.save()
                      record.setExamScore(score)
                      record.save()
                      actorSystem.scheduler.scheduleOnce(1.seconds) {
                        emailComposer.composeInspectionReady(exam.getCreator, user, exam)
                        this.logger.info(s"Inspection ready notification email sent to ${user.getEmail}")
                      }
                      Ok("ok")
                    case None => NotFound
                }
              case None => NotFound
          case None => BadRequest

      }

  def registerExamWithoutRecord(): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
      .andThen(audited)(parse.json) { request =>
        (request.body \ "id").asOpt[Long] match
          case Some(id) =>
            DB.find(classOf[Exam])
              .fetch("languageInspection")
              .fetch("parent")
              .fetch("parent.creator")
              .where()
              .idEq(id)
              .find match
              case Some(exam) =>
                val user = request.attrs(Auth.ATTR_USER)
                validateExamState(exam, false, user).getOrElse {
                  exam.setState(Exam.State.GRADED_LOGGED)
                  exam.setGrade(null)
                  exam.setGradingType(Grade.Type.NOT_GRADED)
                  exam.update()
                  Ok
                }
              case None => NotFound("i18n_error_exam_not_found")
          case None => BadRequest
      }

  def exportExamRecordsAsCsv(start: Long, end: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT))) { request =>
      Try(csvBuilder.build(start, end)) match
        case Success(file) =>
          val contentDisposition = fileHandler.getContentDisposition(file)
          val content            = fileHandler.encodeAndDelete(file)
          Ok(content).withHeaders("Content-Disposition" -> contentDisposition)
        case Failure(ex) =>
          logger.error("Error creating CSV file", ex)
          InternalServerError("i18n_error_creating_csv_file")
    }

  def exportSelectedExamRecordsAsCsv(examId: Long): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
    .andThen(validators.validated(CommaJoinedListValidator)) { request =>
      val ids = request.attrs(ScalaAttrs.ID_LIST)
      Try(csvBuilder.build(examId, ids)) match
        case Success(file) =>
          val contentDisposition = fileHandler.getContentDisposition(file)
          val content            = fileHandler.encodeAndDelete(file)
          Ok(content).withHeaders("Content-Disposition" -> contentDisposition)
        case Failure(ex) =>
          logger.error("Error creating CSV file", ex)
          InternalServerError("i18n_error_creating_csv_file")
    }

  def exportSelectedExamRecordsAsExcel(examId: Long): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
    .andThen(validators.validated(CommaJoinedListValidator)) { request =>
      val ids = request.attrs(ScalaAttrs.ID_LIST)
      Using(excelBuilder.build(examId, ids)) { bos =>
        Ok(Base64.getEncoder.encodeToString(bos.toByteArray))
          .withHeaders("Content-Disposition" -> "attachment; filename=\"exam_records.xlsx\"")
          .as(XLSX_MIME)
      } match
        case Success(result) => result
        case Failure(ex) =>
          logger.error("Error creating Excel file", ex)
          InternalServerError("i18n_error_creating_csv_file")
    }

  private def validateExamState(exam: Exam, gradeRequired: Boolean, user: User): Option[Result] =
    if !isAllowedToRegister(exam, user) then Some(Forbidden("You are not allowed to modify this object"))
    else
      // Side effect: Set graded-by-user if auto-graded
      if Option(exam.getGradedByUser).isEmpty && Option(exam.getAutoEvaluationConfig).isEmpty then
        exam.setGradedByUser(user)

      val missingRequiredFields =
        (Option(exam.getGrade).isEmpty && gradeRequired) ||
          Option(exam.getCreditType).isEmpty ||
          Option(exam.getAnswerLanguage).isEmpty ||
          Option(exam.getGradedByUser).isEmpty

      if missingRequiredFields then Some(Forbidden("not yet graded by anyone!"))
      else
        val invalidState =
          exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) ||
            Option(exam.getExamRecord).isEmpty

        if invalidState then Some(Forbidden("i18n_error_exam_already_graded_logged"))
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
    if Option(exam.getCustomCredit).isEmpty then score.setCredits(exam.getCourse.getCredits.toString)
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
