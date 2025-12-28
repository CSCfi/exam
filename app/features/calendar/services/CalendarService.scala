// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.calendar.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.iop.transfer.services.ExternalReservationHandlerService
import io.ebean.DB
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.sections.ExamSection
import models.user.User
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json.JsValue
import security.BlockingIOExecutionContext
import services.datetime.{CalendarHandler, CalendarHandlerError, DateTimeHandler}
import services.mail.EmailComposer
import validation.calendar.ReservationDTO

import javax.inject.Inject
import scala.concurrent.Future
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.Using

class CalendarService @Inject() (
    private val calendarHandler: CalendarHandler,
    private val emailComposer: EmailComposer,
    private val dateTimeHandler: DateTimeHandler,
    private val externalReservationHandler: ExternalReservationHandlerService,
    implicit private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  def removeReservation(reservationId: Long, user: User): Either[CalendarError, Unit] =
    val enrolmentOpt = DB
      .find(classOf[ExamEnrolment])
      .fetch("reservation")
      .fetch("reservation.machine")
      .fetch("reservation.machine.room")
      .where()
      .eq("user.id", user.getId)
      .eq("reservation.id", reservationId)
      .find

    enrolmentOpt match
      case None => Left(CalendarError.InvalidReservation(
          s"No reservation with id $reservationId for current user."
        ))
      case Some(enrolment) =>
        // Removal is not permitted if the reservation is in the past or ongoing
        val reservation = enrolment.getReservation
        val now         = dateTimeHandler.adjustDST(DateTime.now(), reservation)
        if reservation.toInterval.isBefore(now) || reservation.toInterval.contains(now) then
          Left(CalendarError.ReservationInEffect)
        else
          enrolment.setReservation(null)
          enrolment.setReservationCanceled(true)
          DB.save(enrolment)
          DB.delete(classOf[Reservation], reservationId)

          // send email asynchronously
          val isStudentUser = user == enrolment.getUser

          emailComposer.scheduleEmail(1.second) {
            emailComposer.composeReservationCancellationNotification(
              enrolment.getUser,
              reservation,
              None,
              isStudentUser,
              enrolment
            )
            logger.info("Reservation cancellation confirmation email sent")
          }
          Right(())

  def getCurrentEnrolment(examId: Long, user: User): Option[ExamEnrolment] =
    val now = dateTimeHandler.adjustDST(DateTime.now())
    DB.find(classOf[ExamEnrolment])
      .fetch("optionalSections")
      .where()
      .eq("user.id", user.getId)
      .eq("exam.id", examId)
      .eq("exam.state", Exam.State.PUBLISHED)
      .gt("reservation.startAt", now.toDate)
      .find

  def createReservation(dto: ReservationDTO, user: User): Future[Either[CalendarError, Unit]] =
    val roomId     = dto.roomId
    val examId     = dto.examId
    val start      = dto.start
    val end        = dto.end
    val aids       = dto.aids.getOrElse(List.empty)
    val sectionIds = dto.sectionIds.getOrElse(List.empty)

    val room = DB.find(classOf[models.facility.ExamRoom], roomId)
    val now  = dateTimeHandler.adjustDST(DateTime.now(), room)

    // Start manual transaction
    Using(DB.beginTransaction()) { tx =>
      // Take pessimistic lock for user to prevent multiple reservations creating
      DB.find(classOf[User]).forUpdate().where().eq("id", user.getId).findOne()

      val optionalEnrolment =
        DB.find(classOf[ExamEnrolment])
          .fetch("reservation")
          .fetch("exam.examSections")
          .fetch("exam.examSections.examMaterials")
          .where()
          .eq("user.id", user.getId)
          .eq("exam.id", examId)
          .eq("exam.state", Exam.State.PUBLISHED)
          .disjunction()
          .isNull("reservation")
          .gt("reservation.startAt", now.toDate)
          .endJunction()
          .find

      optionalEnrolment match
        case None => Future.successful(Left(CalendarError.EnrolmentNotFound))
        case Some(enrolment) =>
          calendarHandler.checkEnrolment(enrolment, user, sectionIds) match
            case Some(errorResult) => Future.successful(Left(CalendarError.Forbidden))
            case None =>
              calendarHandler.getRandomMachine(room, enrolment.getExam, start, end, aids) match
                case None          => Future.successful(Left(CalendarError.NoMachinesAvailable))
                case Some(machine) =>
                  // Check that the proposed reservation is (still) doable
                  val proposedReservation = new Reservation()
                  proposedReservation.setStartAt(start)
                  proposedReservation.setEndAt(end)
                  proposedReservation.setMachine(machine)
                  proposedReservation.setUser(user)
                  proposedReservation.setEnrolment(enrolment)

                  if !calendarHandler.isDoable(proposedReservation, aids) then
                    Future.successful(Left(CalendarError.NoMachinesAvailable))
                  else
                    // We are good to go :)
                    val oldReservation = enrolment.getReservation
                    val reservation = calendarHandler.createReservation(start, end, machine, user)

                    // Nuke the old reservation if any
                    val result = Option(oldReservation) match
                      case Some(old) if Option(old.getExternalRef).isDefined =>
                        externalReservationHandler
                          .removeReservation(old, user, "")
                          .flatMap { _ =>
                            // Re-fetch enrolment
                            val updatedEnrolmentOpt =
                              DB.find(classOf[ExamEnrolment])
                                .fetch("exam.executionType")
                                .where()
                                .idEq(enrolment.getId)
                                .find

                            updatedEnrolmentOpt match
                              case None => Future.successful(Left(CalendarError.NotFound))
                              case Some(updatedEnrolment) =>
                                makeNewReservation(updatedEnrolment, reservation, user, sectionIds)
                          }
                      case Some(old) =>
                        enrolment.setReservation(null)
                        enrolment.update()
                        old.delete()
                        makeNewReservation(enrolment, reservation, user, sectionIds)
                      case None =>
                        makeNewReservation(enrolment, reservation, user, sectionIds)

                    tx.commit()
                    result
    }.get // Extract from Try

  private def makeNewReservation(
      enrolment: ExamEnrolment,
      reservation: Reservation,
      user: User,
      sectionIds: Seq[Long]
  ): Future[Either[CalendarError, Unit]] =
    DB.save(reservation)
    enrolment.setReservation(reservation)
    enrolment.setReservationCanceled(false)
    enrolment.getOptionalSections.clear()
    enrolment.update()

    if sectionIds.nonEmpty then
      val sections = DB.find(classOf[ExamSection]).where().idIn(sectionIds.asJava).distinct
      enrolment.setOptionalSections(sections.asJava)

    if enrolment.getExam.isPrivate then enrolment.setNoShow(false)

    DB.save(enrolment)
    val exam = enrolment.getExam

    // Send some emails asynchronously
    emailComposer.scheduleEmail(1.second) {
      emailComposer.composeReservationNotification(user, reservation, exam, false)
      logger.info(f"Reservation confirmation email sent to ${user.getEmail}")
    }

    Future.successful(Right(()))

  def getSlots(
      examId: Long,
      roomId: Long,
      day: String,
      aids: Option[Seq[Long]],
      user: User
  ): Either[CalendarError, JsValue] =
    val ee               = calendarHandler.getEnrolment(examId, user)
    val accessibilityIds = aids.getOrElse(Seq.empty)

    // Sanity check so that we avoid accidentally getting reservations for SEB exams
    if Option(ee).isEmpty || ee.getExam.getImplementation != Exam.Implementation.AQUARIUM then
      Left(CalendarError.EnrolmentNotFound)
    else
      calendarHandler.getSlots(user, ee.getExam, roomId, day, accessibilityIds) match
        case Right(json)                                => Right(json)
        case Left(CalendarHandlerError.RoomNotFound(_)) => Left(CalendarError.EnrolmentNotFound)
