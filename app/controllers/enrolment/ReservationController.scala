// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.enrolment

import controllers.iop.collaboration.api.CollaborativeExamLoader
import controllers.iop.transfer.api.ExternalReservationHandler
import impl.CalendarHandler
import impl.mail.EmailComposer
import io.ebean.text.PathProperties
import io.ebean.{DB, FetchConfig}
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import miscellaneous.user.UserHandler
import models.enrolment.{ExamEnrolment, ExamParticipation, Reservation}
import models.exam.Exam
import models.facility.{ExamMachine, ExamRoom}
import models.user.{Role, User}
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.Logging
import play.api.libs.json.{JsArray, JsValue, Json}
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}
import system.AuditedAction

import java.util.Date
import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*

class ReservationController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    emailComposer: EmailComposer,
    collaborativeExamLoader: CollaborativeExamLoader,
    externalReservationHandler: ExternalReservationHandler,
    dateTimeHandler: DateTimeHandler,
    userHandler: UserHandler,
    calendarHandler: CalendarHandler,
    val controllerComponents: ControllerComponents,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with DbApiHelper
    with JavaApiHelper
    with Logging:

  def getExams(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT))) { request =>
      val user  = request.attrs(Auth.ATTR_USER)
      val props = PathProperties.parse("(id, name)")
      val q     = DB.createQuery(classOf[Exam])
      props.apply(q)

      var el = q
        .where()
        .isNull("parent") // only Exam prototypes
        .eq("state", Exam.State.PUBLISHED)

      filter.foreach { f =>
        el = el.ilike("name", s"%$f%")
      }

      if user.hasRole(Role.Name.TEACHER) then
        el = el
          .gt("periodEnd", new Date())
          .disjunction()
          .eq("creator", user)
          .eq("examOwners", user)
          .eq("examInspections.user", user)
          .eq("shared", true)
          .endJunction()

      Ok(el.list.asJson)
    }

  def getExamRooms: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val examRooms = DB.find(classOf[ExamRoom]).select("id, name").fetch("examMachines", "id").list
      Ok(examRooms.asJson)
    }

  private def asJsonUsers(users: Seq[User]): JsArray =
    JsArray(users.map { u =>
      var name = s"${u.getFirstName} ${u.getLastName}"
      if Option(u.getUserIdentifier).isDefined then name += s" (${u.getUserIdentifier})"

      Json.obj(
        "id"             -> u.getId.longValue,
        "firstName"      -> u.getFirstName,
        "lastName"       -> u.getLastName,
        "userIdentifier" -> Option(u.getUserIdentifier),
        "name"           -> name
      )
    })

  def getStudents(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT))) { _ =>
      var el = DB.find(classOf[User]).where().eq("roles.name", "STUDENT")
      filter.foreach { f =>
        el = el.or().ilike("userIdentifier", s"%$f%")
        el = userHandler.applyNameSearch(null, el, f).endOr()
      }
      Ok(asJsonUsers(el.list))
    }

  def getTeachers(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      var el = DB.find(classOf[User]).where().eq("roles.name", "TEACHER")
      filter.foreach { f =>
        el = userHandler.applyNameSearch(null, el.or(), f).endOr()
      }
      Ok(asJsonUsers(el.list))
    }

  def removeReservation(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { request =>
      val enrolment =
        DB.find(classOf[ExamEnrolment])
          .where()
          .eq("reservation.id", id)
          .find
          .getOrElse(
            throw new IllegalArgumentException(s"No reservation with id $id for current user.")
          )

      DB.find(classOf[ExamParticipation]).where().eq("exam", enrolment.getExam).find match
        case Some(participation) =>
          Future.successful(Forbidden(s"i18n_unable_to_remove_reservation (id=${participation.getId})."))
        case None =>
          val reservation = enrolment.getReservation
          val msgOpt      = request.body.asFormUrlEncoded.flatMap(_.get("msg").flatMap(_.headOption))

          // Let's not send emails about historical reservations
          if reservation.getEndAt.isAfter(DateTime.now()) then
            val student = enrolment.getUser
            emailComposer.composeReservationCancellationNotification(
              student,
              reservation,
              msgOpt,
              false,
              enrolment
            )

          if Option(reservation.getExternalReservation).isDefined then
            externalReservationHandler
              .removeReservation(reservation, enrolment.getUser, msgOpt.getOrElse(""))
              .map(_ => Ok)
          else
            enrolment.setReservation(null)
            enrolment.update()
            reservation.delete()
            Future.successful(Ok)
    }

  private def isBookable(machine: ExamMachine, reservation: Reservation): Boolean =
    reservation.setMachine(machine)
    calendarHandler.isDoable(reservation, Seq.empty)

  def findAvailableMachines(reservationId: Long, roomId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val reservationOpt = Option(DB.find(classOf[Reservation], reservationId))
      val roomOpt        = Option(DB.find(classOf[ExamRoom], roomId))

      (reservationOpt, roomOpt) match
        case (Some(reservation), Some(_)) =>
          val props = PathProperties.parse("(id, name)")
          val query = DB.createQuery(classOf[ExamMachine])
          props.apply(query)

          val candidates = query
            .where()
            .eq("room.id", roomId)
            .ne("outOfService", true)
            .ne("archived", true)
            .list

          val available = candidates.filter(machine => isBookable(machine, reservation))
          Ok(available.asJson)
        case _ => NotFound("Machine or room not found")
    }

  def updateMachine(reservationId: Long): Action[JsValue] =
    audited.andThen(authenticated)(parse.json).andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))).async {
      request =>
        Option(DB.find(classOf[Reservation], reservationId)) match
          case None => Future.successful(NotFound("Reservation not found"))
          case Some(reservation) =>
            val machineId = (request.body \ "machineId").as[Long]
            val previous  = reservation.getMachine

            Option(DB.find(classOf[ExamMachine], machineId)) match
              case None => Future.successful(NotFound("Machine not found"))
              case Some(machine) =>
                getReservationExam(reservation).flatMap {
                  case None => Future.successful(NotFound("Exam not found"))
                  case Some(_) if !isBookable(machine, reservation) =>
                    Future.successful(Forbidden("Machine not eligible for choosing"))
                  case Some(_) =>
                    reservation.setMachine(machine)
                    reservation.update()
                    emailComposer.composeReservationChangeNotification(
                      reservation.getUser,
                      previous,
                      machine,
                      reservation.getEnrolment
                    )
                    Future.successful(Ok(Seq(machine).asJson))
                }
    }

  private def getReservationExam(reservation: Reservation): Future[Option[Exam]] =
    if Option(reservation.getEnrolment.getExam).isDefined then Future.successful(Some(reservation.getEnrolment.getExam))
    else
      collaborativeExamLoader
        .downloadExam(reservation.getEnrolment.getCollaborativeExam)

  def listExaminationEvents(
      state: Option[String],
      ownerId: Option[Long],
      studentId: Option[Long],
      examId: Option[Long],
      start: Option[String],
      end: Option[String]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) { request =>
      var query = DB
        .find(classOf[ExamEnrolment])
        .fetch("user", "id, firstName, lastName, email, userIdentifier")
        .fetch("exam", "id, name, state, trialCount, implementation")
        .fetch("exam.course", "code")
        .fetch("exam.examOwners", "id, firstName, lastName", FetchConfig.ofQuery())
        .fetch("exam.parent.examOwners", "id, firstName, lastName", FetchConfig.ofQuery())
        .fetch("exam.examInspections.user", "id, firstName, lastName")
        .fetch("examinationEventConfiguration.examinationEvent")
        .where()
        .isNotNull("examinationEventConfiguration")
        .isNotNull("exam")

      val user = request.attrs(Auth.ATTR_USER)
      if user.hasRole(Role.Name.TEACHER) then
        query = query
          .disjunction()
          .eq("exam.parent.examOwners", user)
          .eq("exam.examOwners", user)
          .endJunction()
          .ne("exam.state", Exam.State.DELETED)

      start.foreach { s =>
        val startDate = DateTime.parse(s, ISODateTimeFormat.dateTimeParser())
        query = query.ge("examinationEventConfiguration.examinationEvent.start", startDate.toDate)
      }

      state.foreach {
        case "NO_SHOW"                                   => query = query.eq("noShow", true)
        case "EXTERNAL_UNFINISHED" | "EXTERNAL_FINISHED" => query = query.isNull("id") // Force empty result set
        case st => query = query.eq("exam.state", Exam.State.valueOf(st)).eq("noShow", false)
      }

      studentId.foreach { sid =>
        query = query.eq("user.id", sid)
        // Hide reservations for anonymous exams.
        if user.hasRole(Role.Name.TEACHER) then query.eq("exam.anonymous", false)
      }

      examId.foreach { eid =>
        query = query
          .ne("exam.state", Exam.State.DELETED)
          .disjunction()
          .eq("exam.parent.id", eid)
          .eq("exam.id", eid)
          .endJunction()
      }

      if ownerId.isDefined && user.hasRole(Role.Name.ADMIN) then
        val userId = ownerId.get
        query = query
          .disjunction()
          .eq("exam.examOwners.id", userId)
          .eq("exam.parent.examOwners.id", userId)
          .endJunction()

      val enrolments = query
        .orderBy("examinationEventConfiguration.examinationEvent.start")
        .list
        .filter { ee =>
          end.forall { e =>
            val endDate = DateTime.parse(e, ISODateTimeFormat.dateTimeParser())
            val eventEnd =
              ee.getExaminationEventConfiguration.getExaminationEvent.getStart.plusMinutes(ee.getExam.getDuration)
            eventEnd.isBefore(endDate)
          }
        }

      val anonIds = enrolments
        .filter(_.getExam.isAnonymous)
        .map(_.getId)
        .toSet

      Ok(enrolments.asJson)
    }

  def listReservations(
      state: Option[String],
      ownerId: Option[Long],
      studentId: Option[Long],
      roomId: Option[Long],
      machineId: Option[Long],
      examId: Option[Long],
      start: Option[String],
      end: Option[String],
      externalRef: Option[String]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) { request =>
      var query = DB
        .find(classOf[Reservation])
        .fetch("enrolment", "noShow, retrialPermitted")
        .fetch("user", "id, firstName, lastName, email, userIdentifier")
        .fetch("enrolment.exam", "id, name, state, trialCount, implementation")
        .fetch("enrolment.externalExam", "id, externalRef, finished")
        .fetch("enrolment.exam.course", "code")
        .fetch("enrolment.exam.examOwners", "id, firstName, lastName", FetchConfig.ofQuery())
        .fetch("enrolment.exam.parent.examOwners", "id, firstName, lastName", FetchConfig.ofQuery())
        .fetch("enrolment.exam.examInspections.user", "id, firstName, lastName")
        .fetch("enrolment.exam.executionType", "type")
        .fetch("enrolment.collaborativeExam", "*")
        .fetch("externalReservation")
        .fetch("machine", "id, name, ipAddress, otherIdentifier")
        .fetch("machine.room", "id, name, roomCode")
        .where()

      val user = request.attrs(Auth.ATTR_USER)
      if user.hasRole(Role.Name.TEACHER) then
        query = query
          .isNull("enrolment.externalExam")
          .isNull("enrolment.collaborativeExam")
          .ne("enrolment.exam.state", Exam.State.DELETED)
          .disjunction()
          .eq("enrolment.exam.parent.examOwners", user)
          .eq("enrolment.exam.examOwners", user)
          .endJunction()

      start.foreach { s =>
        val startDate = DateTime.parse(s, ISODateTimeFormat.dateTimeParser())
        val offset    = dateTimeHandler.getTimezoneOffset(startDate.withDayOfYear(1))
        query = query.ge("startAt", startDate.plusMillis(offset))
      }

      end.foreach { e =>
        val endDate = DateTime.parse(e, ISODateTimeFormat.dateTimeParser())
        val offset  = dateTimeHandler.getTimezoneOffset(endDate.withDayOfYear(1))
        query = query.lt("endAt", endDate.plusMillis(offset))
      }

      state.foreach {
        case "NO_SHOW" => query = query.eq("enrolment.noShow", true)
        case "EXTERNAL_UNFINISHED" =>
          query = query.isNotNull("externalUserRef").isNull("enrolment.externalExam.finished")
        case "EXTERNAL_FINISHED" =>
          query = query.isNotNull("externalUserRef").isNotNull("enrolment.externalExam.finished")
        case st =>
          query = query.eq("enrolment.exam.state", Exam.State.valueOf(st)).eq("enrolment.noShow", false)
      }

      studentId.foreach { sid =>
        query = query.eq("user.id", sid)
        // Hide reservations for anonymous exams.
        if user.hasRole(Role.Name.TEACHER) then
          query
            .or()
            .eq("enrolment.exam.anonymous", false)
            .eq("enrolment.collaborativeExam.anonymous", false)
            .endOr()
      }

      roomId.foreach { rid => query = query.eq("machine.room.id", rid) }
      machineId.foreach { mid => query = query.eq("machine.id", mid) }

      examId.foreach { eid =>
        query = query
          .disjunction()
          .eq("enrolment.exam.parent.id", eid)
          .eq("enrolment.exam.id", eid)
          .endJunction()
      }

      externalRef.foreach { ref =>
        if examId.isEmpty then query = query.eq("enrolment.collaborativeExam.externalRef", ref)
      }

      if ownerId.isDefined && user.hasRole(Role.Name.ADMIN) then
        val userId = ownerId.get
        query = query
          .disjunction()
          .eq("enrolment.exam.examOwners.id", userId)
          .eq("enrolment.exam.parent.examOwners.id", userId)
          .endJunction()

      val reservations = query.orderBy("startAt").distinct
      val anonIds = reservations
        .filter(r =>
          r.getEnrolment != null &&
            r.getEnrolment.getExam != null &&
            r.getEnrolment.getExam.isAnonymous
        )
        .map(_.getId)

      Ok(reservations.asJson)
    }
