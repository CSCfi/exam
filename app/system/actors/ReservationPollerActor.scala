// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import impl.NoShowHandler
import io.ebean.DB
import models.ExamEnrolment
import models.Reservation
import org.apache.pekko.actor.AbstractActor
import org.joda.time.DateTime
import play.api.Logging
import util.datetime.DateTimeHandler
import util.scala.DbApiHelper

import javax.inject.Inject
import scala.jdk.CollectionConverters._

class ReservationPollerActor @Inject (
    private val noShowHandler: NoShowHandler,
    private val dateTimeHandler: DateTimeHandler
) extends AbstractActor
    with Logging
    with DbApiHelper:

  private def isPast(ee: ExamEnrolment): Boolean =
    if ee.getExaminationEventConfiguration == null && ee.getReservation != null then
      val now = dateTimeHandler.adjustDST(DateTime.now)
      ee.getReservation.getEndAt.isBefore(now)
    else if ee.getExaminationEventConfiguration != null then
      val duration = ee.getExam.getDuration
      val start    = ee.getExaminationEventConfiguration.getExaminationEvent.getStart
      start.plusMinutes(duration).isBeforeNow
    else false

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (_: String) =>
        logger.debug("Starting no-show check ->")
        val enrolments = DB
          .find(classOf[ExamEnrolment])
          .fetch("exam")
          .fetch("collaborativeExam")
          .fetch("externalExam")
          .fetch("reservation")
          .fetch("examinationEventConfiguration.examinationEvent")
          .where
          .eq("noShow", false)
          .isNull("reservation.externalReservation")
          .list
          .filter(isPast)

        // The following are cases where external user has made a reservation but did not log in before
        // reservation ended. Mark those as no-shows as well.
        val reservations = DB
          .find(classOf[Reservation])
          .where
          .isNull("enrolment")
          .isNotNull("externalRef")
          .isNull("user")
          .isNotNull("externalUserRef")
          .eq("sentAsNoShow", false)
          .lt("endAt", dateTimeHandler.adjustDST(DateTime.now))
          .list

        if enrolments.isEmpty && reservations.isEmpty then logger.debug("None found")
        else noShowHandler.handleNoShows(enrolments.asJava, reservations.asJava)
        logger.debug("<- done")
    )
    .build
