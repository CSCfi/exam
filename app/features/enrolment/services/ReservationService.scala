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
import models.exam.ExamState
import models.facility.{ExamMachine, ExamRoom}
import models.user.{Role, User}
import play.api.Logging
import play.api.libs.json.{JsArray, Json}
import security.BlockingIOExecutionContext
import services.datetime.*
import services.datetime.TimeUtils
import services.mail.EmailComposer
import services.user.UserHandler

import java.time.Instant
import java.time.format.DateTimeFormatter
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
    private val clock: AppClock,
    implicit private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  def getExams(filter: Option[String], user: User): List[Exam] =
    val props = PathProperties.parse("(id, name)")
    val baseQuery = DB.find(classOf[Exam])
      .apply(props)
      .where()
      .isNull("parent") // only Exam prototypes
      .eq("state", ExamState.PUBLISHED)

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

  def getExamRooms: List[ExamRoom] = DB.find(classOf[ExamRoom]).where().isNotNull("name").list

  private def asJsonUsers(users: Seq[User]): JsArray =
    JsArray(users.map { u =>
      val baseName = s"${u.firstName} ${u.lastName}"
      val name = Option(u.userIdentifier).fold(baseName) { identifier =>
        s"$baseName ($identifier)"
      }

      Json.obj(
        "id"             -> u.id.longValue,
        "firstName"      -> u.firstName,
        "lastName"       -> u.lastName,
        "userIdentifier" -> Option(u.userIdentifier),
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
      case None =>
        Option(DB.find(classOf[Reservation], reservationId)) match
          case None => Future.successful(Left(ReservationError.ReservationNotFound))
          case Some(reservation) =>
            if Option(reservation.externalOrgRef).isDefined then
              externalReservationHandler
                .revokeExternalStudentReservation(reservation, message)
                .map {
                  case None    => Right(())
                  case Some(_) => Left(ReservationError.RemoteCallFailed)
                }
            else
              if reservation.endAt.isAfter(Instant.now()) then
                emailComposer.composeExternalReservationCancellationNotification(
                  reservation,
                  message
                )
              reservation.delete()
              Future.successful(Right(()))
      case Some(enrolment) =>
        DB.find(classOf[ExamParticipation]).where().eq("exam", enrolment.exam).find match
          case Some(participation) =>
            Future.successful(Left(ReservationError.ParticipationExists))
          case None =>
            val reservation = enrolment.reservation
            // Let's not send emails about historical reservations
            if reservation.endAt.isAfter(Instant.now()) then
              val student = enrolment.user
              emailComposer.composeReservationCancellationNotification(
                student,
                reservation,
                message,
                false,
                enrolment
              )

            if Option(reservation.externalReservation).isDefined then
              externalReservationHandler
                .removeReservation(
                  reservation,
                  enrolment.user,
                  message.getOrElse(""),
                  sendEmail = false
                )
                .map(_ => Right(()))
            else
              enrolment.reservation = null
              enrolment.update()
              reservation.delete()
              Future.successful(Right(()))

  private def hasStarted(reservation: Reservation): Boolean =
    !reservation.startAt.isAfter(clock.now())

  private def findSuitableSlots(
      machine: ExamMachine,
      reservation: Reservation,
      exam: Exam
  ): Seq[Interval] =
    val interval = reservation.toInterval
    // An ongoing reservation can keep its original time: the student is already taking the
    // exam, so the machine change need not shift the time they have left.
    val ongoing = Option.when(hasStarted(reservation))(interval)

    val room       = machine.room
    val searchDate = reservation.startAt.atZone(TimeUtils.zoneIdOf(room.localTimezone)).toLocalDate

    val slots = calendarHandler.gatherSuitableSlots(room, searchDate, exam.duration)
    // Find the first slot that starts at or after the interval's start
    // and ends at or after the interval's end
    // This handles cases where rooms have different slot start times (e.g., 10:00 vs. 10:10)
    // The calendar no longer offers slots that have begun, so for an ongoing reservation this
    // is the next free slot rather than the original one.
    val next = slots
      .filter(!_.start.isBefore(interval.start))
      .filter(!_.end.isBefore(interval.end))
      .find(slot => !ongoing.contains(slot))

    ongoing.toSeq ++ next.toSeq

  private def availableSlots(
      machine: ExamMachine,
      reservation: Reservation
  ): Future[Seq[Interval]] =
    getReservationExam(reservation).map {
      case None                                             => Seq.empty
      case Some(exam) if !machine.hasRequiredSoftware(exam) => Seq.empty
      case Some(exam)                                       =>
        // Slots fit within opening hours by construction
        // Note: Maintenance periods are system-wide, so they were already validated when the reservation was created
        findSuitableSlots(machine, reservation, exam).filter { slot =>
          // Check if a machine is available for the whole slot
          // Exclude the current reservation if it's already assigned to this machine
          machine.reservations.asScala
            .forall(r => r == reservation || !slot.overlaps(r.toInterval))
        }
    }

  def findAvailableMachines(
      reservationId: Long,
      roomId: Long
  ): Future[Either[ReservationError, List[play.api.libs.json.JsValue]]] =
    val reservationOpt = Option(DB.find(classOf[Reservation], reservationId))
    val roomOpt        = Option(DB.find(classOf[ExamRoom], roomId))

    (reservationOpt, roomOpt) match
      case (Some(reservation), _) if isExternalReservation(reservation) =>
        Future.successful(Left(ReservationError.MachineChangeNotAllowed))
      case (Some(reservation), Some(room)) =>
        val props = PathProperties.parse("(id, name)")
        val candidates = DB.find(classOf[ExamMachine])
          .apply(props)
          .where()
          .eq("room.id", roomId)
          .ne("outOfService", true)
          .ne("archived", true)
          .ne("id", reservation.machine.id)
          .list

        getReservationExam(reservation).flatMap {
          case None => Future.successful(Left(ReservationError.ExamNotFound))
          case Some(_) =>
            val zoneId    = TimeUtils.zoneIdOf(room.localTimezone)
            val formatter = DateTimeFormatter.ofPattern("HH:mm").withZone(zoneId)
            Future
              .traverse(candidates) { machine =>
                availableSlots(machine, reservation).map(machine -> _)
              }
              .map(_.filter(_._2.nonEmpty))
              .map { availableMachines =>
                val result = availableMachines.map { (machine, slots) =>
                  Json.obj(
                    "machine" -> machine.asJson,
                    "slots" -> JsArray(slots.map { slot =>
                      Json.obj(
                        // start and end identify the slot when it gets picked,
                        // startAt and endAt are for display
                        "start"   -> DateTimeFormatter.ISO_INSTANT.format(slot.start),
                        "end"     -> DateTimeFormatter.ISO_INSTANT.format(slot.end),
                        "startAt" -> formatter.format(slot.start),
                        "endAt"   -> formatter.format(slot.end)
                      )
                    })
                  )
                }
                Right(result)
              }
        }
      case _ => Future.successful(Left(ReservationError.RoomNotFound))

  // Machines of IOP reservations are assigned by the institution hosting the visit, over IOP
  private def isExternalReservation(reservation: Reservation): Boolean =
    Option(reservation.externalUserRef).isDefined ||
      Option(reservation.externalReservation).isDefined

  def updateMachine(
      reservationId: Long,
      machineId: Long,
      chosenSlot: Option[Interval]
  ): Future[Either[ReservationError, Reservation]] =
    Option(DB.find(classOf[Reservation], reservationId)) match
      case None => Future.successful(Left(ReservationError.ReservationNotFound))
      case Some(reservation) if isExternalReservation(reservation) =>
        Future.successful(Left(ReservationError.MachineChangeNotAllowed))
      case Some(reservation) =>
        Option(DB.find(classOf[ExamMachine], machineId)) match
          case None          => Future.successful(Left(ReservationError.MachineNotFound))
          case Some(machine) =>
            // Capture previous state for email notification (ugly because of java beans)
            val previous = {
              val p = new Reservation
              p.machine = reservation.machine
              p.startAt = reservation.startAt
              p.endAt = reservation.endAt
              p
            }

            getReservationExam(reservation).flatMap {
              case None => Future.successful(Left(ReservationError.ExamNotFound))
              case Some(_) =>
                availableSlots(machine, reservation).flatMap { offered =>
                  if offered.isEmpty then
                    Future.successful(Left(ReservationError.MachineNotEligible))
                  else
                    // The client picks one of the slots offered by findAvailableMachines. A client
                    // that sends no slot gets the first one offered, that is, the ongoing time
                    // whenever there is one.
                    val slot =
                      chosenSlot.fold(offered.headOption)(chosen => offered.find(_ == chosen))
                    slot match
                      case Some(suitableSlot) =>
                        // Update reservation times to match the slot that was picked
                        reservation.startAt = suitableSlot.start
                        reservation.endAt = suitableSlot.end
                        reservation.machine = machine
                        reservation.update()
                        emailComposer.composeReservationChangeNotification(reservation, previous)
                        Future.successful(Right(reservation))
                      case None =>
                        logger.warn(
                          s"Slot $chosenSlot is not among the ones offered for reservation ${reservation.id} on machine ${machine.id}"
                        )
                        Future.successful(Left(ReservationError.SlotNotAvailable))
                }
            }

  private def getReservationExam(reservation: Reservation): Future[Option[Exam]] =
    // A visiting student's reservation has no enrolment on this end
    val enrolment = Option(reservation.enrolment)
    enrolment.flatMap(e => Option(e.exam)) match
      case opt @ Some(exam) => Future.successful(opt)
      case None =>
        enrolment.flatMap(e => Option(e.collaborativeExam)) match
          case Some(collaborativeExam) =>
            collaborativeExamLoader
              .downloadExam(collaborativeExam)
              .recover { case e: Throwable =>
                logger.error(
                  s"Could not load collaborative exam for reservation ${reservation.id}",
                  e
                )
                None
              }
          case None =>
            logger.warn(s"Reservation ${reservation.id} has neither exam nor collaborative exam")
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
          .ne("exam.state", ExamState.DELETED)
      else baseQuery

    val withStartFilter = start.fold(withTeacherFilter) { s =>
      withTeacherFilter.ge(
        "examinationEventConfiguration.examinationEvent.start",
        TimeUtils.parseInstant(s)
      )
    }

    val withStateFilter = state.fold(withStartFilter) {
      case "NO_SHOW" => withStartFilter.eq("noShow", true)
      case "EXTERNAL_UNFINISHED" | "EXTERNAL_FINISHED" =>
        withStartFilter.isNull("id") // Force empty result set
      case st => withStartFilter.eq("exam.state", ExamState.valueOf(st)).eq("noShow", false)
    }

    val withStudentFilter = studentId.fold(withStateFilter) { sid =>
      val queryWithStudent = withStateFilter.eq("user.id", sid)
      // Hide reservations for anonymous exams.
      if user.hasRole(Role.Name.TEACHER) then queryWithStudent.eq("exam.anonymous", false)
      else queryWithStudent
    }

    val withExamFilter = examId.fold(withStudentFilter) { eid =>
      withStudentFilter
        .ne("exam.state", ExamState.DELETED)
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
          val endDate = TimeUtils.parseInstant(e)
          val eventEnd = ee.examinationEventConfiguration.examinationEvent.start
            .plus(java.time.Duration.ofMinutes(ee.exam.duration.toLong))
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
          .ne("enrolment.exam.state", ExamState.DELETED)
          .or()
          .eq("enrolment.exam.parent.examOwners", user)
          .eq("enrolment.exam.examOwners", user)
          .endOr()
      else baseQuery

    val withStartFilter = start.fold(withTeacherFilter) { s =>
      withTeacherFilter.ge("startAt", TimeUtils.parseInstant(s))
    }

    val withEndFilter = end.fold(withStartFilter) { e =>
      withStartFilter.lt("endAt", TimeUtils.parseInstant(e))
    }

    val withStateFilter = state.fold(withEndFilter) {
      case "NO_SHOW" => withEndFilter.eq("enrolment.noShow", true)
      case "EXTERNAL_UNFINISHED" =>
        withEndFilter.isNotNull("externalUserRef").isNull("enrolment.externalExam.finished")
      case "EXTERNAL_FINISHED" =>
        withEndFilter.isNotNull("externalUserRef").isNotNull("enrolment.externalExam.finished")
      case st =>
        withEndFilter.eq("enrolment.exam.state", ExamState.valueOf(st)).eq(
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
