// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.datetime

import database.EbeanQueryExtensions
import features.iop.transfer.services.ExternalReservationHandlerService
import io.ebean.DB
import models.calendar.MaintenancePeriod
import models.enrolment.{ExamEnrolment, ExternalReservation, Reservation}
import models.exam.Exam
import models.facility.*
import models.sections.ExamSection
import models.user.User
import org.joda.time.*
import org.joda.time.format.ISODateTimeFormat
import play.api.Logging
import play.api.libs.json.*
import play.api.mvc.*
import play.api.mvc.Results.*
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.enrolment.EnrolmentHandler
import services.mail.EmailComposer

import javax.inject.Inject
import scala.concurrent.Future
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.Random

class CalendarHandlerImpl @Inject() (
    configReader: ConfigReader,
    externalReservationHandler: ExternalReservationHandlerService,
    emailComposer: EmailComposer,
    dateTimeHandler: DateTimeHandler,
    enrolmentHandler: EnrolmentHandler,
    implicit val ec: BlockingIOExecutionContext
) extends CalendarHandler
    with EbeanQueryExtensions
    with Logging:

  private val LastHour = 23

  override def getSlots(
      user: User,
      exam: Exam,
      roomId: Long,
      day: String,
      aids: Seq[Long]
  ): Either[CalendarHandlerError, JsValue] =
    Option(DB.find(classOf[ExamRoom], roomId)) match
      case None =>
        Left(CalendarHandlerError.RoomNotFound(roomId))
      case Some(room) =>
        val slots =
          if !room.getOutOfService &&
            room.getState != ExamRoom.State.INACTIVE.toString &&
            isRoomAccessibilitySatisfied(room, aids) &&
            Option(exam.getDuration).isDefined
          then
            parseSearchDate(day, exam, Some(room)) match
              case None             => List.empty
              case Some(searchDate) =>
                // user's reservations starting from now
                val reservations = DB
                  .find(classOf[Reservation])
                  .fetch("enrolment.exam")
                  .where()
                  .eq("user", user)
                  .gt("startAt", searchDate.minusDays(1).toDate)
                  .list

                // Resolve eligible machines
                val machines = getEligibleMachines(room, aids, exam)

                // Maintenance periods
                val periods = DB
                  .find(classOf[MaintenancePeriod])
                  .where()
                  .gt("endsAt", searchDate.toDate)
                  .list
                  .map(p =>
                    new Interval(
                      normalizeMaintenanceTime(p.getStartsAt),
                      normalizeMaintenanceTime(p.getEndsAt)
                    )
                  )

                val endOfSearch = getEndSearchDate(searchDate, new LocalDate(exam.getPeriodEnd))

                Iterator
                  .iterate(searchDate)(_.plusDays(1))
                  .takeWhile(!_.isAfter(endOfSearch))
                  .flatMap { date =>
                    getExamSlots(user, room, exam, date, reservations, machines, periods)
                  }
                  .toList
          else List.empty

        Right(Json.toJson(slots))

  override def isDoable(reservation: Reservation, aids: Seq[Long]): Boolean =
    val dtz = DateTimeZone.forID(reservation.getMachine.getRoom.getLocalTimezone)
    val searchDate =
      dateTimeHandler.normalize(reservation.getStartAt.withZone(dtz), dtz).toLocalDate

    // user's reservations starting from now
    val reservations = DB
      .find(classOf[Reservation])
      .fetch("enrolment.exam")
      .where()
      .eq("user", reservation.getUser)
      .ge("startAt", searchDate.toDate)
      .list

    // Resolve eligible machines
    val machines =
      getEligibleMachines(reservation.getMachine.getRoom, aids, reservation.getEnrolment.getExam)

    // Maintenance periods
    val periods = DB
      .find(classOf[MaintenancePeriod])
      .where()
      .gt("endsAt", searchDate.toDate)
      .list
      .map(p =>
        new Interval(normalizeMaintenanceTime(p.getStartsAt), normalizeMaintenanceTime(p.getEndsAt))
      )

    val slots = getExamSlots(
      reservation.getUser,
      reservation.getMachine.getRoom,
      reservation.getEnrolment.getExam,
      searchDate,
      reservations,
      machines,
      periods
    )

    slots.exists(_.interval.contains(reservation.toInterval))

  override def parseSearchDate(day: String, exam: Exam, room: Option[ExamRoom]): Option[LocalDate] =
    val windowSize = getReservationWindowSize
    val dtz = room.map(r => DateTimeZone.forID(r.getLocalTimezone)).getOrElse(
      configReader.getDefaultTimeZone
    )
    val startOffset           = dtz.getOffset(exam.getPeriodStart)
    val offset                = dtz.getOffset(DateTime.now())
    val now                   = DateTime.now().plusMillis(offset).toLocalDate
    val reservationWindowDate = now.plusDays(windowSize)

    val examEndDate = new DateTime(exam.getPeriodEnd).plusMillis(offset).toLocalDate
    val searchEndDate =
      if reservationWindowDate.isBefore(examEndDate) then reservationWindowDate else examEndDate
    val examStartDate = new DateTime(exam.getPeriodStart).plusMillis(startOffset).toLocalDate

    val initialDate =
      if day.isEmpty then now else ISODateTimeFormat.dateTimeParser().parseLocalDate(day)
    val weekStart = initialDate.withDayOfWeek(1)
    val afterNow  = if weekStart.isBefore(now) then now else weekStart
    // if searching for month(s) after exam's end month -> no can do
    if afterNow.isAfter(searchEndDate) then
      None
    else
      // Do not execute search before exam starts
      val searchDate = if afterNow.isBefore(examStartDate) then examStartDate else afterNow
      Some(searchDate)

  private def getEligibleMachines(
      room: ExamRoom,
      access: Seq[Long],
      exam: Exam
  ): List[ExamMachine] =
    val candidates = DB
      .find(classOf[ExamMachine])
      .fetch("room")
      .where()
      .eq("room.id", room.getId)
      .ne("outOfService", true)
      .ne("archived", true)
      .isNotNull("ipAddress")
      .isNotNull("name")
      .list

    candidates.filter { em =>
      isMachineAccessibilitySatisfied(em, access) && (Option(
        exam
      ).isEmpty || em.hasRequiredSoftware(exam))
    }

  override def getRandomMachine(
      room: ExamRoom,
      exam: Exam,
      start: DateTime,
      end: DateTime,
      aids: Seq[Long]
  ): Option[ExamMachine] =
    val machines   = getEligibleMachines(room, aids, exam)
    val wantedTime = new Interval(start, end)
    Random.shuffle(machines).find(!_.isReservedDuring(wantedTime))

  override def createReservation(
      start: DateTime,
      end: DateTime,
      machine: ExamMachine,
      user: User
  ): Reservation =
    val reservation = new Reservation()
    reservation.setEndAt(end)
    reservation.setStartAt(start)
    reservation.setMachine(machine)
    reservation.setUser(user)

    // If this is due in less than a day, make sure we won't send a reminder
    if start.minusDays(1).isBeforeNow then reservation.setReminderSent(true)

    reservation

  override def gatherSuitableSlots(
      room: ExamRoom,
      date: LocalDate,
      examDuration: Integer
  ): Seq[Interval] =
    // Resolve the opening hours for room and day
    val openingHours = dateTimeHandler.getWorkingHoursForDate(date, room)

    if openingHours.nonEmpty then
      allSlots(openingHours, room, date)
        .filter { slot =>
          val beginning = slot.getStart
          val openUntil = getEndOfOpeningHours(beginning, openingHours)
          !beginning.plusMinutes(examDuration).isAfter(openUntil)
        }
        .map(slot => new Interval(slot.getStart, slot.getStart.plusMinutes(examDuration)))
    else Seq.empty

  private def isReservationForExam(r: Reservation, e: Exam): Boolean =
    Option(r.getEnrolment.getExam) match
      case Some(exam) => exam == e
      case None =>
        Option(r.getEnrolment.getCollaborativeExam) match
          case Some(ce) => ce.getHash == e.getHash
          case None     => false

  override def handleReservations(
      examSlots: Map[Interval, Option[Int]],
      reservations: Seq[Reservation],
      exam: Exam,
      machines: Seq[ExamMachine],
      user: User
  ): Set[CalendarHandler.TimeSlot] =
    examSlots.map { (slot, value) =>
      val conflicting = getReservationsDuring(reservations, slot)

      if conflicting.nonEmpty then
        val concernsAnotherExam = conflicting.find(c => !isReservationForExam(c, exam))

        concernsAnotherExam match
          case Some(reservation) =>
            // User has a reservation to another exam
            val conflictingExam = Option(reservation.getEnrolment.getExam)
              .map(_.getName)
              .getOrElse(reservation.getEnrolment.getCollaborativeExam.getName)
            CalendarHandler.TimeSlot(reservation.toInterval, -1, conflictingExam)
          case None =>
            // User has an existing reservation to this exam
            val reservation = conflicting.head
            if reservation.toInterval != slot then
              // No matching slot found in this room, add the reservation as-is
              CalendarHandler.TimeSlot(reservation.toInterval, -1, "")
            else
              // This is exactly the same slot, avoid duplicates
              CalendarHandler.TimeSlot(slot, -1, "")
      else
        // Resolve available machine count
        val availableMachineCount: Int =
          if value.isDefined then value.get
          else machines.count(m => !isReservedByOthersDuring(m, slot, user))

        CalendarHandler.TimeSlot(slot, availableMachineCount, "")
    }.toSet

  private def getExamSlots(
      user: User,
      room: ExamRoom,
      exam: Exam,
      date: LocalDate,
      reservations: Seq[Reservation],
      machines: Seq[ExamMachine],
      maintenancePeriods: Seq[Interval]
  ): Set[CalendarHandler.TimeSlot] =
    val examDuration = exam.getDuration
    val examSlots = gatherSuitableSlots(room, date, examDuration)
      .filterNot(slot => maintenancePeriods.exists(_.overlaps(slot)))
    val map = examSlots.map(slot => slot -> None).toMap

    handleReservations(map, reservations, exam, machines, user)

  private def allSlots(
      openingHours: Iterable[DateTimeHandler.OpeningHours],
      room: ExamRoom,
      date: LocalDate
  ): List[Interval] =
    val startingHours = room.getExamStartingHours.asScala.toList match
      case Nil => createDefaultStartingHours(room.getLocalTimezone)
      case hs  => hs.sorted

    val now =
      DateTime.now().plusMillis(DateTimeZone.forID(room.getLocalTimezone).getOffset(DateTime.now()))

    openingHours.flatMap { oh =>
      val tzOffset = oh.timezoneOffset
      val instant  = if now.getDayOfYear == date.getDayOfYear then now else oh.hours.getStart
      val slotEnd  = oh.hours.getEnd

      Iterator
        .unfold(nextStartingTime(instant, startingHours, tzOffset)) { beginning =>
          Option(beginning).flatMap { b =>
            val nextBeginning = nextStartingTime(b.plusMillis(1), startingHours, tzOffset)

            if b.isBefore(oh.hours.getStart) then Option(nextBeginning).map(nb => (None, nb))
            else
              Option(nextBeginning) match
                case Some(nb) if !nb.isAfter(slotEnd) =>
                  Some((Some(new Interval(b.minusMillis(tzOffset), nb.minusMillis(tzOffset))), nb))
                case _ if b.isBefore(slotEnd) =>
                  // We have some spare time in the end
                  Some((
                    Some(new Interval(b.minusMillis(tzOffset), slotEnd.minusMillis(tzOffset))),
                    slotEnd
                  ))
                case _ => None
          }
        }
        .flatten
        .toList
    }.toList

  override def getReservationWindowSize: Int =
    Option(configReader.getOrCreateSettings("reservation_window_size", None, None).getValue)
      .map(_.toInt)
      .getOrElse(0)

  override def getEndSearchDate(searchDate: LocalDate, examEnd: LocalDate): LocalDate =
    val endOfWeek             = searchDate.dayOfWeek().withMaximumValue()
    val reservationWindowDate = LocalDate.now().plusDays(getReservationWindowSize)
    val endOfSearchDate =
      if examEnd.isBefore(reservationWindowDate) then examEnd else reservationWindowDate
    if endOfWeek.isBefore(endOfSearchDate) then endOfWeek else endOfSearchDate

  override def postProcessSlots(
      node: JsValue,
      date: String,
      exam: Exam,
      user: User
  ): Set[CalendarHandler.TimeSlot] =
    node match
      case JsArray(arr) =>
        val searchDate = LocalDate.parse(date, ISODateTimeFormat.dateParser())

        // user's reservations starting from now
        val reservations = DB
          .find(classOf[Reservation])
          .fetch("enrolment.exam")
          .where()
          .eq("user", user)
          .gt("startAt", searchDate.toDate)
          .list

        val dtf = ISODateTimeFormat.dateTimeParser()
        val map: Map[Interval, Option[Int]] = arr.map { slot =>
          val start     = dtf.parseDateTime((slot \ "start").as[String])
          val end       = dtf.parseDateTime((slot \ "end").as[String])
          val interval  = new Interval(start, end)
          val available = Some((slot \ "availableMachines").as[Int])
          interval -> available
        }.toMap

        val periods = DB
          .find(classOf[MaintenancePeriod])
          .where()
          .ge("endsAt", searchDate.withDayOfWeek(DateTimeConstants.MONDAY).toDate)
          .list
          .map(p =>
            new Interval(
              normalizeMaintenanceTime(p.getStartsAt),
              normalizeMaintenanceTime(p.getEndsAt)
            )
          )

        // Filter out slots that overlap a local maintenance period
        val filteredMap = map.filter((k, _) => !periods.exists(_.overlaps(k)))

        handleReservations(filteredMap, reservations, exam, Seq.empty, user)
      case _ => Set.empty

  override def handleExternalReservation(
      enrolment: ExamEnrolment,
      exam: Exam,
      node: JsValue,
      start: DateTime,
      end: DateTime,
      user: User,
      orgRef: String,
      roomRef: String,
      sectionIds: Seq[Long]
  ): Future[Option[Integer]] =
    val oldReservation = enrolment.getReservation
    val reservation    = new Reservation()
    reservation.setEndAt(end)
    reservation.setStartAt(start)
    reservation.setUser(user)
    reservation.setExternalRef((node \ "id").as[String])

    // If this is due in less than a day, make sure we won't send a reminder
    if start.minusDays(1).isBeforeNow then reservation.setReminderSent(true)

    val external = new ExternalReservation()
    external.setOrgRef(orgRef)
    external.setRoomRef(roomRef)
    external.setOrgName((node \ "orgName").asOpt[String].orNull)
    external.setOrgCode((node \ "orgCode").asOpt[String].orNull)

    val machineNode = (node \ "machine").asOpt[JsValue].orNull
    val roomNode    = machineNode \ "room"
    external.setMachineName((machineNode \ "name").as[String])
    external.setRoomName((roomNode \ "name").as[String])
    external.setRoomCode((roomNode \ "roomCode").as[String])
    external.setRoomTz((roomNode \ "localTimezone").as[String])
    external.setRoomInstruction((roomNode \ "roomInstruction").asOpt[String].orNull)
    external.setRoomInstructionEN((roomNode \ "roomInstructionEN").asOpt[String].orNull)
    external.setRoomInstructionSV((roomNode \ "roomInstructionSV").asOpt[String].orNull)

    (roomNode \ "mailAddress").asOpt[JsValue].foreach { addressNode =>
      val mailAddress = new MailAddress()
      mailAddress.setStreet((addressNode \ "street").asOpt[String].orNull)
      mailAddress.setCity((addressNode \ "city").asOpt[String].orNull)
      mailAddress.setZip((addressNode \ "zip").asOpt[String].orNull)
      external.setMailAddress(mailAddress)
    }

    external.setBuildingName((roomNode \ "buildingName").asOpt[String].orNull)
    external.setCampus((roomNode \ "campus").asOpt[String].orNull)
    external.save()
    reservation.setExternalReservation(external)
    DB.save(reservation)
    enrolment.setReservation(reservation)
    enrolment.setReservationCanceled(false)

    val sections: Set[ExamSection] =
      if sectionIds.isEmpty then Set.empty
      else DB.find(classOf[ExamSection]).where().idIn(sectionIds.map(Long.box).asJava).distinct

    enrolment.getOptionalSections.clear()
    enrolment.update()
    enrolment.setOptionalSections(sections.asJava)
    DB.save(enrolment)

    // Finally, nuke the old reservation if any
    Option(oldReservation) match
      case Some(old) if Option(old.getExternalReservation).isDefined =>
        externalReservationHandler
          .removeExternalReservation(old)
          .map { errorOpt =>
            if errorOpt.isEmpty then
              DB.delete(old)
              postProcessRemoval(reservation, exam, user, machineNode)
            errorOpt.map(Int.box) // Return None if success, Some(errorCode) if error
          }
      case Some(old) =>
        DB.delete(old)
        postProcessRemoval(reservation, exam, user, machineNode)
        Future.successful(None)
      case None =>
        postProcessRemoval(reservation, exam, user, machineNode)
        Future.successful(None)

  override def normalizeMaintenanceTime(dateTime: DateTime): DateTime =
    val dtz = configReader.getDefaultTimeZone
    if dtz.isStandardOffset(dateTime.getMillis) then dateTime else dateTime.plusHours(1)

  override def checkEnrolment(
      enrolment: ExamEnrolment,
      user: User,
      sectionIds: Seq[Long]
  ): Option[Result] =
    if enrolment.getExam.getImplementation != Exam.Implementation.AQUARIUM then
      Some(Forbidden("SEB exam does not take reservations"))
    else
      val oldReservationOpt = Option(enrolment.getReservation)
      val exam              = enrolment.getExam

      // Removal is not permitted if the old reservation is in the past or if exam is already started
      if exam.getState == Exam.State.STUDENT_STARTED ||
        oldReservationOpt.exists(_.toInterval.isBefore(DateTime.now()))
      then Some(Forbidden("i18n_reservation_in_effect"))

      // If no previous reservation, check if allowed to participate
      else if oldReservationOpt.isEmpty && !enrolmentHandler.isAllowedToParticipate(exam, user) then
        Some(Forbidden("i18n_no_trials_left"))

      // Check that at least one section will end up in the exam
      else
        val sections = exam.getExamSections
        if sections.stream().allMatch(_.isOptional) then
          if !sections.stream().anyMatch(es => sectionIds.contains(es.getId)) then
            Some(Forbidden("No optional sections selected. At least one needed"))
          else checkExternalReservationAssessment(oldReservationOpt, enrolment)
        else checkExternalReservationAssessment(oldReservationOpt, enrolment)

  private def checkExternalReservationAssessment(
      oldReservationOpt: Option[Reservation],
      enrolment: ExamEnrolment
  ): Option[Result] =
    oldReservationOpt match
      case Some(oldRes)
          if Option(oldRes.getExternalRef).isDefined &&
            !oldRes.getStartAt.isAfter(dateTimeHandler.adjustDST(DateTime.now())) &&
            !enrolment.isNoShow &&
            enrolment.getExam.getState == Exam.State.PUBLISHED =>
        // External reservation - assessment not returned yet
        Some(Forbidden("i18n_enrolment_assessment_not_received"))
      case _ => None

  override def getEnrolment(examId: Long, user: User): ExamEnrolment =
    val now = dateTimeHandler.adjustDST(DateTime.now())
    DB.find(classOf[ExamEnrolment])
      .fetch("exam")
      .where()
      .eq("user", user)
      .eq("exam.id", examId)
      .eq("exam.state", Exam.State.PUBLISHED)
      .disjunction()
      .isNull("reservation")
      .gt("reservation.startAt", now.toDate)
      .endJunction()
      .findOne()

  private def postProcessRemoval(
      reservation: Reservation,
      exam: Exam,
      user: User,
      node: JsValue
  ): Unit =
    // Attach the external machine data just so that email can be generated
    reservation.setMachine(parseExternalMachineData(node))
    // Send some emails asynchronously
    emailComposer.scheduleEmail(1.second) {
      emailComposer.composeReservationNotification(user, reservation, exam, false)
      logger.info(s"Reservation confirmation email sent to ${user.getEmail}")
    }

  private def parseExternalMachineData(machineNode: JsValue): ExamMachine =
    val machine = new ExamMachine()
    machine.setName((machineNode \ "name").as[String])

    val roomNode = machineNode \ "room"
    val room     = new ExamRoom()
    room.setName((roomNode \ "name").as[String])
    room.setLocalTimezone((roomNode \ "localTimezone").as[String])

    (roomNode \ "roomCode").asOpt[String].foreach(room.setRoomCode)
    (roomNode \ "buildingName").asOpt[String].foreach(room.setBuildingName)
    (roomNode \ "roomInstruction").asOpt[String].foreach(room.setRoomInstruction)
    (roomNode \ "roomInstructionEN").asOpt[String].foreach(room.setRoomInstruction)
    (roomNode \ "roomInstructionSV").asOpt[String].foreach(room.setRoomInstruction)

    (roomNode \ "mailAddress").asOpt[JsValue].foreach { addressNode =>
      val address = new MailAddress()
      address.setStreet((addressNode \ "street").as[String])
      address.setCity((addressNode \ "city").as[String])
      address.setZip((addressNode \ "zip").as[String])
      room.setMailAddress(address)
    }
    machine.setRoom(room)
    machine

  private def isMachineAccessibilitySatisfied(machine: ExamMachine, wanted: Seq[Long]): Boolean =
    if machine.isAccessible then true
    else
      val machineAccessibility = machine.getAccessibilities.asScala
        .map(_.getId.asInstanceOf[Long])
        .toSet
      val wantedSet = wanted.toSet
      wantedSet.subsetOf(machineAccessibility)

  private def isRoomAccessibilitySatisfied(room: ExamRoom, wanted: Seq[Long]): Boolean =
    val roomAccessibility = room.getAccessibilities.asScala.map(_.getId.longValue()).toSet
    wanted.toSet.subsetOf(roomAccessibility)

  private def isReservedByUser(reservation: Reservation, user: User): Boolean =
    val externallyReserved =
      Option(reservation.getExternalUserRef).isDefined && reservation.getExternalRef == user.getEppn
    externallyReserved || Option(reservation.getUser).contains(user)

  private def isReservedByOthersDuring(
      machine: ExamMachine,
      interval: Interval,
      user: User
  ): Boolean =
    machine.getReservations.asScala
      .filter(r => !isReservedByUser(r, user))
      .exists(r => interval.overlaps(r.toInterval))

  private def getReservationsDuring(
      reservations: Seq[Reservation],
      interval: Interval
  ): List[Reservation] =
    reservations.filter(r => interval.overlaps(r.toInterval)).toList

  private def nextStartingTime(
      instant: DateTime,
      startingHours: List[ExamStartingHour],
      offset: Int
  ): DateTime =
    startingHours
      .map { sh =>
        val timeMs = new LocalTime(sh.getStartingHour).plusMillis(offset).getMillisOfDay
        instant.withMillisOfDay(timeMs)
      }
      .find(!_.isBefore(instant))
      .orNull

  private def createDefaultStartingHours(roomTz: String): List[ExamStartingHour] =
    // Deliberately get offset from Jan 1st to have no DST in effect
    val zone      = DateTimeZone.forID(roomTz)
    val beginning = DateTime.now().withDayOfYear(1).withTimeAtStartOfDay()
    val ending    = beginning.plusHours(LastHour)

    Iterator
      .iterate(beginning)(_.plusHours(1))
      .takeWhile(!_.isAfter(ending))
      .map { dt =>
        val esh = new ExamStartingHour()
        esh.setStartingHour(dt.toDate)
        esh.setTimezoneOffset(zone.getOffset(dt))
        esh
      }
      .toList

  private def getEndOfOpeningHours(
      instant: DateTime,
      openingHours: List[DateTimeHandler.OpeningHours]
  ): DateTime =
    openingHours
      .find(oh => oh.hours.contains(instant.plusMillis(oh.timezoneOffset)))
      .map(oh => oh.hours.getEnd.minusMillis(oh.timezoneOffset))
      .getOrElse(throw new RuntimeException(
        "slot not contained within opening hours, recheck logic!"
      ))
