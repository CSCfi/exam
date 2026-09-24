// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system

import cats.effect.IO
import cats.effect.unsafe.implicits.global
import cats.syntax.all.*
import features.retention.services.RetentionPolicy
import play.api.inject.ApplicationLifecycle
import play.api.{Environment, Logging, Mode}
import system.jobs.*

import javax.inject.{Inject, Singleton}

@Singleton
class SystemInitializer @Inject() (
    private val lifecycle: ApplicationLifecycle,
    private val env: Environment,
    private val autoSaver: ExamAutoSaverService,
    private val reservationPoller: ReservationPollerService,
    private val autoEvaluator: AutoEvaluationNotifierService,
    private val examExpirationPoller: ExamExpirationService,
    private val assessmentTransferor: AssessmentTransferService,
    private val collaborativeAssessmentTransferor: CollaborativeAssessmentSenderService,
    private val reservationReminder: ReservationReminderService,
    private val externalExamExpirationPoller: ExternalExamExpirationService,
    private val weeklyReportService: WeeklyReportService,
    private val studentDataRetention: StudentDataRetentionJob,
    private val retentionPolicy: RetentionPolicy
) extends Logging:
  // The retention job takes over from the old expiration jobs once a deployment switches its dry
  // run off. Until then they keep running, so today's expiry continues during the review period.
  private val legacyExpiryJobs: List[ScheduledJob] =
    if retentionPolicy.dryRun then List(examExpirationPoller, externalExamExpirationPoller)
    else Nil

  val jobs: List[ScheduledJob] =
    if env.mode == Mode.Test then Nil
    else
      List(
        autoSaver,
        reservationPoller,
        reservationReminder,
        autoEvaluator,
        assessmentTransferor,
        collaborativeAssessmentTransferor,
        weeklyReportService,
        studentDataRetention
      ) ++ legacyExpiryJobs

  // Start all jobs and register cleanup on Play shutdown (important for hot-reload in dev mode)
  jobs
    .map(_.resource)
    .sequence
    .void
    .allocated
    .flatMap { case (_, release) =>
      lifecycle.addStopHook { () =>
        logger.info("Shutting down scheduled jobs")
        release.attempt.flatMap(_ => IO.unit).unsafeToFuture()
      }
      IO.unit
    }
    .unsafeRunAndForget()
