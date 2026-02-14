// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.iop.collaboration.services.CollaborativeExamLoaderService
import features.iop.transfer.services.ExternalReservationHandlerService
import io.ebean.text.PathProperties
import io.ebean.{DB, FetchConfig}
import models.enrolment.{ExamEnrolment, ExamParticipation, Reservation}
import models.exam.Exam
import models.facility.{ExamMachine, ExamRoom}
import models.user.{Role, User}
import org.joda.time.format.{DateTimeFormat, ISODateTimeFormat}
import org.joda.time.{DateTime, DateTimeZone, Interval}
import play.api.Logging
import play.api.libs.json.{JsArray, JsNull, Json}
import security.BlockingIOExecutionContext
import services.datetime.{CalendarHandler, DateTimeHandler}
import services.mail.EmailComposer
import services.user.UserHandler

import java.util.Date
import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

class ReservationService @Inject() (
    private val emailComposer: EmailComposer,
    private val collaborativeExamLoader: CollaborativeExamLoaderService,
    private val externalReservationHandler: ExternalReservationHandlerService,
    private val dateTimeHandler: DateTimeHandler,
    private val userHandler: UserHandler,
    private val calendarHandler: CalendarHandler,
    implicit private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  def getExams(filter: Option[String], user: User): List[Exam] =
    val props = PathProperties.parse("(id, name)")
    val q     = DB.createQuery(classOf[Exam])
    props.apply(q)

    val baseQuery = q
      .where()
      .isNull("parent") // only Exam prototypes
      .eq("state", Exam.State.PUBLISHED)

    val withFilter = filter.fold(baseQuery) { f =>
      baseQuery.ilike("name", s"%$f%")
    }

    val el =
      if user.hasRole(Role.Name.TEACHER) then
        withFilter
          .gt("periodEnd", new Date())
          .disjunction()
          .eq("creator", user)
          .eq("examOwners", user)
          .eq("examInspections.user", user)
          .eq("shared", true)
          .endJunction()
      else withFilter

    el.list

  def getExamRooms: List[ExamRoom] =
    DB.find(classOf[ExamRoom]).select("id, name").fetch("examMachines", "id").list

  private def asJsonUsers(users: Seq[User]): JsArray =
    JsArray(users.map { u =>
      val baseName = s"${u.getFirstName} ${u.getLastName}"
      val name = Option(u.getUserIdentifier).fold(baseName) { identifier =>
        s"$baseName ($identifier)"
      }

      Json.obj(
        "id"             -> u.getId.longValue,
        "firstName"      -> u.getFirstName,
        "lastName"       -> u.getLastName,
        "userIdentifier" -> Option(u.getUserIdentifier),
        "name"           -> name
      )
    })

  def getStudents(filter: Option[String]): JsArray =
    val baseQuery = DB.find(classOf[User]).where().eq("roles.name", "STUDENT")
    val el = filter.fold(baseQuery) { f =>
      val withOr = baseQuery.or().ilike("userIdentifier", s"%$f%")
      userHandler.applyNameSearch(null, withOr, f).endOr()
    }
    asJsonUsers(el.list)

  def getTeachers(filter: Option[String]): JsArray =
    val baseQuery = DB.find(classOf[User]).where().eq("roles.name", "TEACHER")
    val el = filter.fold(baseQuery) { f =>
      userHandler.applyNameSearch(null, baseQuery.or(), f).endOr()
    }
    asJsonUsers(el.list)

  def removeReservation(
      reservationId: Long,
      message: Option[String]
  ): Future[Either[ReservationError, Unit]] =
    DB.find(classOf[ExamEnrolment])
      .where()
      .eq("reservation.id", reservationId)
      .find match
      case None => Future.successful(Left(ReservationError.ReservationNotFound))
      case Some(enrolment) =>
        DB.find(classOf[ExamParticipation]).where().eq("exam", enrolment.getExam).find match
          case Some(participation) =>
            Future.successful(Left(ReservationError.ParticipationExists))
          case None =>
            val reservation = enrolment.getReservation
            // Let's not send emails about historical reservations
            if reservation.getEndAt.isAfter(DateTime.now()) then
              val student = enrolment.getUser
              emailComposer.composeReservationCancellationNotification(
                student,
                reservation,
                message,
                false,
                enrolment
              )

            if Option(reservation.getExternalReservation).isDefined then
              externalReservationHandler
                .removeReservation(reservation, enrolment.getUser, message.getOrElse(""))
                .map(_ => Right(()))
            else
              enrolment.setReservation(null)
              enrolment.update()
              reservation.delete()
              Future.successful(Right(()))

  private def findSuitableSlot(
      machine: ExamMachine,
      reservation: Reservation,
      exam: Exam
  ): Option[Interval] =
    val room     = machine.getRoom
    val interval = reservation.toInterval
    val dtz      = DateTimeZone.forID(room.getLocalTimezone)
    val searchDate =
      dateTimeHandler.normalize(reservation.getStartAt.withZone(dtz), dtz).toLocalDate

    val slots = calendarHandler.gatherSuitableSlots(room, searchDate, exam.getDuration)
    // Find the first slot that starts at or after the interval's start
    // and ends at or after the interval's end
    // This handles cases where rooms have different slot start times (e.g., 10:00 vs. 10:10)
    slots
      .filter(!_.getStart.isBefore(interval.getStart))
      .find(!_.getEnd.isBefore(interval.getEnd))

  private def isBookable(machine: ExamMachine, reservation: Reservation): Future[Boolean] =
    getReservationExam(reservation).map {
      case None => false
      case Some(exam) =>
        if !machine.hasRequiredSoftware(exam) then false
        else
          // Note: Maintenance periods are system-wide, so they were already validated when the reservation was created
          val suitableSlotOpt = findSuitableSlot(machine, reservation, exam)
          if suitableSlotOpt.isEmpty then false
          else
            // Check if a machine is available during the reservation's time slot
            // Exclude the current reservation if it's already assigned to this machine
            val interval = reservation.toInterval
            val conflictingReservations = machine.getReservations.asScala
              .filter(r => r != reservation && interval.overlaps(r.toInterval))
            conflictingReservations.isEmpty
    }

  def findAvailableMachines(
      reservationId: Long,
      roomId: Long
  ): Future[Either[ReservationError, List[play.api.libs.json.JsValue]]] =
    val reservationOpt = Option(DB.find(classOf[Reservation], reservationId))
    val roomOpt        = Option(DB.find(classOf[ExamRoom], roomId))

    (reservationOpt, roomOpt) match
      case (Some(reservation), Some(room)) =>
        val props = PathProperties.parse("(id, name)")
        val query = DB.createQuery(classOf[ExamMachine])
        props.apply(query)

        val candidates = query
          .where()
          .eq("room.id", roomId)
          .ne("outOfService", true)
          .ne("archived", true)
          .ne("id", reservation.getMachine.getId)
          .list

        getReservationExam(reservation).flatMap {
          case None => Future.successful(Left(ReservationError.ExamNotFound))
          case Some(exam) =>
            val timezone  = DateTimeZone.forID(room.getLocalTimezone)
            val formatter = DateTimeFormat.forPattern("HH:mm").withZone(timezone)
            Future
              .traverse(candidates) { machine =>
                isBookable(machine, reservation).map(machine -> _)
              }
              .map(_.filter(_._2).map(_._1))
              .map { availableMachines =>
                val result = availableMachines.map { machine =>
                  findSuitableSlot(machine, reservation, exam).fold(
                    Json.obj("machine" -> machine.asJson, "startAt" -> JsNull, "endAt" -> JsNull)
                  ) { slot =>
                    Json.obj(
                      "machine" -> machine.asJson,
                      "startAt" -> formatter.print(slot.getStart),
                      "endAt"   -> formatter.print(slot.getEnd)
                    )
                  }
                }
                Right(result)
              }
        }
      case _ => Future.successful(Left(ReservationError.RoomNotFound))

  def updateMachine(
      reservationId: Long,
      machineId: Long
  ): Future[Either[ReservationError, Reservation]] =
    Option(DB.find(classOf[Reservation], reservationId)) match
      case None => Future.successful(Left(ReservationError.ReservationNotFound))
      case Some(reservation) =>
        Option(DB.find(classOf[ExamMachine], machineId)) match
          case None          => Future.successful(Left(ReservationError.MachineNotFound))
          case Some(machine) =>
            // Capture previous state for email notification (ugly because of java beans)
            val previous = {
              val p = new Reservation
              p.setMachine(reservation.getMachine)
              p.setStartAt(reservation.getStartAt)
              p.setEndAt(reservation.getEndAt)
              p
            }

            getReservationExam(reservation).flatMap {
              case None => Future.successful(Left(ReservationError.ExamNotFound))
              case Some(exam) =>
                isBookable(machine, reservation).flatMap {
                  case false => Future.successful(Left(ReservationError.MachineNotEligible))
                  case true  =>
                    // Find the suitable slot for the new room and adjust reservation times
                    findSuitableSlot(machine, reservation, exam) match
                      case Some(suitableSlot) =>
                        // Update reservation times to match the suitable slot
                        reservation.setStartAt(suitableSlot.getStart)
                        reservation.setEndAt(suitableSlot.getEnd)
                        reservation.setMachine(machine)
                        reservation.update()
                        emailComposer.composeReservationChangeNotification(reservation, previous)
                        Future.successful(Right(reservation))
                      case None =>
                        // This shouldn't happen if isBookable returned true, but handle it gracefully
                        logger.error(
                          s"Could not find suitable slot for reservation ${reservation.getId} when moving to machine ${machine.getId}"
                        )
                        Future.successful(Left(ReservationError.SuitableSlotNotFound))
                }
            }

  private def getReservationExam(reservation: Reservation): Future[Option[Exam]] =
    Option(reservation.getEnrolment.getExam) match
      case opt @ Some(exam) => Future.successful(opt)
      case None =>
        Option(reservation.getEnrolment.getCollaborativeExam) match
          case Some(collaborativeExam) =>
            collaborativeExamLoader
              .downloadExam(collaborativeExam)
              .recover { case e: Throwable =>
                logger.error(
                  s"Could not load collaborative exam for reservation ${reservation.getId}",
                  e
                )
                None
              }
          case None =>
            logger.warn(s"Reservation ${reservation.getId} has neither exam nor collaborative exam")
            Future.successful(None)

  def listExaminationEvents(
      state: Option[String],
      ownerId: Option[Long],
      studentId: Option[Long],
      examId: Option[Long],
      start: Option[String],
      end: Option[String],
      user: User
  ): List[ExamEnrolment] =
    val baseQuery = DB
      .find(classOf[ExamEnrolment])
      .fetch("user", "id, firstName, lastName, email, userIdentifier")
      .fetch("exam", "id, name, state, trialCount, implementation")
      .fetch("exam.course", "code")
      .fetch("exam.examOwners", "id, firstName, lastName", FetchConfig.ofQuery())
      .fetch("exam.parent.examOwners", "id, firstName, lastName", FetchConfig.ofQuery())
      .fetch("exam.examInspections.user", "id, firstName, lastName")
      .fetch("exam.executionType", "type")
      .fetch("examinationEventConfiguration.examinationEvent")
      .where()
      .isNotNull("examinationEventConfiguration")
      .isNotNull("exam")

    val withTeacherFilter =
      if user.hasRole(Role.Name.TEACHER) then
        baseQuery
          .disjunction()
          .eq("exam.parent.examOwners", user)
          .eq("exam.examOwners", user)
          .endJunction()
          .ne("exam.state", Exam.State.DELETED)
      else baseQuery

    val withStartFilter = start.fold(withTeacherFilter) { s =>
      val startDate = DateTime.parse(s, ISODateTimeFormat.dateTimeParser())
      withTeacherFilter.ge("examinationEventConfiguration.examinationEvent.start", startDate.toDate)
    }

    val withStateFilter = state.fold(withStartFilter) {
      case "NO_SHOW" => withStartFilter.eq("noShow", true)
      case "EXTERNAL_UNFINISHED" | "EXTERNAL_FINISHED" =>
        withStartFilter.isNull("id") // Force empty result set
      case st => withStartFilter.eq("exam.state", Exam.State.valueOf(st)).eq("noShow", false)
    }

    val withStudentFilter = studentId.fold(withStateFilter) { sid =>
      val queryWithStudent = withStateFilter.eq("user.id", sid)
      // Hide reservations for anonymous exams.
      if user.hasRole(Role.Name.TEACHER) then queryWithStudent.eq("exam.anonymous", false)
      else queryWithStudent
    }

    val withExamFilter = examId.fold(withStudentFilter) { eid =>
      withStudentFilter
        .ne("exam.state", Exam.State.DELETED)
        .disjunction()
        .eq("exam.parent.id", eid)
        .eq("exam.id", eid)
        .endJunction()
    }

    val query = if ownerId.isDefined && user.isAdminOrSupport then
      val userId = ownerId.get
      withExamFilter
        .disjunction()
        .eq("exam.examOwners.id", userId)
        .eq("exam.parent.examOwners.id", userId)
        .endJunction()
    else withExamFilter

    query
      .orderBy("examinationEventConfiguration.examinationEvent.start")
      .list
      .filter { ee =>
        end.forall { e =>
          val endDate = DateTime.parse(e, ISODateTimeFormat.dateTimeParser())
          val eventEnd =
            ee.getExaminationEventConfiguration.getExaminationEvent.getStart.plusMinutes(
              ee.getExam.getDuration
            )
          eventEnd.isBefore(endDate)
        }
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
      externalRef: Option[String],
      user: User
  ): List[Reservation] =
    val baseQuery = DB
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

    val withTeacherFilter =
      if user.hasRole(Role.Name.TEACHER) then
        baseQuery
          .isNull("enrolment.externalExam")
          .isNull("enrolment.collaborativeExam")
          .ne("enrolment.exam.state", Exam.State.DELETED)
          .or()
          .eq("enrolment.exam.parent.examOwners", user)
          .eq("enrolment.exam.examOwners", user)
          .endOr()
      else baseQuery

    val withStartFilter = start.fold(withTeacherFilter) { s =>
      val startDate = DateTime.parse(s, ISODateTimeFormat.dateTimeParser())
      val offset    = dateTimeHandler.getTimezoneOffset(startDate.withDayOfYear(1))
      withTeacherFilter.ge("startAt", startDate.plusMillis(offset))
    }

    val withEndFilter = end.fold(withStartFilter) { e =>
      val endDate = DateTime.parse(e, ISODateTimeFormat.dateTimeParser())
      val offset  = dateTimeHandler.getTimezoneOffset(endDate.withDayOfYear(1))
      withStartFilter.lt("endAt", endDate.plusMillis(offset))
    }

    val withStateFilter = state.fold(withEndFilter) {
      case "NO_SHOW" => withEndFilter.eq("enrolment.noShow", true)
      case "EXTERNAL_UNFINISHED" =>
        withEndFilter.isNotNull("externalUserRef").isNull("enrolment.externalExam.finished")
      case "EXTERNAL_FINISHED" =>
        withEndFilter.isNotNull("externalUserRef").isNotNull("enrolment.externalExam.finished")
      case st =>
        withEndFilter.eq("enrolment.exam.state", Exam.State.valueOf(st)).eq(
          "enrolment.noShow",
          false
        )
    }

    val withStudentFilter = studentId.fold(withStateFilter) { sid =>
      val queryWithStudent = withStateFilter.eq("user.id", sid)
      // Hide reservations for anonymous exams.
      if user.hasRole(Role.Name.TEACHER) then
        queryWithStudent
          .or()
          .eq("enrolment.exam.anonymous", false)
          .eq("enrolment.collaborativeExam.anonymous", false)
          .endOr()
      else queryWithStudent
    }

    val withRoomFilter = roomId.fold(withStudentFilter) { rid =>
      withStudentFilter.eq("machine.room.id", rid)
    }

    val withMachineFilter = machineId.fold(withRoomFilter) { mid =>
      withRoomFilter.eq("machine.id", mid)
    }

    val withExamFilter = examId.fold(withMachineFilter) { eid =>
      withMachineFilter
        .disjunction()
        .eq("enrolment.exam.parent.id", eid)
        .eq("enrolment.exam.id", eid)
        .endJunction()
    }

    val withExternalRefFilter = externalRef.fold(withExamFilter) { ref =>
      if examId.isEmpty then withExamFilter.eq("enrolment.collaborativeExam.externalRef", ref)
      else withExamFilter
    }

    val query = if ownerId.isDefined && user.isAdminOrSupport then
      val userId = ownerId.get
      withExternalRefFilter
        .disjunction()
        .eq("enrolment.exam.examOwners.id", userId)
        .eq("enrolment.exam.parent.examOwners.id", userId)
        .endJunction()
    else withExternalRefFilter

    query.orderBy("startAt").distinct.toList
