// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}

/** Trait for scheduled background jobs that run continuously.
  *
  * All scheduled jobs should implement this trait and provide a `Resource[IO, Unit]` that manages the lifecycle of the
  * scheduled task (startup and shutdown).
  */
trait ScheduledJob:
  /** Resource that manages the lifecycle of the scheduled job.
    *
    * When allocated, starts the scheduled task. When released, cancels the task.
    */
  def resource: Resource[IO, Unit]
