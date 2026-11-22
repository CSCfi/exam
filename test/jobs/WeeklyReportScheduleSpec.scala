// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package jobs

import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import system.jobs.WeeklyReportService

import java.time.*

/** The weekly report goes out on Mondays at 07:00 local time, summer and winter alike */
class WeeklyReportScheduleSpec extends AnyWordSpec with Matchers:

  private val Helsinki = ZoneId.of("Europe/Helsinki")

  private def at(text: String, zone: ZoneId = Helsinki): ZonedDateTime =
    LocalDateTime.parse(text).atZone(zone)

  private def next(text: String, zone: ZoneId = Helsinki): LocalDateTime =
    val run = WeeklyReportService.nextRun(at(text, zone))
    run.getDayOfWeek must be(DayOfWeek.MONDAY)
    run.getZone must be(zone)
    run.toLocalDateTime

  "The next weekly report" should:
    "be on the coming Monday at seven" in:
      next("2026-11-25T12:00") must be(LocalDateTime.parse("2026-11-30T07:00"))
      next("2026-11-29T23:59") must be(LocalDateTime.parse("2026-11-30T07:00"))

    "be later the same day on a Monday morning, and a week on once seven has passed" in:
      next("2026-11-30T06:59") must be(LocalDateTime.parse("2026-11-30T07:00"))
      next("2026-11-30T07:00") must be(LocalDateTime.parse("2026-12-07T07:00"))
      next("2026-11-30T15:00") must be(LocalDateTime.parse("2026-12-07T07:00"))

    "stay at seven in summer time and across the changes" in:
      next("2026-07-15T12:00") must be(LocalDateTime.parse("2026-07-20T07:00"))
      // Clocks go forward on Sunday 29 March 2026 and back on Sunday 25 October
      next("2026-03-27T12:00") must be(LocalDateTime.parse("2026-03-30T07:00"))
      next("2026-10-23T12:00") must be(LocalDateTime.parse("2026-10-26T07:00"))

    "follow the organisation's own zone" in:
      val sydney = ZoneId.of("Australia/Sydney")
      next("2026-04-01T12:00", sydney) must be(LocalDateTime.parse("2026-04-06T07:00"))

    "wait a whole week from the last run in normal time to the first in summer time" in:
      // Monday 23 March 2026 at seven is the last run before the clocks go forward
      val lastWinterRun = at("2026-03-23T07:00")
      val firstSummer   = WeeklyReportService.nextRun(lastWinterRun)

      firstSummer.toLocalDateTime must be(LocalDateTime.parse("2026-03-30T07:00"))
      // One hour short of a week, as an hour is skipped on the Sunday
      Duration.between(lastWinterRun, firstSummer) must be(Duration.ofHours(167))

    "run once a week, however the clocks change" in:
      // As the job loop does: wake a second after the planned run, report, plan the next one
      val runs = Iterator
        .iterate(WeeklyReportService.nextRun(at("2026-01-01T12:00")))(run =>
          WeeklyReportService.nextRun(run.plusSeconds(1))
        )
        .takeWhile(_.isBefore(at("2027-04-01T00:00")))
        .toList

      runs.map(_.toLocalDateTime.toLocalTime).distinct must be(List(LocalTime.of(7, 0)))
      runs.map(_.getDayOfWeek).distinct must be(List(DayOfWeek.MONDAY))
      runs.map(_.toLocalDate).distinct must have size runs.size
      runs.size must be(65)
      runs.zip(runs.tail).map((a, b) => Duration.between(a, b).toHours).distinct.sorted must be(
        List(167, 168, 169)
      )
