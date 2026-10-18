// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package datetime

import models.calendar.DefaultWorkingHours
import models.facility.{ExamRoom, ExamStartingHour}
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import services.datetime.*

import java.time.*
import java.time.format.TextStyle
import java.util.Locale
import scala.jdk.CollectionConverters.*

/** Slot generation across DST transitions, driven through the real pipeline (gatherSuitableSlots ->
  * allSlots -> nextStartingTime) with the clock pinned.
  *
  * Opening hours and starting hours are both stored as local wall-clock times belonging to the
  * room's zone, so a room keeps the same local schedule on either side of a transition even though
  * the underlying instants shift. Exam duration, by contrast, is elapsed time: a 120-minute exam
  * lasts 120 real minutes even when it spans a fold or a gap.
  */
class SlotGenerationDstSpec extends AnyWordSpec with Matchers:

  private val helsinki = ZoneId.of("Europe/Helsinki")

  // Transitions confirmed against the tz database: +02 -> +03 at 2027-03-28T01:00Z (local
  // 03:00 jumps to 04:00) and +03 -> +02 at 2026-10-25T01:00Z (local 04:00 falls back to 03:00).
  private val fallBackDay   = LocalDate.of(2026, 10, 25)
  private val springForward = LocalDate.of(2027, 3, 28)
  private val winterDay     = LocalDate.of(2026, 1, 14)
  private val summerDay     = LocalDate.of(2026, 7, 15)

  // gatherSuitableSlots only reaches dateTimeHandler and clock; the rest stay unused.
  private def handlerAt(now: Instant) =
    CalendarHandlerImpl(null, null, null, DateTimeHandlerImpl(null), null, FixedAppClock(now), null)

  // A clock far from every tested date, so the "is today" branch never trims the morning.
  private val longAgo = Instant.parse("2020-01-01T00:00:00Z")

  private def room(on: LocalDate, opens: LocalTime, closes: LocalTime, every: List[LocalTime]) =
    val hours = new DefaultWorkingHours
    hours.weekday = on.getDayOfWeek.getDisplayName(TextStyle.FULL, Locale.ENGLISH)
    hours.startTime = opens
    hours.endTime = closes

    val room = new ExamRoom
    room.localTimezone = helsinki.getId
    room.defaultWorkingHours = java.util.Set.of(hours)
    room.calendarExceptionEvents = java.util.Collections.emptySet()
    // ExamStartingHour compares by id, so unsaved instances would collapse into one another.
    room.examStartingHours = java.util.Set.copyOf(
      every.zipWithIndex.map { (lt, i) =>
        val esh = new ExamStartingHour
        esh.id = (i + 1).toLong
        esh.startingHour = lt
        esh
      }.asJava
    )
    room

  private def slotsOn(
      date: LocalDate,
      opens: LocalTime = LocalTime.of(9, 0),
      closes: LocalTime = LocalTime.of(17, 0),
      every: List[LocalTime] = List(LocalTime.of(9, 0), LocalTime.of(11, 0), LocalTime.of(13, 0)),
      duration: Int = 120
  ): Seq[Interval] =
    handlerAt(longAgo).gatherSuitableSlots(room(date, opens, closes, every), date, duration)

  private def localStarts(slots: Seq[Interval]): Seq[LocalTime] =
    slots.map(_.start.atZone(helsinki).toLocalTime).sorted

  /** How long the slot looks on the room's wall clock, which a transition distorts. */
  private def wallClockSpans(slots: Seq[Interval]): Seq[Duration] = slots.map(s =>
    Duration.between(
      s.start.atZone(helsinki).toLocalDateTime,
      s.end.atZone(helsinki).toLocalDateTime
    )
  )

  /** How long the slot actually lasts, which a transition must not change. */
  private def elapsedSpans(slots: Seq[Interval]): Seq[Duration] =
    slots.map(s => Duration.between(s.start, s.end))

  "Slot generation" when:
    "the room observes DST" should:
      "offer the same local starting times in winter and in summer" in:
        localStarts(slotsOn(winterDay)) must be(localStarts(slotsOn(summerDay)))

      "anchor the first winter slot to the local opening time" in:
        slotsOn(winterDay).map(_.start).min must be(Instant.parse("2026-01-14T07:00:00Z"))

      "anchor the first summer slot to the local opening time" in:
        slotsOn(summerDay).map(_.start).min must be(Instant.parse("2026-07-15T06:00:00Z"))

    "the day contains a DST transition" should:
      "keep the local schedule on the fall-back day" in:
        // 09:00 is past the 04:00 -> 03:00 fold, so the room is back on +02 by then.
        slotsOn(fallBackDay).map(_.start).min must be(Instant.parse("2026-10-25T07:00:00Z"))
        localStarts(slotsOn(fallBackDay)) must be(localStarts(slotsOn(winterDay)))

      "keep the local schedule on the spring-forward day" in:
        // 09:00 is past the 03:00 -> 04:00 gap, so the room is already on +03.
        slotsOn(springForward).map(_.start).min must be(Instant.parse("2027-03-28T06:00:00Z"))
        localStarts(slotsOn(springForward)) must be(localStarts(slotsOn(summerDay)))

      "give a full exam hour back when a slot spans the fold" in:
        // Opening hours straddle the repeated 03:00-04:00 hour.
        val slots = slotsOn(
          fallBackDay,
          opens = LocalTime.of(1, 0),
          closes = LocalTime.of(8, 0),
          every = List(LocalTime.of(1, 0), LocalTime.of(3, 0), LocalTime.of(5, 0)),
          duration = 120
        )

        // The slot beginning at 03:00 local reads as one wall-clock hour, 03:00 to 04:00,
        // because the hour is lived through twice. The sitting is still a full two hours.
        wallClockSpans(slots) must contain(Duration.ofMinutes(60))
        every(elapsedSpans(slots)) must be(Duration.ofMinutes(120))

      "not eat an exam hour when a slot spans the gap" in:
        // Opening hours straddle the non-existent 03:00-04:00 hour.
        val slots = slotsOn(
          springForward,
          opens = LocalTime.of(1, 0),
          closes = LocalTime.of(8, 0),
          every = List(LocalTime.of(1, 0), LocalTime.of(4, 0), LocalTime.of(6, 0)),
          duration = 120
        )

        // Conversely the 01:00 slot reads as three wall-clock hours, 01:00 to 04:00, since
        // 03:00 never happens. Again the sitting itself is two hours.
        wallClockSpans(slots) must contain(Duration.ofMinutes(180))
        every(elapsedSpans(slots)) must be(Duration.ofMinutes(120))
