// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.scala.DbApiHelper
import models.assessment.ExamRecord
import models.exam.Exam
import org.apache.pekko.actor.AbstractActor
import org.joda.time.DateTime
import play.api.Logging

import javax.inject.Inject

class ExamExpirationActor @Inject (private val configReader: ConfigReader)
    extends AbstractActor
    with DbApiHelper
    with Logging:

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (_: String) =>
        logger.debug("Starting exam expiration check ->")
        val exams = DB
          .find(classOf[Exam])
          .where
          .disjunction
          .eq("state", Exam.State.GRADED_LOGGED)
          .eq("state", Exam.State.ARCHIVED)
          .eq("state", Exam.State.ABORTED)
          .eq("state", Exam.State.REJECTED)
          .endJunction
          .list
        val now = DateTime.now
        exams
          .map(exam =>
            val expirationDate =
              if exam.getState eq Exam.State.ABORTED then exam.getExamParticipation.getEnded
              else exam.getGradedTime
            (exam, Option(expirationDate))
          )
          .foreach((exam, expiration) =>
            expiration match
              case Some(date) if configReader.getExamExpirationDate(date).isBeforeNow =>
                cleanExamData(exam)
                logger.info(s"Marked exam ${exam.getId} as expired")
              case None => logger.error(s"no grading time for exam ${exam.getId}")
              case _    => // nothing to do
          )
        logger.debug("<- done")
    )
    .build

  // Disassociate an exam from its creator, set state to deleted and erase any associated exam records
  private def cleanExamData(exam: Exam): Unit =
    exam.setState(Exam.State.DELETED)
    exam.setCreator(null)
    exam.update()
    DB.find(classOf[ExamRecord]).where.eq("exam", exam).list.foreach(_.delete)
