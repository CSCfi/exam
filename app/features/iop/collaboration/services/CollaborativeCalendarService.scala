// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import cats.data.EitherT
import database.EbeanPaths.path
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.exam.ExamState
import models.facility.ExamRoom
import models.sections.ExamSection
import models.user.User
import play.api.Logging
import play.api.libs.json.{JsObject, JsValue, Json}
import security.BlockingIOExecutionContext
import services.datetime.*
import services.enrolment.EnrolmentHandler
import services.mail.EmailComposer

import java.time.Instant
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
    enrolmentHandler: EnrolmentHandler,
    emailComposer: EmailComposer,
    clock: AppClock,
    private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with Logging:
  implicit private val executionContext: BlockingIOExecutionContext = ec

  def getExamInfo(id: Long): Future[Option[JsValue]] =
    collaborativeExamService.findById(id).flatMap {
      case None => Future.successful(None)
      case Some(ce) =>
        examLoader.downloadExamJson(ce).map(_.map { json =>
          json.as[JsObject] ++ Json.obj("id" -> ce.id.longValue, "externalRef" -> ce.externalRef)
        })
    }

  private def checkEnrolmentValidity(
      enrolment: ExamEnrolment,
      exam: Exam,
      user: User
  ): Option[String] =
    val oldReservation = Option(enrolment.reservation)

    if exam.state == ExamState.STUDENT_STARTED ||
      (oldReservation.isDefined && oldReservation.get.toInterval.isBefore(clock.now()))
    then Some("i18n_reservation_in_effect")
    else if oldReservation.isEmpty && !enrolmentHandler.isAllowedToParticipate(exam, user) then
      Some("i18n_no_trials_left")
    else None

  def findEnrolment(examId: Long, userId: Long, now: Instant): Future[Option[ExamEnrolment]] =
    Future(
      DB.find(classOf[ExamEnrolment])
        .fetch(path[ExamEnrolment]("reservation"))
        .where()
        .eq(path[ExamEnrolment]("user.id"), userId)
        .eq(path[ExamEnrolment]("collaborativeExam.id"), examId)
        .disjunction()
        .isNull(path[ExamEnrolment]("reservation"))
        .gt(path[ExamEnrolment]("reservation.startAt"), now)
        .endJunction()
        .find
    )(using ec)

  def createReservation(
      examId: Long,
      roomId: Long,
      userId: Long,
      start: Instant,
      end: Instant,
      aids: Seq[Long],
      sectionIds: Seq[Long]
  ): Future[Either[String, (ExamEnrolment, Reservation)]] =
    val room = DB.find(classOf[ExamRoom], roomId)
    val now  = clock.now()

    (for
      ce <- EitherT.fromOptionF(collaborativeExamService.findById(examId), "Exam not found")
      enrolment <-
        EitherT.fromOptionF(findEnrolment(examId, userId, now), "Enrolment not found")
      exam <- EitherT.fromOptionF(examLoader.downloadExam(ce), "Exam not found")
    yield (enrolment, exam)).flatMapF { (enrolment, exam) =>
      checkEnrolmentValidity(enrolment, exam, enrolment.user) match
        case Some(error) => Future.successful(Left(error))
        case None =>
          calendarHandler.getRandomMachine(room, exam, start, end, aids) match
            case None          => Future.successful(Left("i18n_no_machines_available"))
            case Some(machine) =>
              // An Ebean failure fails the Future, which Play answers with a 500
              Future.fromTry(Using(DB.beginTransaction()) { tx =>
                // Take pessimistic lock for user
                DB.find(classOf[User]).forUpdate().where().eq(path[User]("id"), userId).findOne()

                val oldReservation = enrolment.reservation
                val reservation =
                  calendarHandler.createReservation(start, end, machine, enrolment.user)

                // Remove old reservation if any
                if Option(oldReservation).isDefined then
                  enrolment.reservation = null
                  enrolment.update()
                  oldReservation.delete()

                // Set new reservation
                reservation.save()
                enrolment.reservation = reservation
                enrolment.reservationCanceled = false

                // Set optional sections
                val sections =
                  if sectionIds.isEmpty then Set.empty[ExamSection]
                  else
                    DB.find(classOf[ExamSection])
                      .where()
                      .idIn(sectionIds.asJava)
                      .distinct

                enrolment.optionalSections = sections.asJava
                enrolment.save()

                tx.commit()

                // Send email notification
                emailComposer.scheduleEmail(1.second) {
                  emailComposer.composeReservationNotification(
                    enrolment.user,
                    reservation,
                    exam,
                    false
                  )
                  logger.info(
                    f"Reservation confirmation email sent to ${enrolment.user.email}"
                  )
                }

                Right((enrolment, reservation))
              })
    }.value

  def getSlots(
      examId: Long,
      roomId: Long,
      day: String,
      aids: Option[Seq[Long]],
      userId: Long
  ): Future[Either[String, play.api.libs.json.JsValue]] =
    val now = clock.now()
    (for
      ce <- EitherT.fromOptionF(
        collaborativeExamService.findById(examId),
        "i18n_error_exam_not_found"
      )
      _ <- EitherT.fromOptionF(findEnrolment(examId, userId, now), "i18n_error_enrolment_not_found")
      exam <- EitherT.fromOptionF(examLoader.downloadExam(ce), "i18n_error_exam_not_found")
    yield exam).subflatMap { exam =>
      if !exam.hasState(ExamState.PUBLISHED) then
        Left("i18n_error_exam_not_found")
      else
        val user             = DB.find(classOf[User], userId)
        val accessibilityIds = aids.getOrElse(Seq.empty)
        calendarHandler.getSlots(user, exam, roomId, day, accessibilityIds) match
          case Right(json) => Right(json)
          case Left(CalendarHandlerError.RoomNotFound(_)) =>
            Left("i18n_error_enrolment_not_found")
    }.value
