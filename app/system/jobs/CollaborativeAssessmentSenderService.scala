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
import models.exam.Exam
import play.api.Logging
import security.BlockingIOExecutionContext

import javax.inject.Inject
import scala.concurrent.duration.*

// This service sends participations to collaborative exams back to the proxy server to be assessed further.
class CollaborativeAssessmentSenderService @Inject() (
    private val collaborativeExamLoader: CollaborativeExamLoaderService,
    implicit val ec: BlockingIOExecutionContext
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  // Maximum number of concurrent HTTP requests
  private val maxConcurrency = 10

  private def send(participation: ExamParticipation): IO[Unit] =
    val ref = participation.getCollaborativeExam.getExternalRef
    logger.info(s"Sending collaborative assessment for exam $ref")
    IO.fromFuture(IO(collaborativeExamLoader.createAssessmentWithAttachments(participation)))
      .flatMap(success =>
        if success then
          IO(logger.info(s"Collaborative assessment for exam $ref processed successfully"))
        else IO(logger.error(s"Failed to send collaborative assessment for exam $ref"))
      )
      .handleErrorWith(e =>
        IO(logger.error(s"Error sending collaborative assessment for exam $ref", e))
      )
      .void

  private def runCheck(): IO[Unit] =
    IO.blocking {
      logger.info("Starting collaborative assessment sending check ->")
      val query = DB.find(classOf[ExamParticipation])
      val pp    = collaborativeExamLoader.getAssessmentPath
      pp.apply(query)
      query.where
        .isNotNull("collaborativeExam")
        .in("exam.state", Exam.State.ABORTED, Exam.State.REVIEW)
        .isNull("sentForReview")
        .isNotNull("started")
        .isNotNull("ended")
        .list
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
