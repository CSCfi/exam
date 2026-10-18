// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import features.retention.services.RetentionService
import play.api.Logging
import services.config.ConfigReader
import services.retention.RetentionLimits

import java.time.{LocalDate, ZonedDateTime}
import javax.inject.Inject
import scala.concurrent.duration.*

object StudentDataRetentionJob:
  /** Time from `now` until the next run. Counting hours from midnight rather than setting the clock
    * time keeps this valid on the nights daylight saving time changes.
    */
  def untilNextRun(now: ZonedDateTime): FiniteDuration =
    def runOn(day: LocalDate) =
      day.atStartOfDay(now.getZone).plusHours(RetentionLimits.NightlyRunHour.toLong)
    val tonight = runOn(now.toLocalDate)
    val next    = if tonight.isAfter(now) then tonight else runOn(now.toLocalDate.plusDays(1))
    java.time.Duration.between(now, next).toMillis.millis

/** Runs the student data retention passes once a night, outside exam hours. The rules live in
  * RetentionService.
  */
class StudentDataRetentionJob @Inject() (service: RetentionService, configReader: ConfigReader)
    extends ScheduledJob
    with Logging:

  def resource: Resource[IO, Unit] =
    val job: IO[Unit] = service
      .run()
      .void
      .handleErrorWith(e => IO(logger.error("Error in student data retention", e)))
    val waitForNight = IO(
      StudentDataRetentionJob.untilNextRun(ZonedDateTime.now(configReader.getDefaultTimeZone))
    ).flatMap(IO.sleep)
    val program: IO[Unit] = (waitForNight *> job).foreverM
    Resource.make(program.start)(_.cancel).void
