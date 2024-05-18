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

import impl.EmailComposer
import io.ebean.DB

import javax.inject.Inject
import models.Reservation
import org.apache.pekko.actor.AbstractActor
import org.joda.time.DateTime
import play.api.Logging
import util.datetime.DateTimeHandler
import util.scala.DbApiHelper

class ReservationReminderActor @Inject (
    private val emailComposer: EmailComposer,
    private val dateTimeHandler: DateTimeHandler
) extends AbstractActor
    with DbApiHelper
    with Logging:

  private def remind(r: Reservation): Unit =
    emailComposer.composeReservationNotification(r.getUser, r, r.getEnrolment.getExam, true)
    r.setReminderSent(true)
    r.update()

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (s: String) =>
        logger.debug("Starting reservation reminder task ->")
        val now      = dateTimeHandler.adjustDST(DateTime.now)
        val tomorrow = now.plusDays(1)
        DB.find(classOf[Reservation])
          .fetch("enrolment.optionalSections")
          .fetch("enrolment.optionalSections.examMaterials")
          .fetch("enrolment")
          .fetch("enrolment.exam.examSections")
          .fetch("enrolment.exam.examSections.examMaterials")
          .where
          .isNotNull("enrolment.exam")
          .between("startAt", now, tomorrow)
          .ne("reminderSent", true)
          .list
          .foreach(remind)
        logger.debug("<- done")
    )
    .build
