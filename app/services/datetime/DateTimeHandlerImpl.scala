// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.datetime

import models.calendar.ExceptionWorkingHours
import models.facility.ExamRoom
import services.config.ConfigReader
import services.datetime.Interval
import services.datetime.IntervalExtensions.*

import java.time.*
import java.time.format.TextStyle
import java.util.Locale
import javax.inject.Inject
import scala.annotation.tailrec
import scala.jdk.CollectionConverters.*

import DateTimeHandler.{OpeningHours, RestrictionType}

class DateTimeHandlerImpl @Inject() (configReader: ConfigReader) extends DateTimeHandler:

  override def findGaps(reserved: List[Interval], searchInterval: Interval): List[Interval] =
    val (searchStart, searchEnd) = (searchInterval.start, searchInterval.end)

    if hasNoOverlap(reserved, searchStart, searchEnd) then List(searchInterval)
    else
      val subReservedList  = removeNonOverlappingIntervals(reserved, searchInterval)
      val subEarliestStart = subReservedList.head.start
      val subLatestEnd     = subReservedList.last.end

      val startGap =
        Option.when(searchStart.isBefore(subEarliestStart))(searchStart to subEarliestStart)
      val middleGaps = getExistingIntervalGaps(subReservedList)
      val endGap     = Option.when(searchEnd.isAfter(subLatestEnd))(subLatestEnd to searchEnd)

      startGap.toList ++ middleGaps ++ endGap.toList

  private def getExistingIntervalGaps(reserved: List[Interval]): List[Interval] =
    reserved
      .sliding(2)
      .flatMap {
        case List(current, next) =>
          Option.when(current.end.isBefore(next.start))(current.end to next.start)
        case _ => None
      }
      .toList

  private def removeNonOverlappingIntervals(
      reserved: List[Interval],
      searchInterval: Interval
  ): List[Interval] =
    reserved.filter(_.overlaps(searchInterval))

  private def hasNoOverlap(
      reserved: List[Interval],
      searchStart: Instant,
      searchEnd: Instant
  ): Boolean =
    val earliestStart = reserved.head.start
    val latestStop    = reserved.last.end
    !searchEnd.isAfter(earliestStart) || !searchStart.isBefore(latestStop)

  override def getExceptionEvents(
      hours: List[ExceptionWorkingHours],
      date: LocalDate,
      restrictionType: RestrictionType,
      timezone: String
  ): List[Interval] =
    val tz       = TimeUtils.zoneIdOf(timezone)
    val midnight = date.atStartOfDay(tz).toInstant
    val wholeDay = midnight to date.plusDays(1).atStartOfDay(tz).toInstant

    hours.foldLeft(List.empty[Interval]) { (exceptions, ewh) =>
      val isApplicable =
        (restrictionType == RestrictionType.RESTRICTIVE && ewh.outOfService) ||
          (restrictionType == RestrictionType.NON_RESTRICTIVE && !ewh.outOfService)

      if !isApplicable then exceptions
      else
        val startZdt     = ewh.startDate.toInstant.atZone(tz)
        val endZdt       = ewh.endDate.toInstant.atZone(tz)
        val exceptionInt = startZdt.toInstant to endZdt.toInstant

        if exceptionInt.contains(wholeDay) || exceptionInt == wholeDay then List(wholeDay)
        else if exceptionInt.overlaps(wholeDay) then
          val startLocal = startZdt.toLocalDate
          val endLocal   = endZdt.toLocalDate
          val newException =
            if startLocal == date && endLocal.isAfter(date) then
              exceptionInt.start to wholeDay.end
            else if startLocal.isBefore(date) && endLocal == date then
              wholeDay.start to exceptionInt.end
            else
              ZonedDateTime.of(date, startZdt.toLocalTime, tz).toInstant to
                ZonedDateTime.of(date, endZdt.toLocalTime, tz).toInstant

          exceptions :+ newException
        else exceptions
    }

  override def mergeSlots(intervals: List[Interval]): List[Interval] =
    if intervals.size <= 1 then intervals
    else
      @tailrec
      def helper(slots: List[Interval]): List[Interval] =
        val sorted = slots.sortBy(_.start.toEpochMilli)
        val (merged, wasMerged) =
          sorted.tail.foldLeft((List(sorted.head), false)) { case ((acc, isMerged), current) =>
            acc.lastOption match
              case Some(prev) if !current.start.isAfter(prev.end) =>
                val laterEnding = if prev.end.isAfter(current.end) then prev.end else current.end
                val newInterval = prev.start to laterEnding
                (acc.init :+ newInterval, true)
              case _ =>
                (acc :+ current, isMerged)
          }
        if wasMerged then helper(merged) else merged

      helper(intervals)

  override def getDefaultWorkingHours(date: LocalDate, room: ExamRoom): List[OpeningHours] =
    val day = date.getDayOfWeek.getDisplayName(TextStyle.FULL, Locale.ENGLISH)

    room.defaultWorkingHours.asScala
      .filter(_.weekday.equalsIgnoreCase(day))
      .map { dwh =>
        val endTime =
          if dwh.endTime == LocalTime.MIDNIGHT then LocalTime.of(23, 59, 59, 999_000_000)
          else dwh.endTime
        OpeningHours(
          date.atTime(dwh.startTime).atZone(ZoneOffset.UTC).toInstant to
            date.atTime(endTime).atZone(ZoneOffset.UTC).toInstant
        )
      }
      .toList

  override def getTimezoneOffset(instant: Instant): Int =
    ZoneId.of(configReader.getDefaultTimeZone.getId).getRules.getOffset(
      instant
    ).getTotalSeconds * 1000

  override def getWorkingHoursForDate(date: LocalDate, room: ExamRoom): List[OpeningHours] =
    val exceptionEvents = room.calendarExceptionEvents.asScala.toList
    val workingHours    = getDefaultWorkingHours(date, room)
    val extensionEvents = mergeSlots(
      getExceptionEvents(exceptionEvents, date, RestrictionType.NON_RESTRICTIVE, room.localTimezone)
    )
    val restrictionEvents = mergeSlots(
      getExceptionEvents(exceptionEvents, date, RestrictionType.RESTRICTIVE, room.localTimezone)
    )

    val updatedWorkingHours =
      if extensionEvents.nonEmpty then
        mergeSlots(workingHours.map(_.hours) ++ extensionEvents).map(OpeningHours.apply)
      else workingHours

    if restrictionEvents.nonEmpty then
      updatedWorkingHours.flatMap(oh =>
        findGaps(restrictionEvents, oh.hours).map(OpeningHours.apply)
      )
    else updatedWorkingHours
