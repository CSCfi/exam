// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.retention.services

import models.exam.ExamState
import org.joda.time.DateTime
import services.retention.RetentionLimits

/** What the rules need to know about a student's exam copy. */
final case class AttemptFacts(
    state: ExamState,
    maturity: Boolean,
    lockedAt: Option[DateTime],
    gradedTime: Option[DateTime],
    ended: Option[DateTime],
    // End of the window in which attempt limits apply: the course end date, or failing that the
    // end of the parent exam's enrolment period
    courseEnd: Option[DateTime],
    examPeriodEnd: Option[DateTime]
)

/** What the rules need to know about an enrolment and the reservation it holds. `attemptRetained`
  * is true while the student's exam copy still has content that retention looks after.
  */
final case class BookingFacts(
    reservationStart: Option[DateTime],
    examinationEventStart: Option[DateTime],
    enrolledOn: Option[DateTime],
    attemptRetained: Boolean
)

/** What the rules need to know about a user account. */
final case class AccountFacts(
    lastLogin: Option[DateTime],
    studentOnly: Boolean,
    hasRemainingData: Boolean
)

/** Pure retention rules. Every date that decides whether student data is kept is computed here. An
  * item is due when its expiry time is at or before `now`.
  */
object RetentionRules:
  val UnlockedStates: Set[ExamState] =
    Set(ExamState.REVIEW, ExamState.REVIEW_STARTED, ExamState.GRADED)
  val LockedStates: Set[ExamState] =
    Set(ExamState.GRADED_LOGGED, ExamState.ARCHIVED, ExamState.REJECTED)

  def isDue(expiresAt: Option[DateTime], now: DateTime): Boolean =
    expiresAt.exists(!_.isAfter(now))

  def autoLockAt(f: AttemptFacts, p: RetentionPolicy): Option[DateTime] =
    if UnlockedStates.contains(f.state) then f.ended.map(_.plus(p.autoLock)) else None

  /** When the student's exam copy may be deleted, or None if it must be kept for now.
    *
    * Locked copies are kept for the attempt period from locking. While the attempt-limit window is
    * still open they are kept until it closes, but never beyond the top of the allowed range.
    * Copies that the old expiration job already marked DELETED are timed from grading, or from the
    * end of the exam if never graded.
    */
  def attemptExpiresAt(f: AttemptFacts, p: RetentionPolicy): Option[DateTime] =
    f.state match
      case ExamState.ABORTED             => f.ended.map(_.plus(p.abortedAttempt))
      case s if LockedStates.contains(s) => f.lockedAt.map(lockedExpiry(_, f, p))
      case ExamState.DELETED             => f.gradedTime.orElse(f.ended).map(lockedExpiry(_, f, p))
      case _                             => None

  private def lockedExpiry(lockedAt: DateTime, f: AttemptFacts, p: RetentionPolicy): DateTime =
    val (period, range) =
      if f.maturity then (p.maturityAttempt, RetentionLimits.MaturityAttemptRange)
      else (p.attempt, RetentionLimits.AttemptRange)
    val base   = lockedAt.plus(period)
    val cap    = lockedAt.plus(range._2)
    val window = f.courseEnd.orElse(f.examPeriodEnd)
    window.map(w => if w.isAfter(cap) then cap else w).filter(_.isAfter(base)).getOrElse(base)

  def recordExpiresAt(timeStamp: Option[DateTime], p: RetentionPolicy): Option[DateTime] =
    timeStamp.map(_.plus(p.record))

  /** When an enrolment, its reservation, its participation and the bare exam copy may be deleted.
    * Never while the attempt itself is still retained.
    */
  def bookingExpiresAt(f: BookingFacts, p: RetentionPolicy): Option[DateTime] =
    if f.attemptRetained then None
    else
      f.reservationStart.orElse(f.examinationEventStart).orElse(f.enrolledOn).map(_.plus(p.booking))

  /** Host-side visitor reservations have no local enrolment and are timed from their start. */
  def hostReservationExpiresAt(start: Option[DateTime], p: RetentionPolicy): Option[DateTime] =
    start.map(_.plus(p.booking))

  def hostCopyExpiresAt(sent: Option[DateTime], p: RetentionPolicy): Option[DateTime] =
    sent.map(_.plus(p.hostCopy))

  /** Only pure-student accounts are deleted, and only once no other student data remains. */
  def accountExpiresAt(f: AccountFacts, p: RetentionPolicy): Option[DateTime] =
    if !f.studentOnly || f.hasRemainingData then None
    else f.lastLogin.map(_.plus(p.inactivity))
