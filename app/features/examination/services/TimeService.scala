// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.services

import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.ExamEnrolment
import models.user.User
import services.datetime.AppClock

import java.time.{Duration, Instant}
import javax.inject.Inject
import scala.util.Try

import TimeError.*

class TimeService @Inject() (
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
      .eq("user.id", user.id)
      .find match
      case None => Left(EnrolmentNotFound)
      case Some(enrolment) =>
        val start    = getStart(enrolment)
        val duration = getDuration(enrolment)
        val end      = start.plus(Duration.ofMinutes(duration.toLong))
        Right(Duration.between(clock.now(), end).toSeconds)

  private def getStart(enrolment: ExamEnrolment): Instant =
    Option(enrolment.examinationEventConfiguration) match
      case Some(config) => config.examinationEvent.start
      case None         => enrolment.reservation.startAt

  private def getDuration(enrolment: ExamEnrolment): Int =
    Option(enrolment.exam) match
      case Some(exam) => exam.duration.intValue()
      case None =>
        Try(enrolment.externalExam.deserialize.duration.intValue()).getOrElse(0)
