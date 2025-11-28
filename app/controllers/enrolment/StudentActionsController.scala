// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.enrolment

import controllers.iop.collaboration.api.CollaborativeExamLoader
import controllers.iop.collaboration.impl.CollaborationController
import impl.ExamUpdater
import play.api.libs.ws.WSClient
import impl.ExternalCourseHandler
import io.ebean.text.PathProperties
import io.ebean.{DB, FetchConfig, Model}
import miscellaneous.config.{ByodConfigHandler, ConfigReader}
import miscellaneous.excel.ExcelBuilder
import miscellaneous.file.FileHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import miscellaneous.user.UserHandler
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.{Exam, ExamExecutionType}
import models.user.{Role, User}
import org.joda.time.DateTime
import play.api.i18n.MessagesApi
import play.api.mvc.*
import play.api.mvc.Results.*
import play.libs.concurrent.ClassLoaderExecutionContext
import repository.EnrolmentRepository
import security.scala.Auth
import system.interceptors.scala.SensitiveDataFilter

import java.io.{File, FileOutputStream}
import java.util.Base64
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*
import scala.util.{Try, Using}

class StudentActionsController @Inject() (
    ec: ClassLoaderExecutionContext,
    externalCourseHandler: ExternalCourseHandler,
    enrolmentRepository: EnrolmentRepository,
    wsClient: WSClient,
    examUpdater: ExamUpdater,
    examLoader: CollaborativeExamLoader,
    configReader: ConfigReader,
    byodConfigHandler: ByodConfigHandler,
    userHandler: UserHandler,
    fileHandler: FileHandler,
    excelBuilder: ExcelBuilder,
    messagesApi: MessagesApi,
    authenticated: Auth.AuthenticatedAction,
    sensitiveDataFilter: SensitiveDataFilter,
    override val controllerComponents: ControllerComponents
)(implicit executionContext: ExecutionContext)
    extends CollaborationController(wsClient, examUpdater, examLoader, configReader, controllerComponents)
    with DbApiHelper
    with JavaApiHelper:

  private val permCheckActive = configReader.isEnrolmentPermissionCheckActive
  private val XLSX_MIME       = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  def getExamFeedback(id: Long): Action[AnyContent] =
    authenticated
      .andThen(Auth.authorized(Seq(Role.Name.STUDENT)))
      .andThen(sensitiveDataFilter(Set("score", "defaultScore", "correctOption"))) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        val examOpt =
          DB.find(classOf[Exam])
            .fetch("creator", "firstName, lastName, email")
            .fetch("course", "code, name, credits")
            .fetch("grade")
            .fetch("creditType", "id, type, deprecated")
            .fetch("gradeScale")
            .fetch("executionType")
            .fetch("examFeedback")
            .fetch("examFeedback.attachment")
            .fetch("gradedByUser", "firstName, lastName")
            .fetch("examInspections.user", "firstName, lastName")
            .fetch("parent.examOwners", "firstName, lastName")
            .fetch("languageInspection", "approved, finishedAt")
            .fetch("languageInspection.statement")
            .fetch("languageInspection.statement.attachment")
            .where()
            .eq("id", id)
            .eq("creator", user)
            .disjunction()
            .eq("state", Exam.State.REJECTED)
            .eq("state", Exam.State.GRADED_LOGGED)
            .eq("state", Exam.State.ARCHIVED)
            .conjunction()
            .eq("state", Exam.State.GRADED)
            .isNotNull("autoEvaluationConfig")
            .isNotNull("autoEvaluationNotified")
            .endJunction()
            .endJunction()
            .find

        examOpt.map(exam => Ok(exam.asJson)).getOrElse(NotFound("i18n_error_exam_not_found"))
      }

  def getExamScore(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(Auth.authorized(Seq(Role.Name.STUDENT)))
      .andThen(sensitiveDataFilter(Set("score", "defaultScore", "correctOption"))) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        val examOpt =
          DB.find(classOf[Exam])
            .fetch("examSections.sectionQuestions.question")
            .where()
            .eq("id", eid)
            .eq("creator", user)
            .disjunction()
            .eq("state", Exam.State.GRADED_LOGGED)
            .eq("state", Exam.State.ARCHIVED)
            .conjunction()
            .eq("state", Exam.State.GRADED)
            .isNotNull("autoEvaluationConfig")
            .isNotNull("autoEvaluationNotified")
            .endJunction()
            .endJunction()
            .find

        examOpt match
          case Some(exam) =>
            exam.setMaxScore()
            exam.setApprovedAnswerCount()
            exam.setRejectedAnswerCount()
            exam.setTotalScore()
            Ok(asJson(exam))
          case None => NotFound("i18n_error_exam_not_found")
      }

  def getExamScoreReport(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(Auth.authorized(Seq(Role.Name.STUDENT)))
      .andThen(sensitiveDataFilter(Set("score", "defaultScore", "correctOption"))) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        val examOpt =
          DB.find(classOf[Exam])
            .fetch("examParticipation.user")
            .fetch("examSections.sectionQuestions.question")
            .fetch("examSections.sectionQuestions.clozeTestAnswer")
            .where()
            .eq("id", eid)
            .eq("creator", user)
            .disjunction()
            .eq("state", Exam.State.GRADED_LOGGED)
            .eq("state", Exam.State.ARCHIVED)
            .conjunction()
            .eq("state", Exam.State.GRADED)
            .isNotNull("autoEvaluationConfig")
            .isNotNull("autoEvaluationNotified")
            .endJunction()
            .endJunction()
            .find

        examOpt match
          case Some(exam) if Option(exam.getExamParticipation).exists(p => Option(p.getUser).isDefined) =>
            val student = exam.getExamParticipation.getUser
            val result = Using(excelBuilder.buildStudentReport(exam, student, messagesApi.asJava)) { bos =>
              Ok(Base64.getEncoder.encodeToString(bos.toByteArray))
                .withHeaders("Content-Disposition" -> "attachment; filename=\"exam_records.xlsx\"")
                .as(XLSX_MIME)
            }
            result.getOrElse(InternalServerError("i18n_error_creating_excel_file"))
          case _ => NotFound("i18n_error_exam_not_found")
      }

  private def getNoShows(user: User, filter: Option[String]): Set[ExamEnrolment] =
    val baseQuery = DB
      .find(classOf[ExamEnrolment])
      .fetch("exam", "id, state, name")
      .fetch("exam.course", "code, name")
      .fetch("exam.examOwners", "firstName, lastName, id")
      .fetch("exam.examInspections.user", "firstName, lastName, id")
      .fetch("reservation")
      .where()
      .eq("user", user)
      .isNull("exam.parent")
      .eq("noShow", true)

    val query = filter.fold(baseQuery) { f =>
      val condition = s"%$f%"
      baseQuery
        .disjunction()
        .ilike("exam.name", condition)
        .ilike("exam.course.code", condition)
        .ilike("exam.examOwners.firstName", condition)
        .ilike("exam.examOwners.lastName", condition)
        .ilike("exam.examInspections.user.firstName", condition)
        .ilike("exam.examInspections.user.lastName", condition)
        .endJunction()
    }
    query.distinct

  def getFinishedExams(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(Auth.authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val baseQuery = DB
        .find(classOf[ExamParticipation])
        .fetch("exam", "id, state, name, autoEvaluationNotified, anonymous, gradingType")
        .fetch("exam.creator", "id")
        .fetch("exam.course", "code, name")
        .fetch("exam.parent.examOwners", "firstName, lastName, id")
        .fetch("exam.examInspections.user", "firstName, lastName, id")
        .where()
        .isNotNull("exam.parent")
        .ne("exam.state", Exam.State.STUDENT_STARTED)
        .ne("exam.state", Exam.State.ABORTED)
        .ne("exam.state", Exam.State.DELETED)
        .eq("exam.creator", user)

      val query = filter.fold(baseQuery) { f =>
        val condition = s"%$f%"
        baseQuery
          .disjunction()
          .ilike("exam.name", condition)
          .ilike("exam.course.code", condition)
          .ilike("exam.parent.examOwners.firstName", condition)
          .ilike("exam.parent.examOwners.lastName", condition)
          .ilike("exam.examInspections.user.firstName", condition)
          .ilike("exam.examInspections.user.lastName", condition)
          .endJunction()
      }

      val participations = query.distinct
      val noShows        = getNoShows(user, filter)
      val trials         = participations.asInstanceOf[Set[Model]] ++ noShows.asInstanceOf[Set[Model]]
      Ok(trials.asJson)
    }

  def getEnrolment(eid: Long): Action[AnyContent] =
    authenticated.andThen(Auth.authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val pp = PathProperties.parse(
        """(*,
          |exam(*,
          |  course(*),
          |  examOwners(*),
          |  examInspections(*, user(*))
          |),
          |externalExam(*),
          |collaborativeExam(*),
          |user(*),
          |reservation(*,
          |  machine(*,
          |    room(*)
          |  )
          |),
          |examinationEventConfiguration(
          |  examinationEvent(*)
          |)
          |)""".stripMargin
      )
      val enrolmentOpt =
        DB.find(classOf[ExamEnrolment])
          .apply(pp)
          .where()
          .idEq(eid)
          .eq("user", user)
          .find
      // FIXME: Temporary helper until CollaborationController is refactored
      def ok(obj: Any): Result = Ok(DB.json().toJson(obj, pp)).as("application/json")

      enrolmentOpt match
        case None => Future.successful(NotFound("Enrolment not found"))
        case Some(enrolment) if Option(enrolment.getCollaborativeExam).isDefined =>
          // Collaborative exam, need to download
          downloadExam(enrolment.getCollaborativeExam).map { optExam =>
            optExam match
              case Some(exam) =>
                enrolment.setExam(exam)
                ok(enrolment)
              case None =>
                NotFound("Collaborative exam not found")
          }
        case Some(enrolment) if Option(enrolment.getExternalExam).isDefined =>
          // External exam
          val exam = enrolment.getExternalExam.deserialize()
          enrolment.setExternalExam(null)
          enrolment.setExam(exam)
          Future.successful(ok(enrolment))
        case Some(enrolment) =>
          Future.successful(ok(enrolment))
    }

  def getEnrolmentsForUser: Action[AnyContent] =
    authenticated.andThen(Auth.authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      enrolmentRepository.getStudentEnrolments(user).map(enrolments => Ok(enrolments.asJson))
    }

  def getExamConfigFile(enrolmentId: Long): Action[AnyContent] =
    authenticated.andThen(Auth.authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val oee =
        DB.find(classOf[ExamEnrolment])
          .where()
          .idEq(enrolmentId)
          .eq("user", user)
          .eq("exam.implementation", Exam.Implementation.CLIENT_AUTH)
          .in("exam.state", Exam.State.PUBLISHED, Exam.State.STUDENT_STARTED)
          .isNotNull("examinationEventConfiguration")
          .find
      oee match
        case None => Forbidden("Exam config not available")
        case Some(enrolment) =>
          val examName = enrolment.getExam.getName
          val eec      = enrolment.getExaminationEventConfiguration
          val fileName = examName.replace(" ", "-")
          val quitPassword =
            byodConfigHandler.getPlaintextPassword(eec.getEncryptedQuitPassword, eec.getQuitPasswordSalt)

          val result = Try {
            val file = File.createTempFile(fileName, ".seb")
            try
              val writeResult = Using(new FileOutputStream(file)) { fos =>
                val data = byodConfigHandler.getExamConfig(
                  eec.getHash,
                  eec.getEncryptedSettingsPassword,
                  eec.getSettingsPasswordSalt,
                  quitPassword
                )
                fos.write(data)
              }

              writeResult match
                case scala.util.Success(_) =>
                  val contentDisposition = fileHandler.getContentDisposition(file)
                  val data               = fileHandler.read(file)
                  val body               = Base64.getEncoder.encodeToString(data)
                  Ok(body).withHeaders("Content-Disposition" -> contentDisposition)
                case scala.util.Failure(ex) => throw ex
            finally file.delete()
          }

          result.getOrElse(InternalServerError("Error creating config file"))
    }

  def getExamInfo(eid: Long): Action[AnyContent] =
    authenticated.andThen(Auth.authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val examOpt =
        DB.find(classOf[Exam])
          .fetch("course", "code, name")
          .fetch("examSections")
          .fetch("examSections.examMaterials")
          .where()
          .idEq(eid)
          .eq("state", Exam.State.PUBLISHED)
          .eq("examEnrolments.user", user)
          .find

      examOpt.map(exam => Ok(exam.asJson)).getOrElse(NotFound("i18n_error_exam_not_found"))
    }

  def listAvailableExams(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(Auth.authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      if !permCheckActive then Future.successful(listExams(filter, Seq.empty))
      else
        externalCourseHandler
          .getPermittedCourses(user)
          .map { codes =>
            if codes.isEmpty then Ok(Seq.empty[Exam].asJson)
            else listExams(filter, codes.toSeq)
          }
          .recover { case ex: Throwable =>
            InternalServerError(ex.getMessage)
          }
    }

  private def listExams(filter: Option[String], courseCodes: Seq[String]): Result =
    val baseQuery = DB
      .find(classOf[Exam])
      .select("id, name, duration, periodStart, periodEnd, enrollInstruction, implementation")
      .fetch("course", "code, name")
      .fetch("examOwners", "firstName, lastName")
      .fetch("examInspections.user", "firstName, lastName")
      .fetch("examLanguages", "code, name", FetchConfig.ofQuery())
      .fetch("creator", "firstName, lastName")
      .fetch("examinationEventConfigurations.examinationEvent")
      .where()
      .eq("state", Exam.State.PUBLISHED)
      .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString)
      .gt("periodEnd", DateTime.now().toDate)

    val withCourseFilter =
      if courseCodes.nonEmpty then baseQuery.in("course.code", courseCodes.asJava)
      else baseQuery

    val query = filter.fold(withCourseFilter) { f =>
      val condition           = s"%$f%"
      val withDisjunction     = withCourseFilter.disjunction()
      val withOwnerSearch     = userHandler.applyNameSearch("examOwners", withDisjunction, f)
      val withInspectorSearch = userHandler.applyNameSearch("examInspections.user", withOwnerSearch, f)
      withInspectorSearch
        .ilike("name", condition)
        .ilike("course.code", condition)
        .ilike("course.name", condition)
        .endJunction()
    }

    val exams = query
      .orderBy("course.code")
      .distinct
      .filter { e =>
        e.getImplementation == Exam.Implementation.AQUARIUM ||
        e.getExaminationEventConfigurations.asScala
          .map(_.getExaminationEvent)
          .exists(_.getStart.isAfter(DateTime.now()))
      }

    Ok(exams.asJson)
