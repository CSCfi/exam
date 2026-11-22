// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import database.EbeanPaths.path
import database.EbeanQueryExtensions
import io.ebean.DB
import models.user.User
import play.api.Logging
import services.config.ConfigReader
import services.mail.EmailComposer

import java.time.temporal.{ChronoUnit, TemporalAdjusters}
import java.time.{DayOfWeek, LocalTime, ZonedDateTime}
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.util.Try

object WeeklyReportService:
  private val RunAt = LocalTime.of(7, 0)

  /** The next Monday 07:00 after `now`, on the wall clock of `now`'s zone whatever its DST */
  def nextRun(now: ZonedDateTime): ZonedDateTime =
    val monday = now.toLocalDate.`with`(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY))
    val run    = monday.atTime(RunAt).atZone(now.getZone)
    if run.isAfter(now) then run else run.plusWeeks(1)

class WeeklyReportService @Inject() (
    private val composer: EmailComposer,
    private val configReader: ConfigReader
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  private def secondsUntilNextRun(): Long =
    val now  = ZonedDateTime.now(configReader.getDefaultTimeZone)
    val next = WeeklyReportService.nextRun(now)
    logger.info(s"Scheduled next weekly report to be run at $next")
    ChronoUnit.SECONDS.between(now, next) + 1

  // Visible for tests
  def runReport(): IO[Unit] =
    IO.blocking {
      logger.info("Running weekly email report")
      DB.find(classOf[User])
        .fetch(path[User]("language"))
        .where
        .eq(path[User]("roles.name"), "TEACHER")
        .list
        .foreach(u =>
          Try(composer.composeWeeklySummary(u)).fold(
            e => logger.error(s"Failed to send email for ${u.email}", e),
            _ => ()
          )
        )
    }

  private def loop: IO[Unit] =
    IO.sleep(secondsUntilNextRun().seconds) *>
      runReport().handleErrorWith(e => IO(logger.error("Error running weekly report", e))) *>
      IO.defer(loop)

  def resource: Resource[IO, Unit] = Resource.make(loop.start)(_.cancel).void
