// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package datetime

import models.calendar.DefaultWorkingHours
import models.facility.ExamRoom
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import services.datetime.DateTimeHandlerImpl

import java.time.*
import java.time.format.TextStyle
import java.util.Locale

/** Working hours are stored as a plain local wall-clock TIME and belong to the room's own timezone:
  * evolution 149 rebuilt the column as `start_time AT TIME ZONE 'UTC'` plus the old
  * `timezone_offset`, which is local time by construction. Exam starting hours moved the same way
  * in 148, and `CalendarHandlerImpl.nextStartingTime` duly applies them to a room-zone
  * ZonedDateTime.
  *
  * A room that opens at 09:00 must therefore open at 09:00 local on both sides of a DST transition,
  * landing on a different UTC instant in winter than in summer.
  */
class WorkingHoursTimezoneSpec extends AnyWordSpec with Matchers:

  private val helsinki = ZoneId.of("Europe/Helsinki")

  // Neither getWorkingHoursForDate nor getDefaultWorkingHours reads the config; only
  // getTimezoneOffset does, and that is not exercised here.
  private val handler = DateTimeHandlerImpl(null)

  private val opens  = LocalTime.of(9, 0)
  private val closes = LocalTime.of(17, 0)

  private def roomOpenOn(date: LocalDate): ExamRoom =
    val hours = new DefaultWorkingHours
    hours.weekday = date.getDayOfWeek.getDisplayName(TextStyle.FULL, Locale.ENGLISH)
    hours.startTime = opens
    hours.endTime = closes

    val room = new ExamRoom
    room.localTimezone = helsinki.getId
    room.defaultWorkingHours = java.util.Set.of(hours)
    room.calendarExceptionEvents = java.util.Collections.emptySet()
    room

  private def openingHoursOn(date: LocalDate): (Instant, Instant) =
    handler.getWorkingHoursForDate(date, roomOpenOn(date)) match
      case oh :: Nil => (oh.hours.start, oh.hours.end)
      case other     => fail(s"expected exactly one opening hours interval, got: $other")

  private val winterDay = LocalDate.of(2026, 1, 14) // EET, UTC+2
  private val summerDay = LocalDate.of(2026, 7, 15) // EEST, UTC+3

  "Room working hours" when:
    "the room sits in a zone that observes DST" should:
      "resolve the stored local time against the room zone in winter" in:
        val (start, end) = openingHoursOn(winterDay)

        start must be(Instant.parse("2026-01-14T07:00:00Z"))
        end must be(Instant.parse("2026-01-14T15:00:00Z"))

      "resolve the stored local time against the room zone in summer" in:
        val (start, end) = openingHoursOn(summerDay)

        start must be(Instant.parse("2026-07-15T06:00:00Z"))
        end must be(Instant.parse("2026-07-15T14:00:00Z"))

      "keep the same local opening time on both sides of the DST boundary" in:
        val (winterStart, winterEnd) = openingHoursOn(winterDay)
        val (summerStart, summerEnd) = openingHoursOn(summerDay)

        winterStart.atZone(helsinki).toLocalTime must be(opens)
        summerStart.atZone(helsinki).toLocalTime must be(opens)
        winterEnd.atZone(helsinki).toLocalTime must be(closes)
        summerEnd.atZone(helsinki).toLocalTime must be(closes)
