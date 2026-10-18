// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.services

import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.Reservation
import models.facility.ExamRoom
import services.datetime.DateTimeHandler
import services.datetime.Interval
import services.datetime.IntervalExtensions.*
import services.datetime.TimeUtils

import java.time.format.DateTimeFormatter
import java.time.temporal.{ChronoUnit, TemporalAdjusters}
import java.time.{DayOfWeek, Instant, ZoneOffset}
import javax.inject.Inject
import scala.jdk.CollectionConverters.*

import AvailabilityError.*

object AvailabilityService:
  case class Availability(interval: Interval, total: Int, reserved: Int):
    val start: String = DateTimeFormatter.ISO_INSTANT.format(interval.start)
    val end: String   = DateTimeFormatter.ISO_INSTANT.format(interval.end)

class AvailabilityService @Inject() (
    private val dateTimeHandler: DateTimeHandler
) extends EbeanQueryExtensions:

  def getAvailability(
      roomId: Long,
      day: String
  ): Either[AvailabilityError, Seq[AvailabilityService.Availability]] =
    Option(DB.find(classOf[ExamRoom], roomId)) match
      case None => Left(RoomNotFound)
      case Some(room) =>
        val searchStart = parseSearchStartDate(day)
        val searchEnd   = getSearchEndDate(searchStart)
        val reservations = DB
          .find(classOf[Reservation])
          .where()
          .eq("machine.room.id", roomId)
          .between("startAt", searchStart, searchEnd)
          .list

        val startDate = searchStart.atZone(ZoneOffset.UTC).toLocalDate
        val endDate   = searchEnd.atZone(ZoneOffset.UTC).toLocalDate
        val allSlots = Iterator
          .iterate(startDate)(_.plusDays(1))
          .takeWhile(!_.isAfter(endDate))
          .flatMap { date =>
            dateTimeHandler
              .getWorkingHoursForDate(date, room)
              .map(oh => oh.hours)
              .map(round)
              .flatMap(toOneHourChunks)
          }
          .toSeq
          .distinct

        val reservationMap = allSlots.map(i => i -> getReservationsDuring(reservations, i)).toMap
        val machineCount   = room.examMachines.asScala.count(m => !m.outOfService)
        val availability = reservationMap.map { case (interval, res) =>
          AvailabilityService.Availability(interval, machineCount, res.size)
        }.toSeq
        Right(availability)

  private def parseSearchStartDate(day: String): Instant =
    TimeUtils.parseInstant(day)
      .atZone(ZoneOffset.UTC)
      .`with`(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
      .truncatedTo(ChronoUnit.DAYS)
      .toInstant

  private def getSearchEndDate(start: Instant): Instant =
    start.atZone(ZoneOffset.UTC)
      .`with`(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
      .plusDays(1)
      .truncatedTo(ChronoUnit.DAYS)
      .minusNanos(1)
      .toInstant

  private def getReservationsDuring(
      reservations: Seq[Reservation],
      interval: Interval
  ): Seq[Reservation] =
    reservations.filter(r => interval.overlaps(r.toInterval))

  private def toOneHourChunks(i: Interval): Seq[Interval] =
    Iterator
      .iterate(i.start)(_.plus(java.time.Duration.ofHours(1)))
      .takeWhile(_.isBefore(i.end))
      .map(start => start to start.plus(java.time.Duration.ofHours(1)))
      .toSeq

  private def round(slot: Interval): Interval =
    val cleanedStart = slot.start.truncatedTo(ChronoUnit.HOURS)
    val endZdt       = slot.end.atZone(ZoneOffset.UTC)
    val roundedEnd =
      if endZdt.getMinute != 0 then
        endZdt.plusHours(1).truncatedTo(ChronoUnit.HOURS).toInstant
      else slot.end.truncatedTo(ChronoUnit.HOURS)
    cleanedStart to roundedEnd
