/*
 *
 *  * Copyright (c) 2024 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *  *
 *  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  * versions of the EUPL (the "Licence");
 *  * You may not use this work except in compliance with the Licence.
 *  * You may obtain a copy of the Licence at:
 *  *
 *  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */

package system.actors

import io.ebean.DB

import javax.inject.Inject
import models.Exam
import models.ExamRecord
import org.apache.pekko.actor.AbstractActor
import org.joda.time.DateTime
import play.api.Logging
import util.config.ConfigReader
import util.scala.DbApiHelper

import scala.jdk.CollectionConverters.*

class ExamExpirationActor @Inject (private val configReader: ConfigReader)
    extends AbstractActor
    with DbApiHelper
    with Logging:

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (s: String) =>
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

  // Disassociate exam from its creator, set state to deleted and erase any associated exam records
  private def cleanExamData(exam: Exam): Unit =
    exam.setState(Exam.State.DELETED)
    exam.setCreator(null)
    exam.update()
    DB.find(classOf[ExamRecord]).where.eq("exam", exam).list.foreach(_.delete)
