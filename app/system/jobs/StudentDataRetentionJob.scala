// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import features.retention.services.RetentionService
import play.api.Logging

import javax.inject.Inject
import scala.concurrent.duration.*

/** Runs the student data retention passes once a day. The rules live in RetentionService. */
class StudentDataRetentionJob @Inject() (service: RetentionService) extends ScheduledJob
    with Logging:

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (1.hour, 1.day)
    val job: IO[Unit] = service
      .run()
      .void
      .handleErrorWith(e => IO(logger.error("Error in student data retention", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
