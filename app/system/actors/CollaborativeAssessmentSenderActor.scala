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
import play.api.Logging

import javax.inject.Inject

class CollaborativeAssessmentSenderActor @Inject (private val collaborativeExamLoader: CollaborativeExamLoader)
    extends AbstractActor
    with DbApiHelper
    with Logging:

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (_: String) =>
        logger.debug("Starting collaborative assessment sending check ->")
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
        logger.debug("<- done")
    )
    .build
