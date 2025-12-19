// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.mail

import com.google.inject.ImplementedBy
import models.assessment.LanguageInspection
import models.enrolment.{ExamEnrolment, ExaminationEvent, Reservation}
import models.exam.Exam
import models.iop.CollaborativeExam
import models.user.User

import scala.concurrent.duration.Duration

@ImplementedBy(value = classOf[EmailComposerImpl])
trait EmailComposer {

  /** Message sent to a student when a review is ready.
    */
  def composeInspectionReady(student: User, reviewer: Option[User], exam: Exam): Unit

  /** Message sent to other inspectors when a review is ready.
    */
  def composeInspectionMessage(inspector: User, sender: User, exam: Exam, msg: String): Unit
  def composeInspectionMessage(
      inspector: User,
      sender: User,
      ce: CollaborativeExam,
      exam: Exam,
      msg: String
  ): Unit

  /** Weekly summary report
    */
  def composeWeeklySummary(teacher: User): Unit

  /** Message sent to a student when a reservation has been made.
    */
  def composeReservationNotification(
      student: User,
      reservation: Reservation,
      exam: Exam,
      isReminder: Boolean
  ): Unit

  /** Message sent to a student when an examination event has been selected.
    */
  def composeExaminationEventNotification(
      student: User,
      enrolment: ExamEnrolment,
      isReminder: Boolean
  ): Unit

  /** Message sent to a student when an examination event has been canceled.
    */
  def composeExaminationEventCancellationNotification(
      user: User,
      exam: Exam,
      event: ExaminationEvent
  ): Unit
  def composeExaminationEventCancellationNotification(
      users: Set[User],
      exam: Exam,
      event: ExaminationEvent
  ): Unit

  /** Message sent to newly added inspectors.
    */
  def composeExamReviewRequest(toUser: User, fromUser: User, exam: Exam, message: String): Unit

  /** Message sent to a student when a reservation has been canceled.
    */
  def composeReservationCancellationNotification(
      student: User,
      reservation: Reservation,
      message: Option[String],
      isStudentUser: Boolean,
      enrolment: ExamEnrolment
  ): Unit

  /** Message sent to a student when externally made reservation has been canceled by hosting admin.
    */
  def composeExternalReservationCancellationNotification(
      reservation: Reservation,
      message: Option[String]
  ): Unit

  /** Message sent to a student when a reservation has been changed.
    */
  def composeReservationChangeNotification(
      current: Reservation,
      previous: Reservation
  ): Unit

  /** Message sent to a student when she has been enrolled to a private exam.
    */
  def composePrivateExamParticipantNotification(student: User, fromUser: User, exam: Exam): Unit

  /** Message sent to a teacher when a student has finished a private exam.
    */
  def composePrivateExamEnded(toUser: User, exam: Exam): Unit

  /** Message sent to a teacher when a student did not show up for a private exam.
    */
  def composeNoShowMessage(toUser: User, student: User, exam: Exam): Unit

  /** Message sent to a student when he did not show up for exam.
    */
  def composeNoShowMessage(student: User, examName: String, courseCode: String): Unit

  /** Message sent to teacher when language inspection is finished.
    */
  def composeLanguageInspectionFinishedMessage(
      toUser: User,
      inspector: User,
      inspection: LanguageInspection
  ): Unit

  /** Message sent to teacher when a collaborative exam is created in the system.
    */
  def composeCollaborativeExamAnnouncement(emails: Set[String], sender: User, exam: Exam): Unit

  /** Schedule an email action to run after a delay. The action runs in the background and errors
    * are logged.
    */
  def scheduleEmail(delay: Duration)(action: => Unit): Unit
}
