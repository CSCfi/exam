// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl.mail

import com.google.inject.ImplementedBy
import models.assessment.LanguageInspection
import models.enrolment.{ExamEnrolment, ExaminationEvent, Reservation}
import models.exam.Exam
import models.iop.CollaborativeExam
import models.user.User

@ImplementedBy(value = classOf[EmailComposerImpl])
trait EmailComposer {

  /** Message sent to student when review is ready.
    */
  def composeInspectionReady(student: User, reviewer: User, exam: Exam): Unit

  /** Message sent to other inspectors when review is ready.
    */
  def composeInspectionMessage(inspector: User, sender: User, exam: Exam, msg: String): Unit
  def composeInspectionMessage(inspector: User, sender: User, ce: CollaborativeExam, exam: Exam, msg: String): Unit

  /** Weekly summary report
    */
  def composeWeeklySummary(teacher: User): Unit

  /** Message sent to student when reservation has been made.
    */
  def composeReservationNotification(student: User, reservation: Reservation, exam: Exam, isReminder: Boolean): Unit

  /** Message sent to student when examination event has been selected.
    */
  def composeExaminationEventNotification(student: User, enrolment: ExamEnrolment, isReminder: Boolean): Unit

  /** Message sent to student when examination event has been cancelled.
    */
  def composeExaminationEventCancellationNotification(user: User, exam: Exam, event: ExaminationEvent): Unit
  def composeExaminationEventCancellationNotification(users: Set[User], exam: Exam, event: ExaminationEvent): Unit

  /** Message sent to newly added inspectors.
    */
  def composeExamReviewRequest(toUser: User, fromUser: User, exam: Exam, message: String): Unit

  /** Message sent to student when reservation has been cancelled.
    */
  def composeReservationCancellationNotification(
      student: User,
      reservation: Reservation,
      message: Option[String],
      isStudentUser: Boolean,
      enrolment: ExamEnrolment
  ): Unit

  /** Message sent to student when externally made reservation has been cancelled by hosting admin.
    */
  def composeExternalReservationCancellationNotification(reservation: Reservation, message: Option[String]): Unit

  /** Message sent to student when reservation has been changed.
    */
  def composeReservationChangeNotification(
      current: Reservation,
      previous: Reservation,
      enrolment: ExamEnrolment
  ): Unit

  /** Message sent to student when he/she has been enrolled to a private exam.
    */
  def composePrivateExamParticipantNotification(student: User, fromUser: User, exam: Exam): Unit

  /** Message sent to teacher when student has finished a private exam.
    */
  def composePrivateExamEnded(toUser: User, exam: Exam): Unit

  /** Message sent to teacher when student did not show up for a private exam.
    */
  def composeNoShowMessage(toUser: User, student: User, exam: Exam): Unit

  /** Message sent to student when he did not show up for exam.
    */
  def composeNoShowMessage(student: User, examName: String, courseCode: String): Unit

  /** Message sent to teacher when language inspection is finished.
    */
  def composeLanguageInspectionFinishedMessage(toUser: User, inspector: User, inspection: LanguageInspection): Unit

  /** Message sent to teacher when collaborative exam is created in the system.
    */
  def composeCollaborativeExamAnnouncement(emails: Set[String], sender: User, exam: Exam): Unit
}
