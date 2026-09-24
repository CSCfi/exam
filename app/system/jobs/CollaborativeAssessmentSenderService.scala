// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.syntax.all.concurrentParTraverseOps
import cats.effect.{IO, Resource}
import cats.syntax.all.*
import database.EbeanQueryExtensions
import features.iop.collaboration.services.CollaborativeExamLoaderService
import io.ebean.DB
import models.enrolment.ExamParticipation
import models.exam.ExamState
import play.api.Logging
import security.BlockingIOExecutionContext
import services.datetime.AppClock
import services.iop.*

import javax.inject.Inject
import scala.concurrent.duration.*

// This service sends participations to collaborative exams back to the proxy server to be assessed further.
class CollaborativeAssessmentSenderService @Inject() (
    private val collaborativeExamLoader: CollaborativeExamLoaderService,
    private val clock: AppClock,
    implicit val ec: BlockingIOExecutionContext
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  // Maximum number of concurrent HTTP requests
  private val maxConcurrency = 10

  private def send(participation: ExamParticipation): IO[Unit] =
    val ref = participation.collaborativeExam.externalRef
    logger.info(s"Sending collaborative assessment for exam $ref")
    IO.fromFuture(IO(collaborativeExamLoader.sendAssessmentWithAttachments(participation)))
      .handleError(DeliveryResult.Failed(_))
      .flatMap(result =>
        IopDelivery.decide(
          result,
          Option(participation.ended),
          clock.now(),
          AfterTimeLimit.SlowDown
        ) match
          case DeliveryDecision.Done =>
            IO(logger.info(s"Collaborative assessment for exam $ref processed successfully"))
          case DeliveryDecision.GiveUp(reason) =>
            // The attempt stays, it is handled by the retention job like any other
            IO.blocking {
              participation.deliveryAbandonedAt = clock.now()
              participation.update()
            } *> IO(logger.warn(s"Gave up sending collaborative assessment for exam $ref: $reason"))
          case DeliveryDecision.RetryLater(reason) =>
            markAttempted(participation) *> IO(
              logger.error(
                s"Failed to send collaborative assessment for exam $ref ($reason), retrying later"
              )
            )
          case DeliveryDecision.RetrySlowly(reason) =>
            markAttempted(participation) *> IO(
              logger.warn(s"Failed to send collaborative assessment for exam $ref: $reason")
            )
      )

  private def markAttempted(participation: ExamParticipation): IO[Unit] =
    IO.blocking {
      participation.deliveryAttemptedAt = clock.now()
      participation.update()
    }

  // Visible for tests
  def runCheck(): IO[Unit] =
    IO.blocking {
      logger.info("Starting collaborative assessment sending check ->")
      val pp = collaborativeExamLoader.getAssessmentPath
      DB.find(classOf[ExamParticipation])
        .apply(pp)
        .where
        .isNotNull("collaborativeExam")
        .in("exam.state", ExamState.ABORTED, ExamState.REVIEW)
        .isNull("sentForReview")
        .isNull("deliveryAbandonedAt")
        .isNotNull("started")
        .isNotNull("ended")
        .list
        // Attempts that have kept failing for long are tried only once a week
        .filter(p =>
          IopDelivery.isDueForAttempt(
            Option(p.ended),
            Option(p.deliveryAttemptedAt),
            clock.now()
          )
        )
    }.flatMap(participations =>
      val count = participations.size
      if count > 0 then
        logger.info(
          s"Processing $count collaborative assessments with max concurrency of $maxConcurrency"
        )
        participations
          .parTraverseN(maxConcurrency)(send)
          .handleErrorWith(e => IO(logger.error("Error processing collaborative assessments", e)))
      else IO(logger.info("No collaborative assessments to process"))
    ) *> IO(logger.info("<- done"))

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (80.seconds, 15.minutes)
    val job: IO[Unit] = runCheck().handleErrorWith(e =>
      IO(logger.error("Error in collaborative assessment sender", e))
    )
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
