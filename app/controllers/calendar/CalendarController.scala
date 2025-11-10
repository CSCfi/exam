// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.calendar

import controllers.iop.transfer.api.ExternalReservationHandler
import impl.CalendarHandler
import impl.mail.EmailComposer
import io.ebean.DB
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.facility.ExamRoom
import models.sections.ExamSection
import models.user.{Role, User}
import org.apache.pekko.actor.ActorSystem
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}
import validation.scala.calendar.ReservationCreationFilter
import validation.scala.core.ScalaAttrs

import javax.inject.Inject
import scala.concurrent.Future
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.Using

class CalendarController @Inject() (
    authenticated: AuthenticatedAction,
    calendarHandler: CalendarHandler,
    emailComposer: EmailComposer,
    system: ActorSystem,
    dateTimeHandler: DateTimeHandler,
    externalReservationHandler: ExternalReservationHandler,
    val controllerComponents: ControllerComponents,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with DbApiHelper
    with JavaApiHelper
    with Logging:

  def removeReservation(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val enrolmentOpt = DB
        .find(classOf[ExamEnrolment])
        .fetch("reservation")
        .fetch("reservation.machine")
        .fetch("reservation.machine.room")
        .where()
        .eq("user.id", user.getId)
        .eq("reservation.id", id)
        .find

      enrolmentOpt match
        case None            => throw new IllegalArgumentException(f"No reservation with id $id for current user.")
        case Some(enrolment) =>
          // Removal is not permitted if the reservation is in the past or ongoing
          val reservation = enrolment.getReservation
          val now         = dateTimeHandler.adjustDST(DateTime.now(), reservation)
          if reservation.toInterval.isBefore(now) || reservation.toInterval.contains(now) then
            Forbidden("i18n_reservation_in_effect")
          else
            enrolment.setReservation(null)
            enrolment.setReservationCanceled(true)
            DB.save(enrolment)
            DB.delete(classOf[Reservation], id)

            // send email asynchronously
            val isStudentUser = user == enrolment.getUser

            system.scheduler.scheduleOnce(1.second) {
              emailComposer.composeReservationCancellationNotification(
                enrolment.getUser,
                reservation,
                None,
                isStudentUser,
                enrolment
              )
              logger.info("Reservation cancellation confirmation email sent")
            }(using system.dispatcher)
            Ok
    }

  def getCurrentEnrolment(id: Long): Action[AnyContent] = authenticated.andThen(authorized(Seq(Role.Name.STUDENT))) {
    request =>
      val user = request.attrs(Auth.ATTR_USER)
      val now  = dateTimeHandler.adjustDST(DateTime.now())
      val enrolment =
        DB.find(classOf[ExamEnrolment])
          .fetch("optionalSections")
          .where()
          .eq("user.id", user.getId)
          .eq("exam.id", id)
          .eq("exam.state", Exam.State.PUBLISHED)
          .gt("reservation.startAt", now.toDate)
          .find
      enrolment.map(e => Ok(e.asJson)).getOrElse(Ok)
  }

  def createReservation(): Action[JsValue] =
    authenticated(parse.json)
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT)))
      .andThen(ReservationCreationFilter())
      .async { request =>
        val dto        = request.attrs(ScalaAttrs.ATTR_STUDENT_RESERVATION)
        val roomId     = dto.roomId
        val examId     = dto.examId
        val start      = dto.start
        val end        = dto.end
        val aids       = dto.aids.getOrElse(List.empty)
        val sectionIds = dto.sectionIds.getOrElse(List.empty)

        val room = DB.find(classOf[ExamRoom], roomId)
        val now  = dateTimeHandler.adjustDST(DateTime.now(), room)
        val user = request.attrs(Auth.ATTR_USER)

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
            case None => Future.successful(Forbidden("i18n_error_enrolment_not_found"))
            case Some(enrolment) =>
              calendarHandler.checkEnrolment(enrolment, user, sectionIds) match
                case Some(errorResult) => Future.successful(errorResult)
                case None =>
                  calendarHandler.getRandomMachine(room, enrolment.getExam, start, end, aids) match
                    case None          => Future.successful(Forbidden("i18n_no_machines_available"))
                    case Some(machine) =>
                      // Check that the proposed reservation is (still) doable
                      val proposedReservation = new Reservation()
                      proposedReservation.setStartAt(start)
                      proposedReservation.setEndAt(end)
                      proposedReservation.setMachine(machine)
                      proposedReservation.setUser(user)
                      proposedReservation.setEnrolment(enrolment)

                      if !calendarHandler.isDoable(proposedReservation, aids) then
                        Future.successful(Forbidden("i18n_no_machines_available"))
                      else
                        // We are good to go :)
                        val oldReservation = enrolment.getReservation
                        val reservation    = calendarHandler.createReservation(start, end, machine, user)

                        // Nuke the old reservation if any
                        val result = Option(oldReservation) match
                          case Some(old) if old.getExternalRef != null =>
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
                                  case None => Future.successful(NotFound)
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
      }

  private def makeNewReservation(
      enrolment: ExamEnrolment,
      reservation: Reservation,
      user: User,
      sectionIds: Seq[Long]
  ): Future[Result] =
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
    system.scheduler.scheduleOnce(1.second) {
      emailComposer.composeReservationNotification(user, reservation, exam, false)
      logger.info(f"Reservation confirmation email sent to ${user.getEmail}")
    }(using system.dispatcher)

    Future.successful(Ok)

  def getSlots(examId: Long, roomId: Long, day: String, aids: Option[Seq[Long]]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      val user             = request.attrs(Auth.ATTR_USER)
      val ee               = calendarHandler.getEnrolment(examId, user)
      val accessibilityIds = aids.getOrElse(Seq.empty)

      // Sanity check so that we avoid accidentally getting reservations for SEB exams
      if ee == null || ee.getExam.getImplementation != Exam.Implementation.AQUARIUM then
        Forbidden("i18n_error_enrolment_not_found")
      else calendarHandler.getSlots(user, ee.getExam, roomId, day, accessibilityIds)
    }
