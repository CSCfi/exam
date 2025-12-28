// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.facility.ExamRoom
import models.sections.ExamSection
import models.user.User
import org.joda.time.DateTime
import play.api.Logging
import security.BlockingIOExecutionContext
import services.datetime.{CalendarHandler, CalendarHandlerError, DateTimeHandler}
import services.enrolment.EnrolmentHandler
import services.mail.EmailComposer

import javax.inject.Inject
import scala.concurrent.Future
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.Using

/** Service for collaborative calendar operations
  *
  * Handles reservations, slots, and enrolment checks for collaborative exams.
  */
class CollaborativeCalendarService @Inject() (
    collaborativeExamService: CollaborativeExamService,
    examLoader: CollaborativeExamLoaderService,
    calendarHandler: CalendarHandler,
    dateTimeHandler: DateTimeHandler,
    enrolmentHandler: EnrolmentHandler,
    emailComposer: EmailComposer,
    private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with Logging:
  implicit private val executionContext: BlockingIOExecutionContext = ec

  /** Get exam information for a collaborative exam
    *
    * @param id
    *   the collaborative exam ID
    * @return
    *   Future containing Some(Exam) if found, None otherwise
    */
  def getExamInfo(id: Long): Future[Option[Exam]] =
    collaborativeExamService.findById(id).flatMap {
      case None     => Future.successful(None)
      case Some(ce) => examLoader.downloadExam(ce)
    }

  /** Check if an enrolment is valid for reservation changes
    *
    * @param enrolment
    *   the enrolment to check
    * @param exam
    *   the exam
    * @param user
    *   the user
    * @return
    *   Some(error message) if invalid, None if valid
    */
  private def checkEnrolmentValidity(
      enrolment: ExamEnrolment,
      exam: Exam,
      user: User
  ): Option[String] =
    val oldReservation = Option(enrolment.getReservation)

    if exam.getState == Exam.State.STUDENT_STARTED ||
      (oldReservation.isDefined && oldReservation.get.toInterval.isBefore(DateTime.now()))
    then Some("i18n_reservation_in_effect")
    else if oldReservation.isEmpty && !enrolmentHandler.isAllowedToParticipate(exam, user) then
      Some("i18n_no_trials_left")
    else None

  /** Find an enrolment for a user and collaborative exam
    *
    * @param examId
    *   the collaborative exam ID
    * @param userId
    *   the user ID
    * @param now
    *   the current time (adjusted for DST)
    * @return
    *   Future containing Some(ExamEnrolment) if found, None otherwise
    */
  def findEnrolment(examId: Long, userId: Long, now: DateTime): Future[Option[ExamEnrolment]] =
    Future(
      DB.find(classOf[ExamEnrolment])
        .fetch("reservation")
        .where()
        .eq("user.id", userId)
        .eq("collaborativeExam.id", examId)
        .disjunction()
        .isNull("reservation")
        .gt("reservation.startAt", now.toDate)
        .endJunction()
        .find
    )(using ec)

  /** Create a reservation for a collaborative exam
    *
    * @param examId
    *   the collaborative exam ID
    * @param roomId
    *   the room ID
    * @param userId
    *   the user ID
    * @param start
    *   reservation start time
    * @param end
    *   reservation end time
    * @param aids
    *   accessibility IDs
    * @param sectionIds
    *   optional section IDs
    * @return
    *   Future containing Either[error message, (ExamEnrolment, Reservation)]
    */
  def createReservation(
      examId: Long,
      roomId: Long,
      userId: Long,
      start: DateTime,
      end: DateTime,
      aids: Seq[Long],
      sectionIds: Seq[Long]
  ): Future[Either[String, (ExamEnrolment, Reservation)]] =
    val room = DB.find(classOf[ExamRoom], roomId)
    val now  = dateTimeHandler.adjustDST(DateTime.now(), room)

    (for
        ceOpt <- collaborativeExamService.findById(examId)
        ce <- ceOpt match
          case None     => Future.failed(new IllegalArgumentException("Exam not found"))
          case Some(ce) => Future.successful(ce)
        enrolmentOpt <- findEnrolment(examId, userId, now)
        enrolment <- enrolmentOpt match
          case None    => Future.failed(new IllegalArgumentException("Enrolment not found"))
          case Some(e) => Future.successful(e)
        examOpt <- examLoader.downloadExam(ce)
        exam <- examOpt match
          case None    => Future.failed(new IllegalArgumentException("Exam not found"))
          case Some(e) => Future.successful(e)
      yield checkEnrolmentValidity(enrolment, exam, enrolment.getUser) match
        case Some(error) => Left(error)
        case None =>
          calendarHandler.getRandomMachine(room, exam, start, end, aids) match
            case None          => Left("i18n_no_machines_available")
            case Some(machine) =>
              // Start transaction
              Using(DB.beginTransaction()) { tx =>
                // Take pessimistic lock for user
                DB.find(classOf[User]).forUpdate().where().eq("id", userId).findOne()

                val oldReservation = enrolment.getReservation
                val reservation =
                  calendarHandler.createReservation(start, end, machine, enrolment.getUser)

                // Remove old reservation if any
                if Option(oldReservation).isDefined then
                  enrolment.setReservation(null)
                  enrolment.update()
                  oldReservation.delete()

                // Set new reservation
                reservation.save()
                enrolment.setReservation(reservation)
                enrolment.setReservationCanceled(false)

                // Set optional sections
                val sections =
                  if sectionIds.isEmpty then Set.empty[ExamSection]
                  else
                    DB.find(classOf[ExamSection])
                      .where()
                      .idIn(sectionIds.asJava)
                      .distinct

                enrolment.setOptionalSections(sections.asJava)
                enrolment.save()

                tx.commit()

                // Send email notification
                emailComposer.scheduleEmail(1.second) {
                  emailComposer.composeReservationNotification(
                    enrolment.getUser,
                    reservation,
                    exam,
                    false
                  )
                  logger.info(
                    f"Reservation confirmation email sent to ${enrolment.getUser.getEmail}"
                  )
                }

                Right((enrolment, reservation))
              }.get // Extract from Try
    ).recoverWith { case e: IllegalArgumentException => Future.successful(Left(e.getMessage)) }

  /** Get available slots for a collaborative exam
    *
    * @param examId
    *   the collaborative exam ID
    * @param roomId
    *   the room ID
    * @param day
    *   the day string
    * @param aids
    *   accessibility IDs
    * @param userId
    *   the user ID
    * @return
    *   Future containing Either[error message, JsValue with slots]
    */
  def getSlots(
      examId: Long,
      roomId: Long,
      day: String,
      aids: Option[Seq[Long]],
      userId: Long
  ): Future[Either[String, play.api.libs.json.JsValue]] =
    val now = dateTimeHandler.adjustDST(DateTime.now())

    (for
      ceOpt <- collaborativeExamService.findById(examId)
      ce <- ceOpt match
        case None     => Future.failed(new IllegalArgumentException("i18n_error_exam_not_found"))
        case Some(ce) => Future.successful(ce)
      enrolmentOpt <- findEnrolment(examId, userId, now)
      _ <- enrolmentOpt match
        case None => Future.failed(new IllegalArgumentException("i18n_error_enrolment_not_found"))
        case Some(_) => Future.successful(())
      examOpt <- examLoader.downloadExam(ce)
      exam <- examOpt match
        case None    => Future.failed(new IllegalArgumentException("i18n_error_exam_not_found"))
        case Some(e) => Future.successful(e)
    yield
      if !exam.hasState(Exam.State.PUBLISHED) then
        Left("i18n_error_exam_not_found")
      else
        val user             = DB.find(classOf[User], userId)
        val accessibilityIds = aids.getOrElse(Seq.empty)
        calendarHandler.getSlots(user, exam, roomId, day, accessibilityIds) match
          case Right(json) => Right(json)
          case Left(CalendarHandlerError.RoomNotFound(_)) =>
            Left("i18n_error_enrolment_not_found")
    ).recoverWith { case e: IllegalArgumentException => Future.successful(Left(e.getMessage)) }
