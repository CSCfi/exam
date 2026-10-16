// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.retention.services

import models.exam.ExamState
import services.datetime.TimeUtils.plusPeriod
import services.retention.RetentionLimits

import java.time.Instant

/** What the rules need to know about a student's exam copy. */
final case class AttemptFacts(
    state: ExamState,
    maturity: Boolean,
    lockedAt: Option[Instant],
    gradedTime: Option[Instant],
    ended: Option[Instant],
    // End of the window in which attempt limits apply: the course end date, or failing that the
    // end of the parent exam's enrolment period
    courseEnd: Option[Instant],
    examPeriodEnd: Option[Instant]
)

/** What the rules need to know about an enrolment and the reservation it holds. `attemptRetained`
  * is true while the student's exam copy still has content that retention looks after.
  */
final case class BookingFacts(
    reservationStart: Option[Instant],
    examinationEventStart: Option[Instant],
    enrolledOn: Option[Instant],
    attemptRetained: Boolean
)

/** What the rules need to know about a user account. */
final case class AccountFacts(
    lastLogin: Option[Instant],
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

  def isDue(expiresAt: Option[Instant], now: Instant): Boolean =
    expiresAt.exists(!_.isAfter(now))

  def autoLockAt(f: AttemptFacts, p: RetentionPolicy): Option[Instant] =
    if UnlockedStates.contains(f.state) then f.ended.map(plusPeriod(_, p.autoLock)) else None

  /** When the student's exam copy may be deleted, or None if it must be kept for now.
    *
    * Locked copies are kept for the attempt period from locking. While the attempt-limit window is
    * still open they are kept until it closes, but never beyond the top of the allowed range.
    * Copies that the old expiration job already marked DELETED are timed from grading, or from the
    * end of the exam if never graded.
    */
  def attemptExpiresAt(f: AttemptFacts, p: RetentionPolicy): Option[Instant] =
    f.state match
      case ExamState.ABORTED => attemptCountsFrom(f).map(plusPeriod(_, p.abortedAttempt))
      case s if LockedStates.contains(s) || s == ExamState.DELETED =>
        attemptCountsFrom(f).map(lockedExpiry(_, f, p))
      case _ => None

  /** The time an attempt's retention counts from: its lock time, the end of the exam for an aborted
    * or unfinished attempt, and grading or else the end of the exam for a copy the old job marked
    * deleted.
    */
  def attemptCountsFrom(f: AttemptFacts): Option[Instant] =
    f.state match
      case s if LockedStates.contains(s) => f.lockedAt
      case ExamState.DELETED             => f.gradedTime.orElse(f.ended)
      case _                             => f.ended

  private def lockedExpiry(lockedAt: Instant, f: AttemptFacts, p: RetentionPolicy): Instant =
    val (period, range) =
      if f.maturity then (p.maturityAttempt, RetentionLimits.MaturityAttemptRange)
      else (p.attempt, RetentionLimits.AttemptRange)
    val base   = plusPeriod(lockedAt, period)
    val cap    = plusPeriod(lockedAt, range._2)
    val window = f.courseEnd.orElse(f.examPeriodEnd)
    window.map(w => if w.isAfter(cap) then cap else w).filter(_.isAfter(base)).getOrElse(base)

  def recordExpiresAt(timeStamp: Option[Instant], p: RetentionPolicy): Option[Instant] =
    timeStamp.map(plusPeriod(_, p.record))

  /** When an enrolment, its reservation, its participation and the bare exam copy may be deleted.
    * Never while the attempt itself is still retained.
    */
  def bookingExpiresAt(f: BookingFacts, p: RetentionPolicy): Option[Instant] =
    if f.attemptRetained then None
    else bookingCountsFrom(f).map(plusPeriod(_, p.booking))

  /** The time a booking's retention counts from: the reservation, the examination event, or the
    * enrolment, whichever is known first.
    */
  def bookingCountsFrom(f: BookingFacts): Option[Instant] =
    f.reservationStart.orElse(f.examinationEventStart).orElse(f.enrolledOn)

  /** Host-side visitor reservations have no local enrolment and are timed from their start. */
  def hostReservationExpiresAt(start: Option[Instant], p: RetentionPolicy): Option[Instant] =
    start.map(plusPeriod(_, p.booking))

  def hostCopyExpiresAt(sent: Option[Instant], p: RetentionPolicy): Option[Instant] =
    sent.map(plusPeriod(_, p.hostCopy))

  /** Only pure-student accounts are deleted, and only once no other student data remains. */
  def accountExpiresAt(f: AccountFacts, p: RetentionPolicy): Option[Instant] =
    if !f.studentOnly || f.hasRemainingData then None
    else f.lastLogin.map(plusPeriod(_, p.inactivity))
