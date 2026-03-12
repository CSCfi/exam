// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.services

import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.ExamEnrolment
import models.user.User
import org.joda.time.{DateTime, Seconds}
import services.datetime.{AppClock, DateTimeHandler}

import javax.inject.Inject
import scala.util.Try

import TimeError.*

class TimeService @Inject() (
    private val dateTimeHandler: DateTimeHandler,
    private val clock: AppClock
) extends EbeanQueryExtensions:

  def getRemainingExamTime(hash: String, user: User): Either[TimeError, Long] =
    DB.find(classOf[ExamEnrolment])
      .fetch("externalExam")
      .where()
      .disjunction()
      .eq("exam.hash", hash)
      .eq("externalExam.hash", hash)
      .endJunction()
      .eq("user.id", user.getId)
      .find match
      case None => Left(EnrolmentNotFound)
      case Some(enrolment) =>
        val start    = getStart(enrolment)
        val duration = getDuration(enrolment)
        val now      = currentTime(enrolment)
        val timeLeft = Seconds.secondsBetween(now, start.plusMinutes(duration))
        Right(timeLeft.getSeconds)

  private def getStart(enrolment: ExamEnrolment): DateTime =
    Option(enrolment.getExaminationEventConfiguration) match
      case Some(config) => config.getExaminationEvent.getStart
      case None         => enrolment.getReservation.getStartAt

  private def currentTime(enrolment: ExamEnrolment): DateTime =
    Option(enrolment.getExaminationEventConfiguration) match
      case Some(_) => clock.now()
      case None    => dateTimeHandler.adjustDST(clock.now(), enrolment.getReservation)

  private def getDuration(enrolment: ExamEnrolment): Int =
    Option(enrolment.getExam) match
      case Some(exam) => exam.getDuration.intValue()
      case None =>
        Try(enrolment.getExternalExam.deserialize().getDuration.intValue()).getOrElse(0)
