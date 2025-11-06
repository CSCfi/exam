// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.facility

import io.ebean.DB
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.DbApiHelper
import models.enrolment.Reservation
import models.facility.ExamRoom
import models.user.Role
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, Interval}
import play.api.libs.json.{Json, Writes}
import play.api.mvc.{Action, AnyContent, BaseController, ControllerComponents}
import security.scala.Auth.{AuthenticatedAction, authorized}

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

class AvailabilityController @Inject() (
    dateTimeHandler: DateTimeHandler,
    authenticated: AuthenticatedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with DbApiHelper:

  private def parseSearchStartDate(day: String): DateTime =
    ISODateTimeFormat.dateTimeParser().parseDateTime(day).withDayOfWeek(1).withMillisOfDay(0)

  private def getSearchEndDate(start: DateTime): DateTime =
    start.dayOfWeek().withMaximumValue().millisOfDay().withMaximumValue()

  private def getReservationsDuring(reservations: Seq[Reservation], interval: Interval): Seq[Reservation] =
    reservations.filter(r => interval.overlaps(r.toInterval))

  private def toOneHourChunks(i: Interval): Seq[Interval] =
    Iterator
      .iterate(i.getStart)(_.plusHours(1))
      .takeWhile(_.isBefore(i.getEnd))
      .map(start => new Interval(start, start.plusHours(1)))
      .toSeq

  private def round(slot: Interval): Interval =
    val cleanedStart = slot.getStart.withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0)
    val newEnd       = if slot.getEnd.getMinuteOfHour != 0 then slot.getEnd.plusHours(1) else slot.getEnd
    val cleanedEnd   = newEnd.withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0)
    slot.withStart(cleanedStart).withEnd(cleanedEnd)

  def getAvailability(roomId: Long, day: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      Option(DB.find(classOf[ExamRoom], roomId)) match
        case None => NotFound("room not found")
        case Some(room) =>
          val searchStart = parseSearchStartDate(day)
          val searchEnd   = getSearchEndDate(searchStart)
          val reservations = DB
            .find(classOf[Reservation])
            .where()
            .eq("machine.room.id", roomId)
            .between("startAt", searchStart.toDate, searchEnd.toDate)
            .list

          val allSlots = Iterator
            .iterate(searchStart.toLocalDate)(_.plusDays(1))
            .takeWhile(!_.isAfter(searchEnd.toLocalDate))
            .flatMap { date =>
              dateTimeHandler
                .getWorkingHoursForDate(date, room)
                .map { oh =>
                  new Interval(
                    oh.hours.getStart.minusMillis(oh.timezoneOffset),
                    oh.hours.getEnd.minusMillis(oh.timezoneOffset)
                  )
                }
                .map(round)
                .flatMap(toOneHourChunks)
            }
            .toSeq
            .distinct

          val reservationMap = allSlots.map(i => i -> getReservationsDuring(reservations, i)).toMap
          val machineCount   = room.getExamMachines.asScala.count(m => !m.getOutOfService)
          val availability = reservationMap.map { case (interval, res) =>
            Availability(interval, machineCount, res.size)
          }.toSeq
          Ok(Json.toJson(availability))
    }

  // DTO aimed for clients
  case class Availability(interval: Interval, total: Int, reserved: Int):
    val start: String = ISODateTimeFormat.dateTime().print(interval.getStart)
    val end: String   = ISODateTimeFormat.dateTime().print(interval.getEnd)

  object Availability:
    implicit val writes: Writes[Availability] = (a: Availability) =>
      Json.obj(
        "start"    -> a.start,
        "end"      -> a.end,
        "total"    -> a.total,
        "reserved" -> a.reserved
      )
