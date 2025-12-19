// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.services

import features.iop.transfer.api.ExternalReservationHandler
import io.ebean.{DB, Transaction}
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.enrolment.{ExamEnrolment, ExaminationEventConfiguration}
import models.exam.{Exam, ExamExecutionType}
import models.facility.ExamRoom
import models.user.{Role, User}
import org.joda.time.DateTime
import play.api.Logging
import repository.EnrolmentRepository
import services.config.ConfigReader
import services.datetime.DateTimeHandler
import services.enrolment.EnrolmentHandler
import services.exam.ExternalCourseHandler
import services.mail.EmailComposer

import java.util.Date
import javax.inject.Inject
import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._
import scala.util.Try

class EnrolmentService @Inject() (
    private val emailComposer: EmailComposer,
    private val externalCourseHandler: ExternalCourseHandler,
    private val externalReservationHandler: ExternalReservationHandler,
    private val enrolmentRepository: EnrolmentRepository,
    private val configReader: ConfigReader,
    private val dateTimeHandler: DateTimeHandler,
    private val enrolmentHandler: EnrolmentHandler,
    implicit private val ec: ExecutionContext
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
      .eq("state", Exam.State.PUBLISHED)
      .ge("periodEnd", new Date())
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
      .eq("state", Exam.State.PUBLISHED)
      .eq("course.code", code)
      .idEq(examId)
      .find

  def checkIfEnrolled(examId: Long, user: User): Either[EnrolmentError, List[ExamEnrolment]] =
    Option(DB.find(classOf[Exam], examId)) match
      case None => Left(EnrolmentError.InvalidEnrolment("Exam not found"))
      case Some(exam) =>
        if enrolmentHandler.isAllowedToParticipate(exam, user) then
          val now = dateTimeHandler.adjustDST(new DateTime())
          val enrolments = DB
            .find(classOf[ExamEnrolment])
            .where()
            .eq("user", user)
            .eq("exam.id", examId)
            .gt("exam.periodEnd", now.toDate)
            .disjunction()
            .eq("exam.state", Exam.State.PUBLISHED)
            .eq("exam.state", Exam.State.STUDENT_STARTED)
            .endJunction()
            .list
            .filter(isActive)

          Right(enrolments)
        else Left(EnrolmentError.NoTrialsLeft)

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
        if Option(enrolment.getExam).exists(_.isPrivate) then Left(EnrolmentError.PrivateExam)
        else if Option(enrolment.getReservation).isDefined || Option(
            enrolment.getExaminationEventConfiguration
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
        enrolment.setInformation(information.orNull)
        enrolment.update()
        Right(())

  private def makeEnrolment(exam: Exam, user: User): ExamEnrolment =
    val enrolment = new ExamEnrolment()
    enrolment.setEnrolledOn(DateTime.now())
    if Option(user.getId).isEmpty then enrolment.setPreEnrolledUserEmail(user.getEmail)
    else enrolment.setUser(user)
    enrolment.setExam(exam)
    enrolment.setRandomDelay()
    enrolment.save()
    enrolment

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
      DB.find(classOf[User]).forUpdate().where().eq("id", user.getId).findOne()

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
              e.getExam.getImplementation == Exam.Implementation.AQUARIUM && Option(
                e.getReservation
              ).isEmpty
            )
          then
            tx.rollback()
            Future.successful(Left(EnrolmentError.EnrolmentExists))
          // Already enrolled (BYOD examination)
          else if enrolments.exists(e =>
              e.getExam.getImplementation != Exam.Implementation.AQUARIUM && Option(
                e.getExaminationEventConfiguration
              ).isEmpty
            )
          then
            tx.rollback()
            Future.successful(Left(EnrolmentError.EnrolmentExists))
          // Reservation in effect
          else if enrolments
              .flatMap(e => Option(e.getReservation))
              .exists(r => r.toInterval.contains(dateTimeHandler.adjustDST(DateTime.now(), r)))
          then
            tx.rollback()
            Future.successful(Left(EnrolmentError.ReservationInEffect))
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
            Future.successful(Left(EnrolmentError.ReservationInEffect))
          else
            // Enrolments with future reservations
            val futureReservations = enrolments.filter { ee =>
              Option(ee.getReservation).exists(
                _.toInterval.isAfter(dateTimeHandler.adjustDST(DateTime.now()))
              )
            }

            if futureReservations.size > 1 then
              logger.error(
                s"Several enrolments with future reservations found for user $user and exam ${exam.getId}"
              )
              tx.rollback()
              Future.successful(Left(EnrolmentError.MultipleFutureReservations))
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
                  Right(newEnrolment)
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
                val reservation = enrolment.getReservation
                if Option(reservation).exists { r =>
                    Option(r.getExternalRef).isDefined &&
                    !r.getStartAt.isAfter(dateTimeHandler.adjustDST(DateTime.now())) &&
                    !enrolment.isNoShow &&
                    enrolment.getExam.getState == Exam.State.PUBLISHED
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
      case scala.util.Success(future) => future
      case scala.util.Failure(ex) =>
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
        val executionType = ExamExecutionType.Type.valueOf(exam.getExecutionType.getType)
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
                  user.setEmail(e)
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
                if exam.getState == Exam.State.PUBLISHED then
                  emailComposer.scheduleEmail(1.second) {
                    emailComposer.composePrivateExamParticipantNotification(user, sender, exam)
                    logger.info(s"Exam participation notification email sent to ${user.getEmail}")
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
      .eq("exam.state", Exam.State.DRAFT)
      .eq("exam.state", Exam.State.SAVED)
      .endJunction()
      .find match
      case None => Left(EnrolmentError.NotPossibleToRemoveParticipant)
      case Some(enrolment) =>
        if !user.hasRole(Role.Name.ADMIN) && !enrolment.getExam.isOwnedOrCreatedBy(user) then
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
      .eq("exam.state", Exam.State.PUBLISHED)
      .find

    enrolmentOpt match
      case None => Left(EnrolmentError.EnrolmentNotFound)
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
          case None => Left(EnrolmentError.ConfigNotFound)
          case Some(config) =>
            val event = config.getExaminationEvent
            if config.getExamEnrolments.size() + 1 > event.getCapacity then
              Left(EnrolmentError.MaxEnrolmentsReached)
            else
              enrolment.setExaminationEventConfiguration(config)
              enrolment.update()
              emailComposer.scheduleEmail(1.second) {
                emailComposer.composeExaminationEventNotification(user, enrolment, false)
                logger.info(s"Examination event notification email sent to ${user.getEmail}")
              }
              Right(())

  def removeExaminationEventConfig(enrolmentId: Long, user: User): Either[EnrolmentError, Unit] =
    DB.find(classOf[ExamEnrolment])
      .where()
      .idEq(enrolmentId)
      .eq("user", user)
      .eq("exam.state", Exam.State.PUBLISHED)
      .isNotNull("examinationEventConfiguration")
      .find match
      case None => Left(EnrolmentError.EnrolmentNotFound)
      case Some(enrolment) =>
        val event = enrolment.getExaminationEventConfiguration.getExaminationEvent
        enrolment.setExaminationEventConfiguration(null)
        enrolment.update()
        emailComposer.scheduleEmail(1.second) {
          emailComposer.composeExaminationEventCancellationNotification(
            user,
            enrolment.getExam,
            event
          )
          logger.info(s"Examination event cancellation notification email sent to ${user.getEmail}")
        }
        Right(())

  def removeExaminationEvent(configId: Long): Either[EnrolmentError, Unit] =
    Option(DB.find(classOf[ExaminationEventConfiguration], configId)) match
      case None => Left(EnrolmentError.ConfigNotFound)
      case Some(config) =>
        if config.getExaminationEvent.getStart.isBeforeNow then Left(EnrolmentError.EventInPast)
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
        enrolment.setRetrialPermitted(true)
        enrolment.update()
        Right(())
