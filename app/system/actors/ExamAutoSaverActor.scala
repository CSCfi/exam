// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import controllers.admin.SettingsController
import impl.EmailComposer
import io.ebean.DB
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.DbApiHelper
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.Exam
import org.apache.pekko.actor.AbstractActor
import org.joda.time.DateTime
import play.api.Logging

import java.io.IOException
import javax.inject.Inject
import scala.jdk.CollectionConverters.*
import scala.util.control.Exception.catching

class ExamAutoSaverActor @Inject (private val composer: EmailComposer, private val dateTimeHandler: DateTimeHandler)
    extends AbstractActor
    with Logging
    with DbApiHelper:

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (_: String) =>
        logger.debug("Starting check for ongoing exams ->")
        checkLocalExams()
        checkExternalExams()
        logger.debug("<- done")
    )
    .build

  private def checkLocalExams(): Unit =
    val participants = DB
      .find(classOf[ExamParticipation])
      .fetch("exam")
      .fetch("reservation")
      .fetch("reservation.machine.room")
      .fetch("examinationEvent")
      .where
      .isNull("ended")
      .or
      .isNotNull("reservation")
      .isNotNull("examinationEvent")
      .endOr
      .list
    if participants.isEmpty then logger.debug("None found")
    else markEnded(participants)

  private def getNow(participation: ExamParticipation) =
    if Option(participation.getExaminationEvent).nonEmpty then DateTime.now
    else
      val reservation = participation.getReservation
      dateTimeHandler.adjustDST(DateTime.now, reservation.getMachine.getRoom)

  private def markEnded(participants: List[ExamParticipation]): Unit =
    participants.foreach(participation =>
      val exam        = participation.getExam
      val reservation = participation.getReservation
      val event       = participation.getExaminationEvent
      val reservationStart = new DateTime(
        if Option(reservation).isEmpty then event.getStart
        else reservation.getStartAt
      )
      val participationTimeLimit = reservationStart.plusMinutes(exam.getDuration)
      val now                    = getNow(participation)
      if participationTimeLimit.isBefore(now) then
        participation.setEnded(now)
        participation.setDuration(new DateTime(participation.getEnded.getMillis - participation.getStarted.getMillis))
        val settings     = SettingsController.getOrCreateSettings("review_deadline", null, "14")
        val deadlineDays = settings.getValue.toInt
        val deadline     = new DateTime(participation.getEnded).plusDays(deadlineDays)
        participation.setDeadline(deadline)
        participation.save()
        logger.info(s"Setting exam ${exam.getId} state to REVIEW")
        exam.save()
        if exam.isPrivate then
          // Notify teachers
          val recipients = exam.getParent.getExamOwners.asScala ++ exam.getExamInspections.asScala.map(_.getUser)
          recipients.foreach(r =>
            composer.composePrivateExamEnded(r, exam)
            logger.info(s"Email sent to ${r.getEmail}")
          )
      else logger.info(s"Exam ${exam.getId} is ongoing until $participationTimeLimit")
    )

  private def checkExternalExams(): Unit =
    DB
      .find(classOf[ExamEnrolment])
      .fetch("externalExam")
      .fetch("reservation")
      .fetch("reservation.machine.room")
      .where
      .isNotNull("externalExam")
      .isNotNull("externalExam.started")
      .isNull("externalExam.finished")
      .isNotNull("reservation.externalRef")
      .list
      .flatMap(enrolment =>
        catching(classOf[IOException]).either(enrolment.getExternalExam.deserialize()) match
          case Left(e) =>
            logger.error("Failed to parse content out of an external exam", e)
            None
          case Right(content) => Some((enrolment, content))
      )
      .foreach((enrolment, content) =>
        val (exam, reservation)    = (enrolment.getExternalExam, enrolment.getReservation)
        val reservationStart       = new DateTime(reservation.getStartAt)
        val participationTimeLimit = reservationStart.plusMinutes(content.getDuration)
        val now                    = dateTimeHandler.adjustDST(DateTime.now, reservation.getMachine.getRoom)
        if participationTimeLimit.isBefore(now) then
          exam.setFinished(now)
          content.setState(Exam.State.REVIEW)
          catching(classOf[IOException]).either(exam.serialize(content)) match
            case Left(e)  => logger.error("failed to parse content out of an external exam", e)
            case Right(_) => logger.info(s"Setting external exam ${exam.getHash} state to REVIEW")
      )
