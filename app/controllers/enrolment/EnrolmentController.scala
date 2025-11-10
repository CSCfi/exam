// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.enrolment

import controllers.iop.transfer.api.ExternalReservationHandler
import impl.ExternalCourseHandler
import impl.mail.EmailComposer
import io.ebean.{DB, Transaction}
import miscellaneous.config.ConfigReader
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.enrolment.EnrolmentHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.{ExamEnrolment, ExaminationEventConfiguration}
import models.exam.{Exam, ExamExecutionType}
import models.user.{Role, User}
import org.apache.pekko.actor.ActorSystem
import org.joda.time.DateTime
import play.api.Logging
import play.api.mvc.*
import play.libs.concurrent.ClassLoaderExecutionContext
import repository.EnrolmentRepository
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import validation.scala.core.{ScalaAttrs, Validators}
import validation.scala.enrolment.{EnrolmentCourseInformationValidator, EnrolmentInformationValidator, StudentEnrolmentValidator}

import java.util.Date
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*
import scala.util.Try

class EnrolmentController @Inject() (
    emailComposer: EmailComposer,
    externalCourseHandler: ExternalCourseHandler,
    externalReservationHandler: ExternalReservationHandler,
    enrolmentRepository: EnrolmentRepository,
    httpExecutionContext: ClassLoaderExecutionContext,
    actor: ActorSystem,
    configReader: ConfigReader,
    dateTimeHandler: DateTimeHandler,
    enrolmentHandler: EnrolmentHandler,
    authenticated: AuthenticatedAction,
    validators: Validators,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with DbApiHelper
    with JavaApiHelper
    with Logging:

  private val permCheckActive = configReader.isEnrolmentPermissionCheckActive

  def listEnrolledExams(code: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      val exams = DB
        .find(classOf[Exam])
        .fetch("creator", "firstName, lastName")
        .fetch("examLanguages")
        .fetch("examOwners", "firstName, lastName")
        .fetch("examInspections.user", "firstName, lastName")
        .fetch("course", "code, name")
        .where()
        .eq("course.code", code)
        .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString)
        .eq("state", Exam.State.PUBLISHED)
        .ge("periodEnd", new Date())
        .list

      Ok(exams.asJson)
    }

  def enrolmentsByReservation(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val enrolments = DB
        .find(classOf[ExamEnrolment])
        .fetch("user", "firstName, lastName, email")
        .fetch("exam")
        .fetch("exam.course", "code, name")
        .fetch("exam.examOwners", "firstName, lastName")
        .fetch("reservation", "id, startAt, endAt")
        .where()
        .eq("reservation.id", id)
        .list

      Ok(enrolments.asJson)
    }

  def getEnrolledExamInfo(code: String, id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      DB.find(classOf[Exam])
        .fetch("course")
        .fetch("course.organisation")
        .fetch("course.gradeScale")
        .fetch("gradeScale")
        .fetch("creator", "firstName, lastName, email")
        .fetch("examLanguages")
        .fetch("examOwners", "firstName, lastName")
        .fetch("examInspections")
        .fetch("examInspections.user")
        .fetch("examType")
        .fetch("executionType")
        .fetch("examinationEventConfigurations")
        .fetch("examinationEventConfigurations.examinationEvent")
        .where()
        .eq("state", Exam.State.PUBLISHED)
        .eq("course.code", code)
        .idEq(id)
        .find match
        case Some(exam) => Ok(exam.asJson)
        case None       => NotFound("i18n_error_exam_not_found")
    }

  private def makeEnrolment(exam: Exam, user: User): ExamEnrolment =
    val enrolment = new ExamEnrolment()
    enrolment.setEnrolledOn(DateTime.now())
    if Option(user.getId).isEmpty then enrolment.setPreEnrolledUserEmail(user.getEmail)
    else enrolment.setUser(user)
    enrolment.setExam(exam)
    enrolment.setRandomDelay()
    enrolment.save()
    enrolment

  def checkIfEnrolled(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      Option(DB.find(classOf[Exam], id)) match
        case None => BadRequest("Exam not found")
        case Some(exam) =>
          val user = request.attrs(Auth.ATTR_USER)
          if enrolmentHandler.isAllowedToParticipate(exam, user) then
            val now = dateTimeHandler.adjustDST(new DateTime())
            val enrolments = DB
              .find(classOf[ExamEnrolment])
              .where()
              .eq("user", user)
              .eq("exam.id", id)
              .gt("exam.periodEnd", now.toDate)
              .disjunction()
              .eq("exam.state", Exam.State.PUBLISHED)
              .eq("exam.state", Exam.State.STUDENT_STARTED)
              .endJunction()
              .list
              .filter(isActive)

            Ok(enrolments.asJson)
          else Unauthorized("i18n_no_trials_left")
    }

  private def isActive(enrolment: ExamEnrolment): Boolean =
    val now  = dateTimeHandler.adjustDST(new DateTime())
    val exam = enrolment.getExam
    if Option(exam).isEmpty || exam.getImplementation == Exam.Implementation.AQUARIUM then
      val reservation = enrolment.getReservation
      Option(reservation).forall(_.getEndAt.isAfter(now))
    else
      val config = enrolment.getExaminationEventConfiguration
      Option(config).forall { c =>
        c.getExaminationEvent.getStart.plusMinutes(exam.getDuration).isAfter(now)
      }

  def removeEnrolment(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val enrolmentOpt =
        if user.hasRole(Role.Name.STUDENT) then
          DB.find(classOf[ExamEnrolment]).fetch("exam").where().idEq(id).eq("user", user).find
        else DB.find(classOf[ExamEnrolment]).fetch("exam").where().idEq(id).find

      enrolmentOpt match
        case None            => NotFound("enrolment not found")
        case Some(enrolment) =>
          // Disallow removing enrolments to private exams created automatically for a student
          if Option(enrolment.getExam).exists(_.isPrivate) then Forbidden("Private exam")
          else if Option(enrolment.getReservation).isDefined || Option(
              enrolment.getExaminationEventConfiguration
            ).isDefined
          then Forbidden("i18n_cancel_reservation_first")
          else
            enrolment.delete()
            Ok
    }

  def updateEnrolment(id: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(validators.validated(EnrolmentInformationValidator)) { request =>
        val info = request.attrs.get(ScalaAttrs.ENROLMENT_INFORMATION)
        val user = request.attrs(Auth.ATTR_USER)
        DB.find(classOf[ExamEnrolment]).where().idEq(id).eq("user", user).find match
          case None => NotFound("enrolment not found")
          case Some(enrolment) =>
            enrolment.setInformation(info.orNull)
            enrolment.update()
            Ok
      }

  private def getExam(eid: Long, execType: ExamExecutionType.Type): Option[Exam] =
    DB.find(classOf[Exam])
      .where()
      .eq("id", eid)
      .disjunction()
      .eq("state", Exam.State.PUBLISHED)
      .ne("executionType.type", ExamExecutionType.Type.PUBLIC.toString)
      .endJunction()
      .eq("executionType.type", execType.toString)
      .find

  private def withTransaction[T](f: Transaction => T): Try[T] =
    val tx = DB.beginTransaction()
    Try {
      val result = f(tx)
      if tx.isActive then tx.commit()
      result
    }.recoverWith { case ex =>
      if tx.isActive then tx.rollback()
      scala.util.Failure(ex)
    }

  private def doCreateEnrolment(eid: Long, execType: ExamExecutionType.Type, user: User): Future[Result] =
    withTransaction { tx =>
      // Take pessimistic lock for user to prevent multiple enrolments creating
      DB.find(classOf[User]).forUpdate().where().eq("id", user.getId).findOne()

      getExam(eid, execType) match
        case None =>
          tx.rollback()
          Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(exam) =>
          // Find existing enrolments for exam and user
          val enrolments = DB
            .find(classOf[ExamEnrolment])
            .fetch("reservation")
            .fetch("examinationEventConfiguration")
            .fetch("examinationEventConfiguration.examinationEvent")
            .where()
            .or()
            .eq("exam.id", exam.getId)
            .eq("exam.parent.id", exam.getId)
            .endOr()
            .list
            .filter { ee =>
              Option(ee.getUser).contains(user) ||
              Option(ee.getPreEnrolledUserEmail).contains(user.getEmail)
            }

          // Already enrolled (regular examination)
          if enrolments.exists(e =>
              e.getExam.getImplementation == Exam.Implementation.AQUARIUM && Option(e.getReservation).isEmpty
            )
          then
            tx.rollback()
            Future.successful(Forbidden("i18n_error_enrolment_exists"))
          // Already enrolled (BYOD examination)
          else if enrolments.exists(e =>
              e.getExam.getImplementation != Exam.Implementation.AQUARIUM && Option(
                e.getExaminationEventConfiguration
              ).isEmpty
            )
          then
            tx.rollback()
            Future.successful(Forbidden("i18n_error_enrolment_exists"))
          // Reservation in effect
          else if enrolments
              .flatMap(e => Option(e.getReservation))
              .exists(r => r.toInterval.contains(dateTimeHandler.adjustDST(DateTime.now(), r)))
          then
            tx.rollback()
            Future.successful(Forbidden("i18n_reservation_in_effect"))
          // Examination event in effect
          else if enrolments.exists { e =>
              Option(e.getExaminationEventConfiguration).exists { config =>
                config.getExaminationEvent
                  .toInterval(e.getExam)
                  .contains(dateTimeHandler.adjustDST(DateTime.now()))
              }
            }
          then
            tx.rollback()
            Future.successful(Forbidden("i18n_reservation_in_effect"))
          else
            // Enrolments with future reservations
            val futureReservations = enrolments.filter { ee =>
              Option(ee.getReservation).exists(_.toInterval.isAfter(dateTimeHandler.adjustDST(DateTime.now())))
            }

            if futureReservations.size > 1 then
              logger.error(s"Several enrolments with future reservations found for user $user and exam ${exam.getId}")
              tx.rollback()
              Future.successful(InternalServerError("Multiple future reservations"))
            // Reservation in the future, replace it
            else if futureReservations.nonEmpty then
              val enrolment   = futureReservations.head
              val reservation = enrolment.getReservation
              tx.commit()
              externalReservationHandler
                .removeReservation(reservation, user, "")
                .map { _ =>
                  enrolment.delete()
                  val newEnrolment = makeEnrolment(exam, user)
                  Ok(newEnrolment.asJson)
                }
            else
              // Enrolments with future examination events
              val futureEvents = enrolments.filter { e =>
                Option(e.getExaminationEventConfiguration).exists { config =>
                  config.getExaminationEvent.toInterval(e.getExam).isAfterNow
                }
              }

              if futureEvents.size > 1 then
                logger.error(
                  s"Several enrolments with future examination events found for user $user and exam ${exam.getId}"
                )
                tx.rollback()
                Future.successful(InternalServerError("Multiple future events"))
              // Examination event in the future, replace it
              else if futureEvents.nonEmpty then
                val enrolment = futureEvents.head
                enrolment.delete()
                val newEnrolment = makeEnrolment(exam, user)
                tx.commit()
                Future.successful(Ok(newEnrolment.asJson))
              // Check for pending external assessment
              else if enrolments.size == 1 then
                val enrolment   = enrolments.head
                val reservation = enrolment.getReservation
                if Option(reservation).exists { r =>
                    Option(r.getExternalRef).isDefined &&
                    !r.getStartAt.isAfter(dateTimeHandler.adjustDST(DateTime.now())) &&
                    !enrolment.isNoShow &&
                    enrolment.getExam.getState == Exam.State.PUBLISHED
                  }
                then
                  tx.rollback()
                  Future.successful(Forbidden("i18n_enrolment_assessment_not_received"))
                else
                  val newEnrolment = makeEnrolment(exam, user)
                  tx.commit()
                  Future.successful(Ok(newEnrolment.asJson))
              else
                val newEnrolment = makeEnrolment(exam, user)
                tx.commit()
                Future.successful(Ok(newEnrolment.asJson))
    } match
      case scala.util.Success(future) => future
      case scala.util.Failure(ex) =>
        logger.error("Error creating enrolment", ex)
        Future.successful(InternalServerError(ex.getMessage))

  private def checkPermission(id: Long, codes: Seq[String], code: String, user: User): Future[Result] =
    if codes.contains(code) then doCreateEnrolment(id, ExamExecutionType.Type.PUBLIC, user)
    else
      logger.warn(s"Attempt to enroll for a course without permission from $user")
      Future.successful(Forbidden("i18n_error_access_forbidden"))

  def createEnrolment(id: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT)))
      .andThen(validators.validated(EnrolmentCourseInformationValidator))
      .async { request =>
        val code = request.attrs(ScalaAttrs.COURSE_CODE)
        val user = request.attrs(Auth.ATTR_USER)
        if !permCheckActive then doCreateEnrolment(id, ExamExecutionType.Type.PUBLIC, user)
        else
          externalCourseHandler
            .getPermittedCourses(user)
            .flatMap(codes => checkPermission(id, codes.toSeq, code, user))
            .recover { case ex: Throwable =>
              InternalServerError(ex.getMessage)
            }
      }

  def createStudentEnrolment(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
      .andThen(validators.validated(StudentEnrolmentValidator))
      .async { request =>
        val uid   = request.attrs.get(ScalaAttrs.USER_ID)
        val email = request.attrs.get(ScalaAttrs.EMAIL)

        Option(DB.find(classOf[Exam], eid)) match
          case None => Future.successful(NotFound("i18n_error_exam_not_found"))
          case Some(exam) =>
            val executionType = ExamExecutionType.Type.valueOf(exam.getExecutionType.getType)
            val userOpt = uid
              .flatMap(id => Option(DB.find(classOf[User], id)))
              .orElse {
                email.flatMap { e =>
                  val users = DB
                    .find(classOf[User])
                    .where()
                    .or()
                    .ieq("email", e)
                    .ieq("eppn", e) // CSCEXAM-34
                    .endOr()
                    .list

                  if users.isEmpty then
                    // Pre-enrolment - check for duplicates
                    val enrolments = DB
                      .find(classOf[ExamEnrolment])
                      .where()
                      .eq("exam.id", eid)
                      .ieq("preEnrolledUserEmail", e)
                      .list

                    if enrolments.isEmpty then
                      val user = new User()
                      user.setEmail(e)
                      Some(user)
                    else None // Already pre-enrolled
                  else if users.size == 1 then Some(users.head)
                  else None // Multiple users with same email
                }
              }

            userOpt match
              case None => Future.successful(BadRequest("user not found or already enrolled"))
              case Some(user) =>
                val sender = request.attrs(Auth.ATTR_USER)
                doCreateEnrolment(eid, executionType, user).map { result =>
                  if exam.getState == Exam.State.PUBLISHED && result.header.status == 200 then
                    actor.scheduler.scheduleOnce(1.second) {
                      emailComposer.composePrivateExamParticipantNotification(user, sender, exam)
                      logger.info(s"Exam participation notification email sent to ${user.getEmail}")
                    }
                  result
                }
      }

  def removeStudentEnrolment(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      DB.find(classOf[ExamEnrolment])
        .where()
        .idEq(id)
        .ne("exam.executionType.type", ExamExecutionType.Type.PUBLIC.toString)
        .isNull("reservation")
        .disjunction()
        .eq("exam.state", Exam.State.DRAFT)
        .eq("exam.state", Exam.State.SAVED)
        .endJunction()
        .find match
        case None => Forbidden("i18n_not_possible_to_remove_participant")
        case Some(enrolment) =>
          if !user.hasRole(Role.Name.ADMIN) && !enrolment.getExam.isOwnedOrCreatedBy(user) then
            Forbidden("i18n_not_possible_to_remove_participant")
          else
            enrolment.delete()
            Ok
    }

  def getRoomInfoFromEnrolment(hash: String): Action[AnyContent] =
    authenticated.async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      enrolmentRepository
        .getRoomInfoForEnrolment(hash, user)
        .map {
          case None => NotFound("Room not found")
          case Some(room) => Ok(room.asJson)
        }
    }

  def addExaminationEventConfig(enrolmentId: Long, configId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val enrolmentOpt = DB
        .find(classOf[ExamEnrolment])
        .where()
        .idEq(enrolmentId)
        .eq("user", user)
        .eq("exam.state", Exam.State.PUBLISHED)
        .find

      enrolmentOpt match
        case None => NotFound("enrolment not found")
        case Some(enrolment) =>
          val configOpt = DB
            .find(classOf[ExaminationEventConfiguration])
            .fetch("examEnrolments")
            .where()
            .idEq(configId)
            .gt("examinationEvent.start", DateTime.now())
            .eq("exam", enrolment.getExam)
            .find

          configOpt match
            case None => NotFound("config not found")
            case Some(config) =>
              val event = config.getExaminationEvent
              if config.getExamEnrolments.size() + 1 > event.getCapacity then
                Forbidden("i18n_error_max_enrolments_reached")
              else
                enrolment.setExaminationEventConfiguration(config)
                enrolment.update()
                actor.scheduler.scheduleOnce(1.second) {
                  emailComposer.composeExaminationEventNotification(user, enrolment, false)
                  logger.info(s"Examination event notification email sent to ${user.getEmail}")
                }
                Ok
    }

  def removeExaminationEventConfig(enrolmentId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      DB.find(classOf[ExamEnrolment])
        .where()
        .idEq(enrolmentId)
        .eq("user", user)
        .eq("exam.state", Exam.State.PUBLISHED)
        .isNotNull("examinationEventConfiguration")
        .find match
        case None => NotFound("enrolment not found")
        case Some(enrolment) =>
          val event = enrolment.getExaminationEventConfiguration.getExaminationEvent
          enrolment.setExaminationEventConfiguration(null)
          enrolment.update()
          actor.scheduler.scheduleOnce(1.second) {
            emailComposer.composeExaminationEventCancellationNotification(user, enrolment.getExam, event)
            logger.info(s"Examination event cancellation notification email sent to ${user.getEmail}")
          }
          Ok
    }

  def removeExaminationEvent(configId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Option(DB.find(classOf[ExaminationEventConfiguration], configId)) match
        case None => BadRequest("Config not found")
        case Some(config) =>
          if config.getExaminationEvent.getStart.isBeforeNow then Forbidden("Event in the past")
          else
            val event = config.getExaminationEvent
            val exam  = config.getExam
            val enrolments = DB
              .find(classOf[ExamEnrolment])
              .fetch("user")
              .where()
              .eq("examinationEventConfiguration.id", configId)
              .eq("exam.state", Exam.State.PUBLISHED)
              .distinct

            enrolments.foreach { e =>
              e.setExaminationEventConfiguration(null)
              e.update()
            }
            config.delete()
            event.delete()

            val users = enrolments.flatMap(e => Option(e.getUser))
            actor.scheduler.scheduleOnce(1.second) {
              emailComposer.composeExaminationEventCancellationNotification(users.asJava.asScala.toSet, exam, event)
              logger.info(s"Examination event cancellation notification email sent to ${enrolments.size} participants")
            }
            Ok
    }

  def permitRetrial(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Option(DB.find(classOf[ExamEnrolment], id)) match
        case None => NotFound("i18n_not_found")
        case Some(enrolment) =>
          enrolment.setRetrialPermitted(true)
          enrolment.update()
          Ok
    }
