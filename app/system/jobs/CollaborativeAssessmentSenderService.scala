// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all._
import features.iop.collaboration.api.CollaborativeExamLoader
import io.ebean.DB
import database.EbeanQueryExtensions
import models.enrolment.ExamParticipation
import models.exam.Exam
import play.api.Logging

import javax.inject.Inject
import scala.concurrent.duration._

// This service sends participations to collaborative exams back to the proxy server to be assessed further.
class CollaborativeAssessmentSenderService @Inject() (
    private val collaborativeExamLoader: CollaborativeExamLoader
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

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
        .foreach(collaborativeExamLoader.createAssessmentWithAttachments)
      logger.info("<- done")
    }

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (80.seconds, 15.minutes)
    val job: IO[Unit] = runCheck().handleErrorWith(e => IO(logger.error("Error in collaborative assessment sender", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
