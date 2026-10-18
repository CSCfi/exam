// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import database.EbeanQueryExtensions
import io.ebean.DB
import models.user.User
import play.api.Logging
import services.config.ConfigReader
import services.mail.EmailComposer

import java.time.{DayOfWeek, Duration, ZonedDateTime}
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.util.Try

class WeeklyReportService @Inject() (
    private val composer: EmailComposer,
    private val configReader: ConfigReader
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  private def secondsUntilNextMondayRun(): Long =
    val zoneId = configReader.getDefaultTimeZone
    val now    = ZonedDateTime.now(zoneId)
    val isDST  = zoneId.getRules.isDaylightSavings(now.toInstant)
    // Every Monday at 5AM UTC; shift by 1 hour if DST is in effect to maintain same wall time
    val adjustedHours = if !isDST then 5 else 4
    val normalNextRun = now
      .withHour(adjustedHours).withMinute(0).withSecond(0).withNano(0)
      .plusWeeks(if now.getDayOfWeek == DayOfWeek.MONDAY then 0 else 1)
      .`with`(DayOfWeek.MONDAY)
    // If it's a Monday after scheduled run time -> postpone
    val postponedRun =
      if !normalNextRun.isAfter(now) then normalNextRun.plusWeeks(1) else normalNextRun
    val nextDST = zoneId.getRules.isDaylightSavings(postponedRun.toInstant)
    val nextRun =
      // Case for: now there's no DST in effect, but by the next run there will be.
      if !isDST && nextDST then postponedRun.minusHours(1)
      // Case for: now there's DST in effect, but by the next run there won't be
      else if isDST && !nextDST then postponedRun.plusHours(1)
      else postponedRun

    val delaySeconds = Duration.between(now.toInstant, nextRun.toInstant).toSeconds + 1
    // Safeguard: Ensure delay is always positive and at least 1 hour to prevent loops
    // If calculation results in a negative or very small delay (e.g., due to DST edge cases),
    // schedule for next week instead
    val safeDelay = if delaySeconds <= 3600 then
      logger.warn(
        s"Calculated delay ($delaySeconds seconds) too small, scheduling for next week instead"
      )
      val nextWeekRun = nextRun.plusWeeks(1)
      Duration.between(now.toInstant, nextWeekRun.toInstant).toSeconds + 1
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
            e => logger.error(s"Failed to send email for ${u.email}", e),
            _ => ()
          )
        )
    }

  private def loop: IO[Unit] =
    IO.sleep(secondsUntilNextMondayRun().seconds) *>
      runReport().handleErrorWith(e => IO(logger.error("Error running weekly report", e))) *>
      IO.defer(loop)

  def resource: Resource[IO, Unit] = Resource.make(loop.start)(_.cancel).void
