// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.enrolment

import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.exam.ExamState
import models.user.User

import java.time.{Duration, Instant}
import java.util.Date
import javax.inject.Inject

class EnrolmentHandlerImpl @Inject() (noShowHandler: NoShowHandler) extends EnrolmentHandler
    with EbeanQueryExtensions:

  override def isAllowedToParticipate(exam: Exam, user: User): Boolean =
    handleNoShow(user, exam.id)

    Option(exam.trialCount) match
      case None => true
      case Some(trialCount) =>
        val trials = DB
          .find(classOf[ExamEnrolment])
          .fetch("exam")
          .where()
          .eq("user", user)
          .eq("exam.parent.id", exam.id)
          .ne("exam.state", ExamState.DELETED)
          .ne("exam.state", ExamState.INITIALIZED)
          .ne("retrialPermitted", true)
          .list
          .sortBy(-_.id) // Descending order

        if trials.size >= trialCount then trials.take(trialCount).exists(_.isProcessed)
        else true

  private def handleNoShow(user: User, examId: Long): Unit =
    val enrolments = DB
      .find(classOf[ExamEnrolment])
      .fetch("reservation")
      .fetch("exam")
      .fetch("examinationEventConfiguration.examinationEvent")
      .where()
      .eq("user", user)
      .eq("noShow", false)
      .or()
      .lt("reservation.endAt", new Date())
      // An event that has merely started is not over yet; the exam's duration still has to elapse.
      // The query cannot express that, so this only narrows the candidates - isElapsed decides.
      .lt("examinationEventConfiguration.examinationEvent.start", new Date())
      .endOr()
      // Either (a) exam id matches and exam state is published OR
      //        (b) collaborative exam id matches and exam is NULL
      .or()
      .and()
      .eq("exam.id", examId)
      .eq("exam.state", ExamState.PUBLISHED)
      .endAnd()
      .and()
      .eq("collaborativeExam.id", examId)
      .isNull("exam")
      .endAnd()
      .endOr()
      .isNull("reservation.externalReservation")
      .list
      .filter(isElapsed)

    noShowHandler.handleNoShows(enrolments, List.empty[Reservation])

  // Room reservations are already filtered by their end time in the query. Examination events only
  // carry a start, so their window is start + the exam's duration. Without an exam - a collaborative
  // enrolment - there is no duration to go by, so the query's verdict stands.
  private def isElapsed(enrolment: ExamEnrolment): Boolean =
    Option(enrolment.examinationEventConfiguration) match
      case None => true
      case Some(config) =>
        Option(enrolment.exam).forall(exam =>
          config.examinationEvent.start
            .plus(Duration.ofMinutes(exam.duration.toLong))
            .isBefore(Instant.now())
        )
