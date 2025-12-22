// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import controllers.iop.collaboration.api.CollaborativeExamLoader
import io.ebean.DB
import miscellaneous.scala.DbApiHelper
import models.enrolment.ExamParticipation
import models.exam.Exam
import org.apache.pekko.actor.AbstractActor
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{Sink, Source}
import play.api.Logging

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.FutureConverters.*

class CollaborativeAssessmentSenderActor @Inject (
    private val collaborativeExamLoader: CollaborativeExamLoader,
    implicit val ec: ExecutionContext,
    implicit val mat: Materializer
) extends AbstractActor
    with DbApiHelper
    with Logging:

  // Maximum number of concurrent HTTP requests
  private val maxConcurrency = 10

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (_: String) =>
        logger.info("Starting collaborative assessment sending check ->")
        val query = DB.find(classOf[ExamParticipation])
        val pp    = collaborativeExamLoader.getAssessmentPath
        pp.apply(query)
        val participations = query.where
          .isNotNull("collaborativeExam")
          .in("exam.state", Exam.State.ABORTED, Exam.State.REVIEW)
          .isNull("sentForReview")
          .isNotNull("started")
          .isNotNull("ended")
          .list

        val count = participations.size
        if count > 0 then
          logger.info(s"Processing $count collaborative assessments with max concurrency of $maxConcurrency")
          Source(participations)
            .mapAsync(maxConcurrency)(participation =>
              collaborativeExamLoader
                .createAssessmentWithAttachments(participation)
                .asScala
                .map(success =>
                  if success then
                    logger.info(s"Collaborative assessment for exam ${participation.getCollaborativeExam.getExternalRef} processed successfully")
                  else
                    logger.error(s"Failed to send collaborative assessment for exam ${participation.getCollaborativeExam.getExternalRef}")
                )
                .recover { case e: Exception =>
                  logger.error(s"Error sending collaborative assessment for exam ${participation.getCollaborativeExam.getExternalRef}", e)
                }
            )
            .runWith(Sink.ignore)
            .onComplete {
              case scala.util.Success(_) =>
                logger.info("<- Collaborative assessment sending check completed successfully")
              case scala.util.Failure(e) =>
                logger.error("Error processing collaborative assessments", e)
            }
        else
          logger.info("No collaborative assessments to process")
          logger.info("<- done")
    )
    .build
