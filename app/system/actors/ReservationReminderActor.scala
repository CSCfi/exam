// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import impl.EmailComposer
import io.ebean.DB
import models.Reservation
import org.apache.pekko.actor.AbstractActor
import org.joda.time.DateTime
import play.api.Logging
import util.datetime.DateTimeHandler
import util.scala.DbApiHelper

import javax.inject.Inject

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
