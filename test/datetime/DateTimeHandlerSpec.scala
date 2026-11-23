// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package datetime

import models.calendar.{DefaultWorkingHours, ExceptionWorkingHours}
import models.facility.ExamRoom
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import services.datetime.DateTimeHandlerImpl
import services.datetime.Interval
import services.datetime.IntervalExtensions.*

import java.time.*
import java.time.format.TextStyle
import java.util.{Date, Locale}
import scala.jdk.CollectionConverters.*

/** When a room is open on a given day: its weekly hours, with exception events either closing it
  * (out of service) or keeping it open longer. These are what the booking calendar offers slots
  * from.
  */
class DateTimeHandlerSpec extends AnyWordSpec with Matchers:

  private val handler  = DateTimeHandlerImpl(null)
  private val helsinki = ZoneId.of("Europe/Helsinki")
  private val day      = LocalDate.of(2026, 1, 14) // a Wednesday, UTC+2

  private def at(time: String, date: LocalDate = day): Instant =
    date.atTime(LocalTime.parse(time)).atZone(helsinki).toInstant

  private def span(from: String, to: String): Interval = at(from) to at(to)

  private val ids = Iterator.from(1)

  // Exception events compare by id, so unsaved ones need their own to stay apart in a set
  private def exception(from: Instant, to: Instant, closed: Boolean): ExceptionWorkingHours =
    val e = new ExceptionWorkingHours
    e.id = ids.next().toLong
    e.startDate = Date.from(from)
    e.endDate = Date.from(to)
    e.outOfService = closed
    e

  private def room(
      exceptions: List[ExceptionWorkingHours] = Nil,
      closes: LocalTime = LocalTime.of(17, 0)
  ): ExamRoom =
    val hours = new DefaultWorkingHours
    hours.weekday = day.getDayOfWeek.getDisplayName(TextStyle.FULL, Locale.ENGLISH)
    hours.startTime = LocalTime.of(9, 0)
    hours.endTime = closes
    val r = new ExamRoom
    r.localTimezone = helsinki.getId
    r.defaultWorkingHours = java.util.Set.of(hours)
    r.calendarExceptionEvents = exceptions.toSet.asJava
    r

  private def openOn(r: ExamRoom, date: LocalDate = day): List[Interval] =
    handler.getWorkingHoursForDate(date, r).map(_.hours).sortBy(_.start)

  "Opening hours of a day" when:
    "there are no exceptions" should:
      "be the weekly hours in the room's zone" in:
        openOn(room()) must be(List(span("09:00", "17:00")))

      "end just before midnight when the room closes at midnight" in:
        openOn(room(closes = LocalTime.MIDNIGHT)) must be(
          List(at("09:00") to at("23:59:59.999"))
        )

      "be none on a day without weekly hours" in:
        openOn(room(), day.plusDays(1)) must be(empty)

    "the room is out of service for part of the day" should:
      "leave the hours before and after the break" in:
        openOn(room(List(exception(at("12:00"), at("13:00"), closed = true)))) must be(
          List(span("09:00", "12:00"), span("13:00", "17:00"))
        )

      "close the rest of the day when the break goes on to a later day" in:
        val r = room(List(exception(at("15:00"), at("10:00", day.plusDays(2)), closed = true)))
        openOn(r) must be(List(span("09:00", "15:00")))

      "open late when the break began on an earlier day" in:
        val r = room(List(exception(at("15:00", day.minusDays(1)), at("10:00"), closed = true)))
        openOn(r) must be(List(span("10:00", "17:00")))

      "stay open between breaks before and after the hours" in:
        val r = room(List(
          exception(at("07:00"), at("08:00"), closed = true),
          exception(at("18:00"), at("19:00"), closed = true)
        ))
        openOn(r) must be(List(span("09:00", "17:00")))

      "ignore a break on another day" in:
        val r = room(List(exception(
          at("12:00", day.plusDays(1)),
          at("13:00", day.plusDays(1)),
          closed = true
        )))
        openOn(r) must be(List(span("09:00", "17:00")))

    "the room is out of service all day" should:
      "not be open at all" in:
        val r = room(List(exception(at("00:00"), at("00:00", day.plusDays(1)), closed = true)))
        openOn(r) must be(empty)

      "not be open within a longer break either" in:
        val r =
          room(List(exception(at("08:00", day.minusDays(3)), at("08:00", day.plusDays(3)), true)))
        openOn(r) must be(empty)

    "the room is kept open longer" should:
      "extend the weekly hours" in:
        openOn(room(List(exception(at("16:00"), at("20:00"), closed = false)))) must be(
          List(span("09:00", "20:00"))
        )

      "open a day without weekly hours" in:
        val next = day.plusDays(1)
        val r    = room(List(exception(at("10:00", next), at("12:00", next), closed = false)))
        openOn(r, next) must be(List(at("10:00", next) to at("12:00", next)))

      "still be closed during a break" in:
        val r = room(List(
          exception(at("16:00"), at("20:00"), closed = false),
          exception(at("18:00"), at("19:00"), closed = true)
        ))
        openOn(r) must be(List(span("09:00", "18:00"), span("19:00", "20:00")))

  "Finding gaps between reservations" should:
    val day = span("09:00", "17:00")

    "give the whole period when nothing is reserved in it" in:
      handler.findGaps(Nil, day) must be(List(day))
      handler.findGaps(List(span("07:00", "09:00"), span("17:00", "18:00")), day) must be(List(day))

    "give the time before, between and after reservations" in:
      handler.findGaps(List(span("10:00", "11:00"), span("13:00", "14:00")), day) must be(List(
        span("09:00", "10:00"),
        span("11:00", "13:00"),
        span("14:00", "17:00")
      ))

    "give no gap where reservations meet each other or the ends of the period" in:
      handler.findGaps(
        List(span("08:00", "10:00"), span("10:00", "12:00"), span("15:00", "18:00")),
        day
      ) must be(List(span("12:00", "15:00")))

  "Merging slots" should:
    "leave nothing and a single slot as they are" in:
      handler.mergeSlots(Nil) must be(Nil)
      handler.mergeSlots(List(span("09:00", "10:00"))) must be(List(span("09:00", "10:00")))

    "join overlapping and touching slots, in any order" in:
      handler.mergeSlots(List(
        span("13:00", "14:00"),
        span("09:00", "11:00"),
        span("10:00", "12:00"),
        span("12:00", "12:30"),
        span("09:30", "10:00")
      )) must be(List(span("09:00", "12:30"), span("13:00", "14:00")))

    "keep the later end when one slot holds another" in:
      handler.mergeSlots(List(span("09:00", "17:00"), span("10:00", "11:00"))) must be(
        List(span("09:00", "17:00"))
      )
