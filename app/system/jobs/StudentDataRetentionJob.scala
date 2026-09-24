// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import features.retention.services.RetentionService
import org.joda.time.DateTime
import play.api.Logging
import services.config.ConfigReader

import javax.inject.Inject
import scala.concurrent.duration.*

object StudentDataRetentionJob:
  /** Hour of the night, in the default time zone, at which the job runs. */
  val RunHour = 2

  /** Time from `now` until the next run. Counting hours from midnight rather than setting the clock
    * time keeps this valid on the nights daylight saving time changes.
    */
  def untilNextRun(now: DateTime): FiniteDuration =
    val tonight = now.withTimeAtStartOfDay().plusHours(RunHour)
    val next =
      if tonight.isAfter(now) then tonight
      else now.plusDays(1).withTimeAtStartOfDay().plusHours(RunHour)
    (next.getMillis - now.getMillis).millis

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
      StudentDataRetentionJob.untilNextRun(DateTime.now(configReader.getDefaultTimeZone))
    ).flatMap(IO.sleep)
    val program: IO[Unit] = (waitForNight *> job).foreverM
    Resource.make(program.start)(_.cancel).void
