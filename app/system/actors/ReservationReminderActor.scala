// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import impl.mail.EmailComposer
import io.ebean.DB
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.DbApiHelper
import models.enrolment.Reservation
import org.apache.pekko.actor.AbstractActor
import org.joda.time.DateTime
import play.api.Logging

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
      (_: String) =>
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
