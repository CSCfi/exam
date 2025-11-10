// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.collaboration.impl

import controllers.iop.collaboration.api.CollaborativeExamLoader
import impl.CalendarHandler
import impl.mail.EmailComposer
import io.ebean.DB
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.enrolment.EnrolmentHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.facility.ExamRoom
import models.iop.CollaborativeExam
import models.sections.ExamSection
import models.user.{Role, User}
import org.apache.pekko.actor.ActorSystem
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}
import validation.scala.calendar.{ReservationCreationFilter, ReservationDTO}
import validation.scala.core.ScalaAttrs

import javax.inject.Inject
import scala.concurrent.Future
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.Using

class CollaborativeCalendarController @Inject() (
    authenticated: AuthenticatedAction,
    calendarHandler: CalendarHandler,
    emailComposer: EmailComposer,
    system: ActorSystem,
    dateTimeHandler: DateTimeHandler,
    enrolmentHandler: EnrolmentHandler,
    collaborationController: CollaborationController,
    examLoader: CollaborativeExamLoader,
    val controllerComponents: ControllerComponents,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with DbApiHelper
    with JavaApiHelper
    with Logging:

  def getExamInfo(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { _ =>
      val ceOpt = Option(DB.find(classOf[CollaborativeExam], id))

      ceOpt match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(ce) =>
          examLoader.downloadExam(ce).map { examOpt =>
            if examOpt.isEmpty then NotFound("i18n_error_exam_not_found")
            else Ok(examOpt.get.asJson)
          }
    }

  private def checkEnrolment(enrolment: ExamEnrolment, exam: Exam, user: User): Option[Result] =
    // Removal is not permitted if the old reservation is in the past or if exam is already started
    val oldReservation = Option(enrolment.getReservation)

    if exam.getState == Exam.State.STUDENT_STARTED ||
      (oldReservation.isDefined && oldReservation.get.toInterval.isBefore(DateTime.now()))
    then Some(Forbidden("i18n_reservation_in_effect"))
    else if oldReservation.isEmpty && !enrolmentHandler.isAllowedToParticipate(exam, user) then
      // No previous reservation or it's in the future
      // If no previous reservation, check if allowed to participate. This check is skipped if the user already
      // has a reservation to this exam so that change of reservation is always possible.
      Some(Forbidden("i18n_no_trials_left"))
    else None

  def createReservation(): Action[JsValue] = authenticated
    .andThen(authorized(Seq(Role.Name.STUDENT)))
    .andThen(ReservationCreationFilter())
    .async(parse.json) { request =>
      val ReservationDTO(roomId, examId, start, end, aids, sectionIds) =
        request.attrs(ScalaAttrs.ATTR_STUDENT_RESERVATION)

      val room = DB.find(classOf[ExamRoom], roomId)
      val now  = dateTimeHandler.adjustDST(DateTime.now(), room)
      val user = request.attrs(Auth.ATTR_USER)

      Option(DB.find(classOf[CollaborativeExam], examId)) match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(ce) =>
          DB.find(classOf[ExamEnrolment])
            .fetch("reservation")
            .where()
            .eq("user.id", user.getId)
            .eq("collaborativeExam.id", examId)
            .disjunction()
            .isNull("reservation")
            .gt("reservation.startAt", now.toDate)
            .endJunction()
            .find match
            case None => Future.successful(NotFound("i18n_error_exam_not_found"))
            case Some(enrolment) =>
              examLoader.downloadExam(ce).map { examOpt =>
                if examOpt.isEmpty then NotFound("i18n_error_exam_not_found")
                else
                  val exam = examOpt.get
                  checkEnrolment(enrolment, exam, user) match
                    case Some(errorResult) => errorResult
                    case None =>
                      calendarHandler.getRandomMachine(room, exam, start, end, aids.getOrElse(List.empty)) match
                        case None          => Forbidden("i18n_no_machines_available")
                        case Some(machine) =>
                          // We are good to go :)
                          // Start manual transaction.
                          Using(DB.beginTransaction()) { tx =>
                            // Take pessimistic lock for user to prevent multiple reservations creating.
                            DB.find(classOf[User]).forUpdate().where().eq("id", user.getId).findOne()

                            val oldReservation = enrolment.getReservation
                            val reservation    = calendarHandler.createReservation(start, end, machine, user)

                            // Nuke the old reservation if any
                            if Option(oldReservation).isEmpty then
                              enrolment.setReservation(null)
                              enrolment.update()
                              oldReservation.delete()

                            val result =
                              makeNewReservation(enrolment, exam, reservation, user, sectionIds.getOrElse(List.empty))
                            tx.commit()
                            result
                          }.get // Extract from Try
              }
    }

  private def makeNewReservation(
      enrolment: ExamEnrolment,
      exam: Exam,
      reservation: Reservation,
      user: User,
      sectionIds: Seq[Long]
  ): Result =
    reservation.save()
    enrolment.setReservation(reservation)
    enrolment.setReservationCanceled(false)

    val sections =
      if sectionIds.isEmpty then Set.empty[ExamSection]
      else DB.find(classOf[ExamSection]).where().idIn(sectionIds.asJava).distinct

    enrolment.setOptionalSections(sections.asJava)
    enrolment.save()

    // Send some emails asynchronously
    system.scheduler.scheduleOnce(1.second) {
      emailComposer.composeReservationNotification(user, reservation, exam, false)
      logger.info(f"Reservation confirmation email sent to ${user.getEmail}")
    }

    Ok

  def getSlots(
      examId: Long,
      roomId: Long,
      day: String,
      aids: Option[Seq[Long]]
  ): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user  = request.attrs(Auth.ATTR_USER)
      val ceOpt = Option(DB.find(classOf[CollaborativeExam], examId))

      ceOpt match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(ce) =>
          getEnrolledExam(examId, user) match
            case None => Future.successful(Forbidden("i18n_error_enrolment_not_found"))
            case Some(_) =>
              examLoader.downloadExam(ce).map { examOpt =>
                if examOpt.isEmpty then NotFound("i18n_error_exam_not_found")
                else
                  val exam = examOpt.get
                  if !exam.hasState(Exam.State.PUBLISHED) then NotFound("i18n_error_exam_not_found")
                  else
                    val accessibilityIds = aids.getOrElse(Seq.empty)
                    calendarHandler.getSlots(user, exam, roomId, day, accessibilityIds)
              }
    }

  private def getEnrolledExam(examId: Long, user: User): Option[ExamEnrolment] =
    val now = dateTimeHandler.adjustDST(DateTime.now())
    DB.find(classOf[ExamEnrolment])
      .where()
      .eq("user", user)
      .eq("collaborativeExam.id", examId)
      .disjunction()
      .isNull("reservation")
      .gt("reservation.startAt", now.toDate)
      .endJunction()
      .find
