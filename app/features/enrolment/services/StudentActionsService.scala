// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.services

import features.iop.collaboration.api.CollaborativeExamLoader
import io.ebean.text.PathProperties
import io.ebean.{DB, FetchConfig, Model}
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.{Exam, ExamExecutionType}
import models.user.User
import org.joda.time.DateTime
import play.api.i18n.MessagesApi
import play.api.libs.json.{JsValue, Json}
import play.api.Logging
import repository.EnrolmentRepository
import services.config.{ByodConfigHandler, ConfigReader}
import services.exam.ExternalCourseHandler
import services.excel.ExcelBuilder
import services.file.FileHandler
import services.user.UserHandler

import java.io.{File, FileOutputStream}
import java.util.Base64
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.util.{Try, Using}

class StudentActionsService @Inject() (
    private val externalCourseHandler: ExternalCourseHandler,
    private val enrolmentRepository: EnrolmentRepository,
    private val collaborativeExamLoader: CollaborativeExamLoader,
    private val configReader: ConfigReader,
    private val byodConfigHandler: ByodConfigHandler,
    private val userHandler: UserHandler,
    private val fileHandler: FileHandler,
    private val excelBuilder: ExcelBuilder,
    private val messagesApi: MessagesApi,
    implicit private val ec: ExecutionContext
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  private val permCheckActive = configReader.isEnrolmentPermissionCheckActive
  private val XLSX_MIME       = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  def getExamFeedback(examId: Long, user: User): Option[Exam] =
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
      .eq("id", examId)
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

  def getExamScore(examId: Long, user: User): Option[Exam] =
    DB.find(classOf[Exam])
      .fetch("examSections.sectionQuestions.question")
      .where()
      .eq("id", examId)
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
      .map { exam =>
        exam.setMaxScore()
        exam.setApprovedAnswerCount()
        exam.setRejectedAnswerCount()
        exam.setTotalScore()
        exam
      }

  def getExamScoreReport(examId: Long, user: User): Either[StudentActionsError, FileResponse] =
    DB.find(classOf[Exam])
      .fetch("examParticipation.user")
      .fetch("examSections.sectionQuestions.question")
      .fetch("examSections.sectionQuestions.clozeTestAnswer")
      .where()
      .eq("id", examId)
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
      .find match
      case Some(exam) if Option(exam.getExamParticipation).exists(p => Option(p.getUser).isDefined) =>
        val student = exam.getExamParticipation.getUser
        Using(excelBuilder.buildStudentReport(exam, student, messagesApi.asJava)) { bos =>
          FileResponse(
            content = Base64.getEncoder.encodeToString(bos.toByteArray),
            contentType = XLSX_MIME,
            fileName = "exam_records.xlsx"
          )
        }.fold(
          _ => Left(StudentActionsError.ErrorCreatingExcelFile),
          result => Right(result)
        )
      case _ => Left(StudentActionsError.ExamNotFound)

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

  def getFinishedExams(filter: Option[String], user: User): List[Model] =
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
    (participations.asInstanceOf[Set[Model]] ++ noShows.asInstanceOf[Set[Model]]).toList

  def getEnrolment(enrolmentId: Long, user: User): Future[Either[StudentActionsError, JsValue]] =
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
        .idEq(enrolmentId)
        .eq("user", user)
        .find

    enrolmentOpt match
      case None => Future.successful(Left(StudentActionsError.EnrolmentNotFound))
      case Some(enrolment) if Option(enrolment.getCollaborativeExam).isDefined =>
        // Collaborative exam, need to download
        collaborativeExamLoader.downloadExam(enrolment.getCollaborativeExam).map {
          case Some(exam) =>
            enrolment.setExam(exam)
            Right(Json.parse(DB.json().toJson(enrolment, pp)))
          case None => Left(StudentActionsError.CollaborativeExamNotFound)
        }
      case Some(enrolment) if Option(enrolment.getExternalExam).isDefined =>
        // External exam
        val exam = enrolment.getExternalExam.deserialize()
        enrolment.setExternalExam(null)
        enrolment.setExam(exam)
        Future.successful(Right(Json.parse(DB.json().toJson(enrolment, pp))))
      case Some(enrolment) =>
        Future.successful(Right(Json.parse(DB.json().toJson(enrolment, pp))))

  def getEnrolmentsForUser(user: User): Future[List[ExamEnrolment]] =
    enrolmentRepository.getStudentEnrolments(user)

  def getExamConfigFile(enrolmentId: Long, user: User): Either[StudentActionsError, FileResponse] =
    DB.find(classOf[ExamEnrolment])
      .where()
      .idEq(enrolmentId)
      .eq("user", user)
      .eq("exam.implementation", Exam.Implementation.CLIENT_AUTH)
      .in("exam.state", Exam.State.PUBLISHED, Exam.State.STUDENT_STARTED)
      .isNotNull("examinationEventConfiguration")
      .find match
      case None => Left(StudentActionsError.ExamConfigNotAvailable)
      case Some(enrolment) =>
        val examName     = enrolment.getExam.getName
        val eec          = enrolment.getExaminationEventConfiguration
        val baseFileName = examName.replace(" ", "-")
        val quitPassword =
          byodConfigHandler.getPlaintextPassword(eec.getEncryptedQuitPassword, eec.getQuitPasswordSalt)

        val file = File.createTempFile(baseFileName, ".seb")
        Try {
          Using(new FileOutputStream(file)) { fos =>
            val data = byodConfigHandler.getExamConfig(
              eec.getHash,
              eec.getEncryptedSettingsPassword,
              eec.getSettingsPasswordSalt,
              quitPassword
            )
            fos.write(data)
          }.get
          val contentDisposition = fileHandler.getContentDisposition(file)
          val data               = fileHandler.read(file)
          val body               = Base64.getEncoder.encodeToString(data)
          // Extract filename from Content-Disposition header (format: "attachment; filename=\"...\"")
          val extractedFileName = contentDisposition
            .split("filename=")
            .lift(1)
            .map(_.replace("\"", "").trim)
            .getOrElse(s"$baseFileName.seb")
          file.delete()
          FileResponse(
            content = body,
            contentType = "application/octet-stream",
            fileName = extractedFileName
          )
        }.fold(
          ex =>
            file.delete()
            logger.error("Error creating config file", ex)
            Left(StudentActionsError.ErrorCreatingConfigFile)
          ,
          result => Right(result)
        )

  def getExamInfo(examId: Long, user: User): Option[Exam] =
    DB.find(classOf[Exam])
      .fetch("course", "code, name")
      .fetch("examSections")
      .fetch("examSections.examMaterials")
      .where()
      .idEq(examId)
      .eq("state", Exam.State.PUBLISHED)
      .eq("examEnrolments.user", user)
      .find

  def listAvailableExams(filter: Option[String], user: User): Future[JsValue] =
    if !permCheckActive then Future.successful(listExams(filter, Seq.empty))
    else
      externalCourseHandler
        .getPermittedCourses(user)
        .map { codes =>
          if codes.isEmpty then Seq.empty[Exam].asJson
          else listExams(filter, codes.toSeq)
        }
        .recover { case ex: Throwable =>
          logger.error("Error getting permitted courses", ex)
          Seq.empty[Exam].asJson
        }

  private def listExams(filter: Option[String], courseCodes: Seq[String]): JsValue =
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

    exams.asJson
