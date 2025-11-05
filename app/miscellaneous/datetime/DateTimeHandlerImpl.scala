// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.datetime

import miscellaneous.config.ConfigReader
import miscellaneous.datetime.DateTimeHandler.{OpeningHours, RestrictionType}
import models.calendar.ExceptionWorkingHours
import models.enrolment.{ExternalReservation, Reservation}
import models.facility.ExamRoom
import org.joda.time.{DateTime, DateTimeZone, Interval, LocalDate}

import java.util.Locale
import javax.inject.Inject
import scala.annotation.tailrec
import scala.jdk.CollectionConverters.*

class DateTimeHandlerImpl @Inject() (configReader: ConfigReader) extends DateTimeHandler:
  import org.joda.time.DateTimeConstants.MILLIS_PER_DAY

  override def findGaps(reserved: List[Interval], searchInterval: Interval): List[Interval] =
    val (searchStart, searchEnd) = (searchInterval.getStart, searchInterval.getEnd)

    if hasNoOverlap(reserved, searchStart, searchEnd) then List(searchInterval)
    else
      val subReservedList  = removeNonOverlappingIntervals(reserved, searchInterval)
      val subEarliestStart = subReservedList.head.getStart
      val subLatestEnd     = subReservedList.last.getEnd

      val startGap = Option.when(searchStart.isBefore(subEarliestStart))(
        new Interval(searchStart, subEarliestStart)
      )
      val middleGaps = getExistingIntervalGaps(subReservedList)
      val endGap = Option.when(searchEnd.isAfter(subLatestEnd))(
        new Interval(subLatestEnd, searchEnd)
      )

      startGap.toList ++ middleGaps ++ endGap.toList

  private def getExistingIntervalGaps(reserved: List[Interval]): List[Interval] =
    reserved
      .sliding(2)
      .flatMap {
        case List(current, next) => Option(current.gap(next))
        case _                   => None
      }
      .toList

  private def removeNonOverlappingIntervals(reserved: List[Interval], searchInterval: Interval): List[Interval] =
    reserved.filter(_.overlaps(searchInterval))

  private def hasNoOverlap(reserved: List[Interval], searchStart: DateTime, searchEnd: DateTime): Boolean =
    val earliestStart = reserved.head.getStart
    val latestStop    = reserved.last.getEnd
    !searchEnd.isAfter(earliestStart) || !searchStart.isBefore(latestStop)

  override def getExceptionEvents(
      hours: List[ExceptionWorkingHours],
      date: LocalDate,
      restrictionType: RestrictionType
  ): List[Interval] =
    val wholeDay = date.toInterval

    hours.foldLeft(List.empty[Interval]) { (exceptions, ewh) =>
      val isApplicable =
        (restrictionType == RestrictionType.RESTRICTIVE && ewh.isOutOfService) ||
          (restrictionType == RestrictionType.NON_RESTRICTIVE && !ewh.isOutOfService)

      if !isApplicable then exceptions
      else
        val start     = new DateTime(ewh.getStartDate).plusMillis(ewh.getStartDateTimezoneOffset)
        val end       = new DateTime(ewh.getEndDate).plusMillis(ewh.getEndDateTimezoneOffset)
        val exception = new Interval(start, end)

        // Exception covers this day fully - just reset to the whole day
        if exception.contains(wholeDay) || exception.equals(wholeDay) then List(wholeDay)
        else if exception.overlaps(wholeDay) then
          val newException =
            // Exception starts this day but ends on a later day
            if start.toLocalDate.equals(date) && end.toLocalDate.isAfter(date) then
              new Interval(exception.getStart, wholeDay.getEnd)
            // Exception ends this day but starts on an earlier day
            else if start.toLocalDate.isBefore(date) && end.toLocalDate.equals(date) then
              new Interval(wholeDay.getStart, exception.getEnd)
            // Exception starts and ends this day
            else new Interval(exception.getStart.withDate(date), exception.getEnd.withDate(date))

          exceptions :+ newException
        else exceptions
    }

  override def mergeSlots(intervals: List[Interval]): List[Interval] =
    if intervals.size <= 1 then return intervals

    @tailrec
    def helper(slots: List[Interval]): List[Interval] =
      val sorted = slots.sortBy(_.getStart.getMillis)
      val (merged, wasMerged) = sorted.tail.foldLeft((List(sorted.head), false)) { case ((acc, isMerged), current) =>
        acc.lastOption match
          case Some(prev) if !current.getStart.isAfter(prev.getEnd) =>
            val laterEnding = if prev.getEnd.isAfter(current.getEnd) then prev.getEnd else current.getEnd
            val newInterval = new Interval(prev.getStart, laterEnding)
            (acc.init :+ newInterval, true)
          case _ =>
            (acc :+ current, isMerged)
      }
      if wasMerged then helper(merged) else merged

    helper(intervals)

  override def resolveStartWorkingHourMillis(startTime: DateTime, timeZoneOffset: Int): Int =
    resolveMillisOfDay(startTime, timeZoneOffset)

  override def resolveEndWorkingHourMillis(endTime: DateTime, timeZoneOffset: Int): Int =
    val millis = resolveMillisOfDay(endTime, timeZoneOffset)
    if millis == 0 then MILLIS_PER_DAY - 1 else millis

  override def adjustDST(dateTime: DateTime): DateTime =
    doAdjustDST(dateTime, None)

  override def adjustDST(dateTime: DateTime, reservation: Reservation): DateTime =
    Option(reservation.getExternalReservation) match
      case Some(externalReservation) => adjustDST(dateTime, externalReservation)
      case None                      => doAdjustDST(dateTime, Option(reservation.getMachine).map(_.getRoom))

  override def adjustDST(dateTime: DateTime, externalReservation: ExternalReservation): DateTime =
    val dtz = DateTimeZone.forID(externalReservation.getRoomTz)
    if !dtz.isStandardOffset(System.currentTimeMillis()) then dateTime.plusHours(1) else dateTime

  override def adjustDST(dateTime: DateTime, room: ExamRoom): DateTime =
    doAdjustDST(dateTime, Option(room))

  private def doAdjustDST(dateTime: DateTime, roomOpt: Option[ExamRoom]): DateTime =
    val dtz = roomOpt match
      case Some(room) => DateTimeZone.forID(room.getLocalTimezone)
      case None       => configReader.getDefaultTimeZone

    if !dtz.isStandardOffset(System.currentTimeMillis()) then dateTime.plusHours(1) else dateTime

  override def normalize(dateTime: DateTime, reservation: Reservation): DateTime =
    val dtz = Option(reservation.getMachine) match
      case Some(machine) => DateTimeZone.forID(machine.getRoom.getLocalTimezone)
      case None          => configReader.getDefaultTimeZone

    if !dtz.isStandardOffset(dateTime.getMillis) then dateTime.minusHours(1) else dateTime

  override def normalize(dateTime: DateTime, dtz: DateTimeZone): DateTime =
    if !dtz.isStandardOffset(dateTime.getMillis) then dateTime.minusHours(1) else dateTime

  override def getDefaultWorkingHours(date: LocalDate, room: ExamRoom): List[OpeningHours] =
    val day      = date.dayOfWeek().getAsText(Locale.ENGLISH)
    val midnight = date.toDateTimeAtStartOfDay

    room.getDefaultWorkingHours.asScala
      .filter(_.getWeekday.equalsIgnoreCase(day))
      .map { dwh =>
        val start = midnight.withMillisOfDay(
          resolveStartWorkingHourMillis(new DateTime(dwh.getStartTime), dwh.getTimezoneOffset)
        )
        val end = midnight.withMillisOfDay(
          resolveEndWorkingHourMillis(new DateTime(dwh.getEndTime), dwh.getTimezoneOffset)
        )
        OpeningHours(new Interval(start, end), dwh.getTimezoneOffset)
      }
      .toList

  override def getTimezoneOffset(date: LocalDate, room: ExamRoom): Int =
    val day = date.dayOfWeek().getAsText(Locale.ENGLISH)
    room.getDefaultWorkingHours.asScala
      .find(_.getWeekday.equalsIgnoreCase(day))
      .map(_.getTimezoneOffset)
      .getOrElse(0)

  override def getTimezoneOffset(date: DateTime): Int =
    configReader.getDefaultTimeZone.getOffset(date)

  override def getWorkingHoursForDate(date: LocalDate, room: ExamRoom): List[OpeningHours] =
    val workingHours = getDefaultWorkingHours(date, room)
    val extensionEvents = mergeSlots(
      getExceptionEvents(
        room.getCalendarExceptionEvents.asScala.toList,
        date,
        RestrictionType.NON_RESTRICTIVE
      )
    )

    val restrictionEvents = mergeSlots(
      getExceptionEvents(
        room.getCalendarExceptionEvents.asScala.toList,
        date,
        RestrictionType.RESTRICTIVE
      )
    )

    val updatedWorkingHours =
      if extensionEvents.nonEmpty then
        val unifiedIntervals = mergeSlots(workingHours.map(_.hours) ++ extensionEvents)
        val offset           = DateTimeZone.forID(room.getLocalTimezone).getOffset(DateTime.now().withDayOfYear(1))
        unifiedIntervals.map(interval => OpeningHours(interval, offset))
      else workingHours

    val availableHours =
      if restrictionEvents.nonEmpty then
        updatedWorkingHours.flatMap { hours =>
          findGaps(restrictionEvents, hours.hours).map(gap => OpeningHours(gap, hours.timezoneOffset))
        }
      else updatedWorkingHours

    availableHours

  private def resolveMillisOfDay(date: DateTime, offset: Long): Int =
    val millis = date.getMillisOfDay + offset
    if millis >= MILLIS_PER_DAY then Math.abs(millis - MILLIS_PER_DAY).toInt
    else millis.toInt
