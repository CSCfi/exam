// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all._
import io.ebean.DB
import database.EbeanQueryExtensions
import models.user.User
import org.joda.time.{DateTime, DateTimeConstants, Seconds}
import play.api.Logging
import services.config.ConfigReader
import services.mail.EmailComposer

import javax.inject.Inject
import scala.concurrent.duration._
import scala.util.Try

class WeeklyReportService @Inject() (
    private val composer: EmailComposer,
    private val configReader: ConfigReader
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  private def secondsUntilNextMondayRun(): Long =
    val now             = DateTime.now
    val defaultTimeZone = configReader.getDefaultTimeZone
    // Every Monday at 5AM UTC
    val adjustedHours = if defaultTimeZone.isStandardOffset(now.getMillis) then 5 else 4
    val normalNextRun = now
      .withHourOfDay(adjustedHours)
      .withMinuteOfHour(0)
      .withSecondOfMinute(0)
      .withMillisOfSecond(0)
      .plusWeeks(
        if (now.getDayOfWeek == DateTimeConstants.MONDAY) 0
        else 1
      )
      .withDayOfWeek(DateTimeConstants.MONDAY)
    // If it's a Monday after scheduled run time -> postpone
    val postponedRun =
      if !normalNextRun.isAfter(now) then normalNextRun.plusWeeks(1) else normalNextRun
    val nextRun =
      // Case for: now there's no DST in effect, but by the next run there will be.
      if adjustedHours == 5 && !defaultTimeZone.isStandardOffset(postponedRun.getMillis) then
        postponedRun.minusHours(1)
      // Case for: now there's DST in effect, but by the next run there won't be
      else if adjustedHours != 5 && defaultTimeZone.isStandardOffset(postponedRun.getMillis) then
        postponedRun.plusHours(1)
      else postponedRun

    val delaySeconds = Seconds.secondsBetween(now, nextRun).getSeconds + 1
    // Safeguard: Ensure delay is always positive and at least 1 hour to prevent loops
    // If calculation results in a negative or very small delay (e.g., due to DST edge cases),
    // schedule for next week instead
    val safeDelay = if delaySeconds <= 3600 then
      logger.warn(
        s"Calculated delay ($delaySeconds seconds) too small, scheduling for next week instead"
      )
      val nextWeekRun = nextRun.plusWeeks(1)
      Seconds.secondsBetween(now, nextWeekRun).getSeconds + 1
    else delaySeconds
    logger.info(s"Scheduled next weekly report to be run at $nextRun (in ${safeDelay} seconds)")
    safeDelay

  private def runReport(): IO[Unit] =
    IO.blocking {
      logger.info("Running weekly email report")
      DB.find(classOf[User])
        .fetch("language")
        .where
        .eq("roles.name", "TEACHER")
        .list
        .foreach(u =>
          Try(composer.composeWeeklySummary(u)).fold(
            e => logger.error(s"Failed to send email for ${u.getEmail}", e),
            _ => ()
          )
        )
    }

  private def loop: IO[Unit] =
    IO.sleep(secondsUntilNextMondayRun().seconds) *>
      runReport().handleErrorWith(e => IO(logger.error("Error running weekly report", e))) *>
      IO.defer(loop)

  def resource: Resource[IO, Unit] = Resource.make(loop.start)(_.cancel).void
