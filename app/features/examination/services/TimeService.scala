// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.services

import TimeError._
import io.ebean.DB
import database.EbeanQueryExtensions
import models.enrolment.ExamEnrolment
import models.user.User
import org.joda.time.{DateTime, Seconds}
import services.datetime.DateTimeHandler

import javax.inject.Inject
import scala.util.Try

class TimeService @Inject() (
    private val dateTimeHandler: DateTimeHandler
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
      case Some(_) => DateTime.now()
      case None    => dateTimeHandler.adjustDST(DateTime.now(), enrolment.getReservation)

  private def getDuration(enrolment: ExamEnrolment): Int =
    Option(enrolment.getExam) match
      case Some(exam) => exam.getDuration.intValue()
      case None =>
        Try(enrolment.getExternalExam.deserialize().getDuration.intValue()).getOrElse(0)
