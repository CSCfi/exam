// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.iop.transfer.services.ExternalReservationHandlerService
import io.ebean.{DB, Transaction}
import models.enrolment.{ExamEnrolment, ExaminationEventConfiguration}
import models.exam.*
import models.facility.ExamRoom
import models.user.{Role, User}
import play.api.Logging
import repository.EnrolmentRepository
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.datetime.AppClock
import services.enrolment.EnrolmentHandler
import services.exam.ExternalCourseHandler
import services.mail.EmailComposer

import java.time.{Duration, Instant}
import javax.inject.Inject
import scala.concurrent.Future
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try}

class EnrolmentService @Inject() (
    private val emailComposer: EmailComposer,
    private val externalCourseHandler: ExternalCourseHandler,
    private val externalReservationHandler: ExternalReservationHandlerService,
    private val enrolmentRepository: EnrolmentRepository,
    private val configReader: ConfigReader,
    private val enrolmentHandler: EnrolmentHandler,
    private val clock: AppClock,
    implicit private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  private val permCheckActive = configReader.isEnrolmentPermissionCheckActive

  def listEnrolledExams(code: String): List[Exam] =
    DB.find(classOf[Exam])
      .fetch("creator", "firstName, lastName")
      .fetch("examLanguages")
      .fetch("examOwners", "firstName, lastName")
      .fetch("examInspections.user", "firstName, lastName")
      .fetch("course", "code, name")
      .where()
      .eq("course.code", code)
      .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString)
      .eq("state", ExamState.PUBLISHED)
      .ge("periodEnd", Instant.now())
      .list

  def enrolmentsByReservation(reservationId: Long): List[ExamEnrolment] =
    DB.find(classOf[ExamEnrolment])
      .fetch("user", "firstName, lastName, email")
      .fetch("exam")
      .fetch("exam.course", "code, name")
      .fetch("exam.examOwners", "firstName, lastName")
      .fetch("reservation", "id, startAt, endAt")
      .where()
      .eq("reservation.id", reservationId)
      .list

  def getEnrolledExamInfo(code: String, examId: Long): Option[Exam] =
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
      .eq("state", ExamState.PUBLISHED)
      .eq("course.code", code)
      .idEq(examId)
      .find

  def checkIfEnrolled(examId: Long, user: User): Either[EnrolmentError, List[ExamEnrolment]] =
    Option(DB.find(classOf[Exam], examId)) match
      case None => Left(EnrolmentError.InvalidEnrolment("Exam not found"))
      case Some(exam) =>
        if enrolmentHandler.isAllowedToParticipate(exam, user) then
          val enrolments = DB
            .find(classOf[ExamEnrolment])
            .where()
            .eq("user", user)
            .eq("exam.id", examId)
            .gt("exam.periodEnd", clock.now())
            .disjunction()
            .eq("exam.state", ExamState.PUBLISHED)
            .eq("exam.state", ExamState.STUDENT_STARTED)
            .endJunction()
            .list
            .filter(isActive)

          Right(enrolments)
        else Left(EnrolmentError.NoTrialsLeft)

  private def isActive(enrolment: ExamEnrolment): Boolean =
    val now  = clock.now()
    val exam = enrolment.exam
    if Option(exam).isEmpty || exam.implementation == ExamImplementation.AQUARIUM then
      val reservation = enrolment.reservation
      Option(reservation).forall(_.endAt.isAfter(now))
    else
      val config = enrolment.examinationEventConfiguration
      Option(config).forall { c =>
        c.examinationEvent.start.plus(Duration.ofMinutes(exam.duration.toLong)).isAfter(now)
      }

  def removeEnrolment(enrolmentId: Long, user: User): Either[EnrolmentError, Unit] =
    val enrolmentOpt =
      if user.hasRole(Role.Name.STUDENT) then
        DB.find(classOf[ExamEnrolment]).fetch("exam").where().idEq(enrolmentId).eq(
          "user",
          user
        ).find
      else DB.find(classOf[ExamEnrolment]).fetch("exam").where().idEq(enrolmentId).find

    enrolmentOpt match
      case None            => Left(EnrolmentError.EnrolmentNotFound)
      case Some(enrolment) =>
        // Disallow removing enrolments to private exams created automatically for a student
        if Option(enrolment.exam).exists(_.isPrivate) then Left(EnrolmentError.PrivateExam)
        else if Option(enrolment.reservation).isDefined || Option(
            enrolment.examinationEventConfiguration
          ).isDefined
        then Left(EnrolmentError.CancelReservationFirst)
        else
          enrolment.delete()
          Right(())

  def updateEnrolment(
      enrolmentId: Long,
      user: User,
      information: Option[String]
  ): Either[EnrolmentError, Unit] =
    DB.find(classOf[ExamEnrolment]).where().idEq(enrolmentId).eq("user", user).find match
      case None => Left(EnrolmentError.EnrolmentNotFound)
      case Some(enrolment) =>
        enrolment.information = information.orNull
        enrolment.update()
        Right(())

  private def makeEnrolment(exam: Exam, user: User): ExamEnrolment =
    val enrolment = new ExamEnrolment()
    enrolment.enrolledOn = clock.now()
    if user.id == 0 then enrolment.preEnrolledUserEmail = user.email
    else enrolment.user = user
    enrolment.exam = exam
    enrolment.setRandomDelay()
    enrolment.save()
    enrolment

  private def getExam(eid: Long, execType: ExamExecutionType.Type): Option[Exam] =
    DB.find(classOf[Exam])
      .where()
      .eq("id", eid)
      .disjunction()
      .eq("state", ExamState.PUBLISHED)
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

  def createEnrolment(
      examId: Long,
      execType: ExamExecutionType.Type,
      user: User,
      courseCode: Option[String]
  ): Future[Either[EnrolmentError, ExamEnrolment]] =
    if permCheckActive && courseCode.isDefined then
      externalCourseHandler
        .getPermittedCourses(user)
        .flatMap { codes =>
          if codes.contains(courseCode.get) then doCreateEnrolment(examId, execType, user)
          else
            logger.warn(s"Attempt to enroll for a course without permission from $user")
            Future.successful(Left(EnrolmentError.AccessForbidden))
        }
        .recover { case ex: Throwable =>
          logger.error("Error checking permissions", ex)
          Left(EnrolmentError.AccessForbidden)
        }
    else doCreateEnrolment(examId, execType, user)

  private def doCreateEnrolment(
      eid: Long,
      execType: ExamExecutionType.Type,
      user: User
  ): Future[Either[EnrolmentError, ExamEnrolment]] =
    withTransaction { tx =>
      // Take pessimistic lock for user to prevent multiple enrolments creating
      DB.find(classOf[User]).forUpdate().where().eq("id", user.id).findOne()

      getExam(eid, execType) match
        case None =>
          tx.rollback()
          Future.successful(Left(EnrolmentError.ExamNotFound))
        case Some(exam) =>
          // Find existing enrolments for exam and user
          val enrolments = DB
            .find(classOf[ExamEnrolment])
            .fetch("reservation")
            .fetch("examinationEventConfiguration")
            .fetch("examinationEventConfiguration.examinationEvent")
            .where()
            .or()
            .eq("exam.id", exam.id)
            .eq("exam.parent.id", exam.id)
            .endOr()
            .list
            .filter { ee =>
              Option(ee.user).contains(user) ||
              Option(ee.preEnrolledUserEmail).contains(user.email)
            }

          // Already enrolled (regular examination)
          if enrolments.exists(e =>
              e.exam.implementation == ExamImplementation.AQUARIUM && Option(
                e.reservation
              ).isEmpty
            )
          then
            tx.rollback()
            Future.successful(Left(EnrolmentError.EnrolmentExists))
          // Already enrolled (BYOD examination)
          else if enrolments.exists(e =>
              e.exam.implementation != ExamImplementation.AQUARIUM && Option(
                e.examinationEventConfiguration
              ).isEmpty
            )
          then
            tx.rollback()
            Future.successful(Left(EnrolmentError.EnrolmentExists))
          // Reservation in effect
          else if enrolments
              .flatMap(e => Option(e.reservation))
              .exists(r => r.toInterval.contains(clock.now()))
          then
            tx.rollback()
            Future.successful(Left(EnrolmentError.ReservationInEffect))
          // Examination event in effect
          else if enrolments.exists { e =>
              Option(e.examinationEventConfiguration).exists { config =>
                config.examinationEvent
                  .toInterval(e.exam)
                  .contains(clock.now())
              }
            }
          then
            tx.rollback()
            Future.successful(Left(EnrolmentError.ReservationInEffect))
          else
            // Enrolments with future reservations
            val futureReservations = enrolments.filter { ee =>
              Option(ee.reservation).exists(
                _.toInterval.isAfter(clock.now())
              )
            }

            if futureReservations.size > 1 then
              logger.error(
                s"Several enrolments with future reservations found for user $user and exam ${exam.id}"
              )
              tx.rollback()
              Future.successful(Left(EnrolmentError.MultipleFutureReservations))
            // Reservation in the future, replace it
            else if futureReservations.nonEmpty then
              val enrolment   = futureReservations.head
              val reservation = enrolment.reservation
              tx.commit()
              externalReservationHandler
                .removeReservation(reservation, user, "")
                .map { _ =>
                  enrolment.delete()
                  val newEnrolment = makeEnrolment(exam, user)
                  Right(newEnrolment)
                }
            else
              // Enrolments with future examination events
              val futureEvents = enrolments.filter { e =>
                Option(e.examinationEventConfiguration).exists { config =>
                  config.examinationEvent.toInterval(e.exam).isAfterNow
                }
              }

              if futureEvents.size > 1 then
                logger.error(
                  s"Several enrolments with future examination events found for user $user and exam ${exam.id}"
                )
                tx.rollback()
                Future.successful(Left(EnrolmentError.MultipleFutureEvents))
              // Examination event in the future, replace it
              else if futureEvents.nonEmpty then
                val enrolment = futureEvents.head
                enrolment.delete()
                val newEnrolment = makeEnrolment(exam, user)
                tx.commit()
                Future.successful(Right(newEnrolment))
              // Check for pending external assessment
              else if enrolments.size == 1 then
                val enrolment   = enrolments.head
                val reservation = enrolment.reservation
                if Option(reservation).exists { r =>
                    Option(r.externalRef).isDefined &&
                    !r.startAt.isAfter(clock.now()) &&
                    !enrolment.noShow &&
                    enrolment.exam.state == ExamState.PUBLISHED
                  }
                then
                  tx.rollback()
                  Future.successful(Left(EnrolmentError.AssessmentNotReceived))
                else
                  val newEnrolment = makeEnrolment(exam, user)
                  tx.commit()
                  Future.successful(Right(newEnrolment))
              else
                val newEnrolment = makeEnrolment(exam, user)
                tx.commit()
                Future.successful(Right(newEnrolment))
    } match
      case Success(future) => future
      case Failure(ex) =>
        logger.error("Error creating enrolment", ex)
        Future.successful(Left(EnrolmentError.InvalidEnrolment(ex.getMessage)))

  def createStudentEnrolment(
      examId: Long,
      userId: Option[Long],
      email: Option[String],
      sender: User
  ): Future[Either[EnrolmentError, ExamEnrolment]] =
    Option(DB.find(classOf[Exam], examId)) match
      case None => Future.successful(Left(EnrolmentError.ExamNotFound))
      case Some(exam) =>
        val executionType = ExamExecutionType.Type.valueOf(exam.executionType.`type`)
        val userOpt = userId
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
                  .eq("exam.id", examId)
                  .ieq("preEnrolledUserEmail", e)
                  .list

                if enrolments.isEmpty then
                  val user = new User()
                  user.email = e
                  Some(user)
                else None // Already pre-enrolled
              else if users.size == 1 then Some(users.head)
              else None // Multiple users with same email
            }
          }

        userOpt match
          case None => Future.successful(Left(EnrolmentError.UserNotFoundOrAlreadyEnrolled))
          case Some(user) =>
            doCreateEnrolment(examId, executionType, user).map {
              case Right(enrolment) =>
                if exam.state == ExamState.PUBLISHED then
                  emailComposer.scheduleEmail(1.second) {
                    emailComposer.composePrivateExamParticipantNotification(user, sender, exam)
                    logger.info(s"Exam participation notification email sent to ${user.email}")
                  }
                Right(enrolment)
              case Left(error) => Left(error)
            }

  def removeStudentEnrolment(enrolmentId: Long, user: User): Either[EnrolmentError, Unit] =
    DB.find(classOf[ExamEnrolment])
      .where()
      .idEq(enrolmentId)
      .ne("exam.executionType.type", ExamExecutionType.Type.PUBLIC.toString)
      .isNull("reservation")
      .disjunction()
      .eq("exam.state", ExamState.DRAFT)
      .eq("exam.state", ExamState.SAVED)
      .endJunction()
      .find match
      case None => Left(EnrolmentError.NotPossibleToRemoveParticipant)
      case Some(enrolment) =>
        if !user.hasRole(Role.Name.ADMIN) && !enrolment.exam.isOwnedOrCreatedBy(user) then
          Left(EnrolmentError.NotPossibleToRemoveParticipant)
        else
          enrolment.delete()
          Right(())

  def getRoomInfoFromEnrolment(hash: String, user: User): Future[Option[ExamRoom]] =
    enrolmentRepository.getRoomInfoForEnrolment(hash, user)

  def addExaminationEventConfig(
      enrolmentId: Long,
      configId: Long,
      user: User
  ): Either[EnrolmentError, Unit] =
    val enrolmentOpt = DB
      .find(classOf[ExamEnrolment])
      .where()
      .idEq(enrolmentId)
      .eq("user", user)
      .eq("exam.state", ExamState.PUBLISHED)
      .find

    enrolmentOpt match
      case None => Left(EnrolmentError.EnrolmentNotFound)
      case Some(enrolment) =>
        val configOpt = DB
          .find(classOf[ExaminationEventConfiguration])
          .fetch("examEnrolments")
          .where()
          .idEq(configId)
          .gt("examinationEvent.start", clock.now())
          .eq("exam", enrolment.exam)
          .find

        configOpt match
          case None => Left(EnrolmentError.ConfigNotFound)
          case Some(config) =>
            val event = config.examinationEvent
            if config.examEnrolments.size() + 1 > event.capacity then
              Left(EnrolmentError.MaxEnrolmentsReached)
            else
              enrolment.examinationEventConfiguration = config
              enrolment.update()
              emailComposer.scheduleEmail(1.second) {
                emailComposer.composeExaminationEventNotification(user, enrolment, false)
                logger.info(s"Examination event notification email sent to ${user.email}")
              }
              Right(())

  def removeExaminationEventConfig(enrolmentId: Long, user: User): Either[EnrolmentError, Unit] =
    DB.find(classOf[ExamEnrolment])
      .where()
      .idEq(enrolmentId)
      .eq("user", user)
      .eq("exam.state", ExamState.PUBLISHED)
      .isNotNull("examinationEventConfiguration")
      .find match
      case None => Left(EnrolmentError.EnrolmentNotFound)
      case Some(enrolment) =>
        val event = enrolment.examinationEventConfiguration.examinationEvent
        enrolment.examinationEventConfiguration = null
        enrolment.update()
        emailComposer.scheduleEmail(1.second) {
          emailComposer.composeExaminationEventCancellationNotification(
            user,
            enrolment.exam,
            event
          )
          logger.info(s"Examination event cancellation notification email sent to ${user.email}")
        }
        Right(())

  def removeExaminationEvent(configId: Long): Either[EnrolmentError, Unit] =
    Option(DB.find(classOf[ExaminationEventConfiguration], configId)) match
      case None => Left(EnrolmentError.ConfigNotFound)
      case Some(config) =>
        if config.examinationEvent.start.isBefore(Instant.now()) then
          Left(EnrolmentError.EventInPast)
        else
          val event = config.examinationEvent
          val exam  = config.exam
          val enrolments = DB
            .find(classOf[ExamEnrolment])
            .fetch("user")
            .where()
            .eq("examinationEventConfiguration.id", configId)
            .eq("exam.state", ExamState.PUBLISHED)
            .distinct

          enrolments.foreach { e =>
            e.examinationEventConfiguration = null
            e.update()
          }
          config.delete()
          event.delete()

          val users = enrolments.flatMap(e => Option(e.user))
          emailComposer.scheduleEmail(1.second) {
            emailComposer.composeExaminationEventCancellationNotification(
              users.asJava.asScala.toSet,
              exam,
              event
            )
            logger.info(
              s"Examination event cancellation notification email sent to ${enrolments.size} participants"
            )
          }
          Right(())

  def permitRetrial(enrolmentId: Long): Either[EnrolmentError, Unit] =
    Option(DB.find(classOf[ExamEnrolment], enrolmentId)) match
      case None => Left(EnrolmentError.EnrolmentNotFound)
      case Some(enrolment) =>
        enrolment.retrialPermitted = true
        enrolment.update()
        Right(())
