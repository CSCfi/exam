// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import database.{EbeanQueryExtensions, EbeanTransactions}
import io.ebean.DB
import models.enrolment.ExamEnrolment
import models.exam.{Exam, ExamExecutionType}
import models.iop.CollaborativeExam
import models.user.User
import org.joda.time.DateTime
import play.api.Logging
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.datetime.DateTimeHandler
import services.enrolment.EnrolmentHandler

import javax.inject.Inject
import scala.concurrent.Future

/** Service for collaborative exam enrolment operations
  *
  * Handles enrolment creation, validation, and checks for collaborative exams.
  */
class CollaborativeEnrolmentService @Inject() (
    collaborativeExamService: CollaborativeExamService,
    examLoader: CollaborativeExamLoaderService,
    configReader: ConfigReader,
    dateTimeHandler: DateTimeHandler,
    enrolmentHandler: EnrolmentHandler,
    private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with Logging:
  implicit private val executionContext: BlockingIOExecutionContext = ec

  /** Check if an exam is enrollable
    *
    * @param exam
    *   the exam to check
    * @param homeOrg
    *   the home organisation reference
    * @return
    *   true if enrollable, false otherwise
    */
  def isEnrollable(exam: Exam, homeOrg: String): Boolean =
    val orgCheck = Option(exam.getOrganisations) match
      case None => true
      case Some(orgs) =>
        val organisations = orgs.split(";")
        organisations.contains(homeOrg)

    orgCheck &&
    exam.getState == Exam.State.PUBLISHED &&
    exam.getExecutionType.getType == ExamExecutionType.Type.PUBLIC.toString &&
    Option(exam.getPeriodEnd).isDefined &&
    exam.getPeriodEnd.isAfterNow

  /** Check if a user can enroll in an exam
    *
    * @param exam
    *   the exam
    * @param user
    *   the user
    * @param homeOrg
    *   the home organisation reference
    * @return
    *   Either error message or the exam
    */
  private def checkExamEnrollability(
      exam: Option[Exam],
      user: User,
      homeOrg: String
  ): Either[String, Exam] =
    exam match
      case None                                 => Left("i18n_error_exam_not_found")
      case Some(e) if !isEnrollable(e, homeOrg) => Left("i18n_error_exam_not_found")
      case Some(e) if !enrolmentHandler.isAllowedToParticipate(e, user) =>
        Left("i18n_no_trials_left")
      case Some(e) => Right(e)

  /** Check if user is enrolled in a collaborative exam
    *
    * @param examId
    *   the collaborative exam ID
    * @param userId
    *   the user ID
    * @return
    *   Future containing list of enrolments
    */
  def checkIfEnrolled(examId: Long, userId: Long): Future[Either[String, Seq[ExamEnrolment]]] =
    (for
      ceOpt <- collaborativeExamService.findById(examId)
      ce <- ceOpt match
        case None     => Future.failed(new IllegalArgumentException("i18n_error_exam_not_found"))
        case Some(ce) => Future.successful(ce)
      examOpt <- examLoader.downloadExam(ce)
    yield
      val user = DB.find(classOf[User], userId)
      checkExamEnrollability(examOpt, user, configReader.getHomeOrganisationRef) match
        case Left(error) => Left(error)
        case Right(_) =>
          val now = dateTimeHandler.adjustDST(DateTime.now())
          val enrolments = DB
            .find(classOf[ExamEnrolment])
            .where()
            .eq("user", user)
            .eq("collaborativeExam.id", examId)
            .disjunction()
            .gt("reservation.endAt", now.toDate)
            .isNull("reservation")
            .endJunction()
            .or()
            .isNull("exam")
            .eq("exam.state", Exam.State.STUDENT_STARTED)
            .endOr()
            .list
          Right(enrolments)
    ).recoverWith { case e: IllegalArgumentException => Future.successful(Left(e.getMessage)) }

  /** Create an enrolment for a collaborative exam
    *
    * @param examId
    *   the collaborative exam ID
    * @param userId
    *   the user ID
    * @return
    *   Future containing Either[error message, ExamEnrolment]
    */
  def createEnrolment(examId: Long, userId: Long): Future[Either[String, ExamEnrolment]] =
    val user    = DB.find(classOf[User], userId)
    val homeOrg = configReader.getHomeOrganisationRef

    (for
      ceOpt <- collaborativeExamService.findById(examId)
      ce <- ceOpt match
        case None     => Future.failed(new IllegalArgumentException("i18n_error_exam_not_found"))
        case Some(ce) => Future.successful(ce)
      examOpt <- examLoader.downloadExam(ce)
    yield checkExamEnrollability(examOpt, user, homeOrg) match
      case Left(error) => Left(error)
      case Right(exam) =>
        if !enrolmentHandler.isAllowedToParticipate(exam, user) then
          Left("i18n_no_trials_left")
        else
          doCreateEnrolment(ce, user) match
            case Left(error)      => Left(error)
            case Right(enrolment) => Right(enrolment)
    ).recoverWith { case e: IllegalArgumentException => Future.successful(Left(e.getMessage)) }

  private def makeEnrolment(exam: CollaborativeExam, user: User): ExamEnrolment =
    val enrolment = new ExamEnrolment()
    enrolment.setEnrolledOn(DateTime.now())
    enrolment.setUser(user)
    enrolment.setCollaborativeExam(exam)
    enrolment.setRandomDelay()
    enrolment.save()
    enrolment

  private def handleFutureReservations(
      enrolments: Seq[ExamEnrolment],
      user: User,
      ce: CollaborativeExam
  ): Option[ExamEnrolment] =
    val now = dateTimeHandler.adjustDST(DateTime.now())
    val futureReservations = enrolments.filter { ee =>
      Option(ee.getReservation).exists(_.toInterval.isAfter(now))
    }

    if futureReservations.size > 1 then
      logger.error(
        s"Several enrolments with future reservations found for user $user and collaborative exam ${ce.getId}"
      )
      None
    else if futureReservations.nonEmpty then
      futureReservations.head.delete()
      Some(makeEnrolment(ce, user))
    else None

  private def doCreateEnrolment(ce: CollaborativeExam, user: User): Either[String, ExamEnrolment] =
    EbeanTransactions.withTransaction { tx =>
      // Take pessimistic lock for user to prevent multiple enrolments creating
      DB.find(classOf[User]).forUpdate().where().eq("id", user.getId).findOne()

      val enrolments = DB
        .find(classOf[ExamEnrolment])
        .fetch("reservation")
        .where()
        .eq("user.id", user.getId)
        .eq("collaborativeExam.id", ce.getId)
        .list

      // already enrolled
      if enrolments.exists(_.getReservation == null) then
        tx.rollback()
        Left("i18n_error_enrolment_exists")
      // reservation in effect
      else if enrolments
          .flatMap(e => Option(e.getReservation))
          .exists(r => r.toInterval.contains(dateTimeHandler.adjustDST(DateTime.now(), r)))
      then
        tx.rollback()
        Left("i18n_reservation_in_effect")
      else
        val enrolment = handleFutureReservations(enrolments, user, ce) match
          case Some(newEnrolment) => newEnrolment
          case None               => makeEnrolment(ce, user)
        tx.commit()
        Right(enrolment)
    }
