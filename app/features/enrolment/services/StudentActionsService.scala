// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.services

import database.EbeanPaths.{path, props}
import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.iop.collaboration.services.CollaborativeExamLoaderService
import io.ebean.text.PathProperties
import io.ebean.{DB, FetchConfig, Model}
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.*
import models.user.User
import play.api.Logging
import play.api.i18n.MessagesApi
import play.api.libs.json.{JsValue, Json}
import repository.EnrolmentRepository
import security.BlockingIOExecutionContext
import services.config.{ByodConfigHandler, ConfigReader}
import services.exam.ExternalCourseHandler
import services.excel.ExcelBuilder
import services.user.UserHandler

import java.time.Instant
import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.Try

class StudentActionsService @Inject() (
    private val externalCourseHandler: ExternalCourseHandler,
    private val enrolmentRepository: EnrolmentRepository,
    private val collaborativeExamLoader: CollaborativeExamLoaderService,
    private val configReader: ConfigReader,
    private val byodConfigHandler: ByodConfigHandler,
    private val userHandler: UserHandler,
    private val excelBuilder: ExcelBuilder,
    private val messagesApi: MessagesApi,
    implicit private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  private val permCheckActive = configReader.isEnrolmentPermissionCheckActive

  def getExamFeedback(examId: Long, user: User): Option[Exam] =
    DB.find(classOf[Exam])
      .fetch(path[Exam]("creator"), "firstName, lastName, email")
      .fetch(path[Exam]("course"), "code, name, credits")
      .fetch(path[Exam]("grade"))
      .fetch(path[Exam]("creditType"), "id, type, deprecated")
      .fetch(path[Exam]("gradeScale"))
      .fetch(path[Exam]("executionType"))
      .fetch(path[Exam]("examFeedback"))
      .fetch(path[Exam]("examFeedback.attachment"))
      .fetch(path[Exam]("gradedByUser"), "firstName, lastName")
      .fetch(path[Exam]("examInspections.user"), "firstName, lastName")
      .fetch(path[Exam]("parent.examOwners"), "firstName, lastName")
      .fetch(path[Exam]("languageInspection"), "approved, finishedAt")
      .fetch(path[Exam]("languageInspection.statement"))
      .fetch(path[Exam]("languageInspection.statement.attachment"))
      .where()
      .eq(path[Exam]("id"), examId)
      .eq(path[Exam]("creator"), user)
      .disjunction()
      .eq(path[Exam]("state"), ExamState.REJECTED)
      .eq(path[Exam]("state"), ExamState.GRADED_LOGGED)
      .eq(path[Exam]("state"), ExamState.ARCHIVED)
      .conjunction()
      .eq(path[Exam]("state"), ExamState.GRADED)
      .isNotNull(path[Exam]("autoEvaluationConfig"))
      .isNotNull(path[Exam]("autoEvaluationNotified"))
      .endJunction()
      .endJunction()
      .find

  def getExamScore(examId: Long, user: User): Option[Exam] =
    DB.find(classOf[Exam])
      .fetch(path[Exam]("examSections.sectionQuestions.question"))
      .where()
      .eq(path[Exam]("id"), examId)
      .eq(path[Exam]("creator"), user)
      .disjunction()
      .eq(path[Exam]("state"), ExamState.GRADED_LOGGED)
      .eq(path[Exam]("state"), ExamState.ARCHIVED)
      .conjunction()
      .eq(path[Exam]("state"), ExamState.GRADED)
      .isNotNull(path[Exam]("autoEvaluationConfig"))
      .isNotNull(path[Exam]("autoEvaluationNotified"))
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

  /** Returns a writer that streams the student score report to the given output stream, or Left if
    * exam/student not found.
    */
  def streamExamScoreReport(
      examId: Long,
      user: User
  ): Either[StudentActionsError.ExamNotFound.type, java.io.OutputStream => Unit] =
    DB.find(classOf[Exam])
      .fetch(path[Exam]("examParticipation.user"))
      .fetch(path[Exam]("examSections.sectionQuestions.question"))
      .fetch(path[Exam]("examSections.sectionQuestions.clozeTestAnswer"))
      .where()
      .eq(path[Exam]("id"), examId)
      .eq(path[Exam]("creator"), user)
      .disjunction()
      .eq(path[Exam]("state"), ExamState.GRADED_LOGGED)
      .eq(path[Exam]("state"), ExamState.ARCHIVED)
      .conjunction()
      .eq(path[Exam]("state"), ExamState.GRADED)
      .isNotNull(path[Exam]("autoEvaluationConfig"))
      .isNotNull(path[Exam]("autoEvaluationNotified"))
      .endJunction()
      .endJunction()
      .find match
      case Some(exam)
          if Option(exam.examParticipation).exists(p => Option(p.user).isDefined) =>
        val student = exam.examParticipation.user
        Right(os => excelBuilder.streamStudentReport(exam, student, messagesApi.asJava)(os))
      case _ => Left(StudentActionsError.ExamNotFound)

  private def getNoShows(user: User, filter: Option[String]): Set[ExamEnrolment] =
    val baseQuery = DB
      .find(classOf[ExamEnrolment])
      .fetch(path[ExamEnrolment]("exam"), "id, state, name")
      .fetch(path[ExamEnrolment]("exam.course"), "code, name")
      .fetch(path[ExamEnrolment]("exam.examOwners"), "firstName, lastName, id")
      .fetch(path[ExamEnrolment]("exam.examInspections.user"), "firstName, lastName, id")
      .fetch(path[ExamEnrolment]("reservation"))
      .where()
      .eq(path[ExamEnrolment]("user"), user)
      .isNull(path[ExamEnrolment]("exam.parent"))
      .eq(path[ExamEnrolment]("noShow"), true)

    val query = filter.fold(baseQuery) { f =>
      val condition = s"%$f%"
      baseQuery
        .disjunction()
        .ilike(path[ExamEnrolment]("exam.name"), condition)
        .ilike(path[ExamEnrolment]("exam.course.code"), condition)
        .ilike(path[ExamEnrolment]("exam.examOwners.firstName"), condition)
        .ilike(path[ExamEnrolment]("exam.examOwners.lastName"), condition)
        .ilike(path[ExamEnrolment]("exam.examInspections.user.firstName"), condition)
        .ilike(path[ExamEnrolment]("exam.examInspections.user.lastName"), condition)
        .endJunction()
    }
    query.distinct

  def getFinishedExams(filter: Option[String], user: User): List[Model] =
    val baseQuery = DB
      .find(classOf[ExamParticipation])
      .fetch(
        path[ExamParticipation]("exam"),
        "id, state, name, autoEvaluationNotified, anonymous, gradingType"
      )
      .fetch(path[ExamParticipation]("exam.creator"), "id")
      .fetch(path[ExamParticipation]("exam.course"), "code, name")
      .fetch(path[ExamParticipation]("exam.parent.examOwners"), "firstName, lastName, id")
      .fetch(path[ExamParticipation]("exam.examInspections.user"), "firstName, lastName, id")
      .where()
      .isNotNull(path[ExamParticipation]("exam.parent"))
      .ne(path[ExamParticipation]("exam.state"), ExamState.STUDENT_STARTED)
      .ne(path[ExamParticipation]("exam.state"), ExamState.ABORTED)
      .ne(path[ExamParticipation]("exam.state"), ExamState.DELETED)
      .eq(path[ExamParticipation]("exam.creator"), user)

    val query = filter.fold(baseQuery) { f =>
      val condition = s"%$f%"
      baseQuery
        .disjunction()
        .ilike(path[ExamParticipation]("exam.name"), condition)
        .ilike(path[ExamParticipation]("exam.course.code"), condition)
        .ilike(path[ExamParticipation]("exam.parent.examOwners.firstName"), condition)
        .ilike(path[ExamParticipation]("exam.parent.examOwners.lastName"), condition)
        .ilike(path[ExamParticipation]("exam.examInspections.user.firstName"), condition)
        .ilike(path[ExamParticipation]("exam.examInspections.user.lastName"), condition)
        .endJunction()
    }

    val participations = query.distinct
    val noShows        = getNoShows(user, filter)
    (participations.asInstanceOf[Set[Model]] ++ noShows.asInstanceOf[Set[Model]]).toList

  def getEnrolment(enrolmentId: Long, user: User): Future[Either[StudentActionsError, JsValue]] =
    val pp = props[ExamEnrolment](
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
        .eq(path[ExamEnrolment]("user"), user)
        .find

    enrolmentOpt match
      case None => Future.successful(Left(StudentActionsError.EnrolmentNotFound))
      case Some(enrolment) if Option(enrolment.collaborativeExam).isDefined =>
        // Collaborative exam, need to download
        collaborativeExamLoader.downloadExam(enrolment.collaborativeExam).map {
          case Some(exam) =>
            enrolment.exam = exam
            Right(Json.parse(DB.json().toJson(enrolment, pp)))
          case None => Left(StudentActionsError.CollaborativeExamNotFound)
        }
      case Some(enrolment) if Option(enrolment.externalExam).isDefined =>
        // External exam
        val exam = enrolment.externalExam.deserialize
        enrolment.externalExam = null
        enrolment.exam = exam
        Future.successful(Right(Json.parse(DB.json().toJson(enrolment, pp))))
      case Some(enrolment) =>
        Future.successful(Right(Json.parse(DB.json().toJson(enrolment, pp))))

  def getEnrolmentsForUser(user: User): Future[List[ExamEnrolment]] =
    enrolmentRepository.getStudentEnrolments(user)

  /** Returns a writer that streams the exam config (.seb) to the given output stream, and the
    * suggested filename, or Left if not available.
    */
  def streamExamConfigFile(
      enrolmentId: Long,
      user: User
  ): Either[StudentActionsError, (java.io.OutputStream => Unit, String)] =
    DB.find(classOf[ExamEnrolment])
      .where()
      .idEq(enrolmentId)
      .eq(path[ExamEnrolment]("user"), user)
      .eq(path[ExamEnrolment]("exam.implementation"), ExamImplementation.CLIENT_AUTH)
      .in(path[ExamEnrolment]("exam.state"), ExamState.PUBLISHED, ExamState.STUDENT_STARTED)
      .isNotNull(path[ExamEnrolment]("examinationEventConfiguration"))
      .find match
      case None => Left(StudentActionsError.ExamConfigNotAvailable)
      case Some(enrolment) =>
        val examName     = enrolment.exam.name
        val eec          = enrolment.examinationEventConfiguration
        val baseFileName = examName.replace(" ", "-")
        val fileName     = s"$baseFileName.seb"
        val quitPassword =
          byodConfigHandler.getPlaintextPassword(
            eec.encryptedQuitPassword,
            eec.quitPasswordSalt
          )
        Try {
          val data = byodConfigHandler.getExamConfig(
            eec.hash,
            eec.encryptedSettingsPassword,
            eec.settingsPasswordSalt,
            quitPassword
          )
          val writer: java.io.OutputStream => Unit = os => os.write(data)
          (writer, fileName)
        }.toEither.left.map { ex =>
          logger.error("Error creating config file", ex)
          StudentActionsError.ErrorCreatingConfigFile
        }

  def getExamInfo(examId: Long, user: User): Option[Exam] =
    DB.find(classOf[Exam])
      .fetch(path[Exam]("course"), "code, name")
      .fetch(path[Exam]("examSections"))
      .fetch(path[Exam]("examSections.examMaterials"))
      .where()
      .idEq(examId)
      .eq(path[Exam]("state"), ExamState.PUBLISHED)
      .eq(path[Exam]("examEnrolments.user"), user)
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
      .fetch(path[Exam]("course"), "code, name")
      .fetch(path[Exam]("examOwners"), "firstName, lastName")
      .fetch(path[Exam]("examInspections.user"), "firstName, lastName")
      .fetch(path[Exam]("examLanguages"), "code, name", FetchConfig.ofQuery())
      .fetch(path[Exam]("creator"), "firstName, lastName")
      .fetch(path[Exam]("examinationEventConfigurations.examinationEvent"))
      .where()
      .eq(path[Exam]("state"), ExamState.PUBLISHED)
      .eq(path[Exam]("executionType.type"), ExamExecutionType.Type.PUBLIC.toString)
      .gt(path[Exam]("periodEnd"), Instant.now())

    val withCourseFilter =
      if courseCodes.nonEmpty then baseQuery.in(path[Exam]("course.code"), courseCodes.asJava)
      else baseQuery

    val query = filter.fold(withCourseFilter) { f =>
      val condition       = s"%$f%"
      val withDisjunction = withCourseFilter.disjunction()
      val withOwnerSearch = userHandler.applyNameSearch(
        path[Exam]("examOwners.firstName"),
        path[Exam]("examOwners.lastName"),
        withDisjunction,
        f
      )
      val withInspectorSearch =
        userHandler.applyNameSearch(
          path[Exam]("examInspections.user.firstName"),
          path[Exam]("examInspections.user.lastName"),
          withOwnerSearch,
          f
        )
      withInspectorSearch
        .ilike(path[Exam]("name"), condition)
        .ilike(path[Exam]("course.code"), condition)
        .ilike(path[Exam]("course.name"), condition)
        .endJunction()
    }

    val exams = query
      .orderBy(path[Exam]("course.code"))
      .distinct
      .filter { e =>
        e.implementation == ExamImplementation.AQUARIUM ||
        e.examinationEventConfigurations.asScala
          .map(_.examinationEvent)
          .exists(_.start.isAfter(Instant.now()))
      }

    exams.asJson
