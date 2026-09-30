// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package retention

import features.retention.services.*
import models.exam.ExamState
import org.joda.time.{DateTime, DateTimeZone, Period}
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

class RetentionRulesSpec extends AnyWordSpec with Matchers:

  private val policy = RetentionPolicy(
    inactivity = Period.months(6),
    booking = Period.years(2),
    attempt = Period.months(6),
    maturityAttempt = Period.months(6),
    abortedAttempt = Period.years(1),
    autoLock = Period.years(1),
    record = Period.years(2),
    hostCopy = Period.months(3),
    dryRun = false,
    batchSize = 500
  )

  private def at(y: Int, m: Int, d: Int) = new DateTime(y, m, d, 12, 0, DateTimeZone.UTC)

  private val t0 = at(2025, 1, 15)

  private def attempt(
      state: ExamState = ExamState.GRADED_LOGGED,
      maturity: Boolean = false,
      lockedAt: Option[DateTime] = Some(t0),
      gradedTime: Option[DateTime] = None,
      ended: Option[DateTime] = None,
      courseEnd: Option[DateTime] = None,
      examPeriodEnd: Option[DateTime] = None
  ) = AttemptFacts(state, maturity, lockedAt, gradedTime, ended, courseEnd, examPeriodEnd)

  // Checks the item is kept one day before `expiry` and is due exactly at it and a day after
  private def dueExactlyAt(expiresAt: Option[DateTime], expiry: DateTime): Unit =
    expiresAt mustBe Some(expiry)
    RetentionRules.isDue(expiresAt, expiry.minusDays(1)) mustBe false
    RetentionRules.isDue(expiresAt, expiry) mustBe true
    RetentionRules.isDue(expiresAt, expiry.plusDays(1)) mustBe true

  "isDue" should {
    "never be due without an expiry time" in {
      RetentionRules.isDue(None, at(2100, 1, 1)) mustBe false
    }
  }

  "autoLockAt" should {
    "lock unassessed attempts a year after the exam ended" in {
      for state <- Seq(ExamState.REVIEW, ExamState.REVIEW_STARTED, ExamState.GRADED) do
        dueExactlyAt(
          RetentionRules.autoLockAt(
            attempt(state = state, lockedAt = None, ended = Some(t0)),
            policy
          ),
          t0.plusYears(1)
        )
    }
    "leave locked, aborted and deleted attempts alone" in {
      for state <- RetentionRules.LockedStates + ExamState.ABORTED + ExamState.DELETED do
        RetentionRules.autoLockAt(attempt(state = state, ended = Some(t0)), policy) mustBe None
    }
    "not lock an attempt that has not ended" in {
      RetentionRules.autoLockAt(attempt(state = ExamState.REVIEW, ended = None), policy) mustBe None
    }
  }

  "attemptExpiresAt" should {
    "keep a locked attempt for the assessed period from locking" in {
      for state <- RetentionRules.LockedStates do
        dueExactlyAt(
          RetentionRules.attemptExpiresAt(attempt(state = state), policy),
          t0.plusMonths(6)
        )
    }
    "use the configured period up to a year" in {
      val longer = policy.copy(attempt = Period.years(1))
      dueExactlyAt(RetentionRules.attemptExpiresAt(attempt(), longer), t0.plusYears(1))
    }
    "use the maturity period for maturity exams" in {
      val p = policy.copy(maturityAttempt = Period.years(2))
      dueExactlyAt(RetentionRules.attemptExpiresAt(attempt(maturity = true), p), t0.plusYears(2))
      dueExactlyAt(RetentionRules.attemptExpiresAt(attempt(maturity = false), p), t0.plusMonths(6))
    }
    "keep an aborted attempt for a year from the end of the exam" in {
      val aborted = attempt(state = ExamState.ABORTED, lockedAt = None, ended = Some(t0))
      dueExactlyAt(RetentionRules.attemptExpiresAt(aborted, policy), t0.plusYears(1))
    }
    "never expire a locked attempt without a lock time" in {
      RetentionRules.attemptExpiresAt(
        attempt(lockedAt = None, gradedTime = Some(t0)),
        policy
      ) mustBe
        None
    }
    "never expire an attempt that is not locked" in {
      for state <- RetentionRules.UnlockedStates + ExamState.STUDENT_STARTED do
        RetentionRules.attemptExpiresAt(attempt(state = state), policy) mustBe None
    }
    "time copies already marked deleted from grading, or else from the end of the exam" in {
      val graded = attempt(
        state = ExamState.DELETED,
        lockedAt = None,
        gradedTime = Some(t0),
        ended = Some(t0.minusMonths(1))
      )
      dueExactlyAt(RetentionRules.attemptExpiresAt(graded, policy), t0.plusMonths(6))
      val ungraded = attempt(state = ExamState.DELETED, lockedAt = None, ended = Some(t0))
      dueExactlyAt(RetentionRules.attemptExpiresAt(ungraded, policy), t0.plusMonths(6))
      val noDates = attempt(state = ExamState.DELETED, lockedAt = None)
      RetentionRules.attemptExpiresAt(noDates, policy) mustBe None
    }

    "attempt-limit window" should {
      "keep the attempt until the course ends" in {
        val courseEnd = t0.plusMonths(9)
        dueExactlyAt(
          RetentionRules.attemptExpiresAt(attempt(courseEnd = Some(courseEnd)), policy),
          courseEnd
        )
      }
      "prefer the course end over the exam period end" in {
        val f = attempt(courseEnd = Some(t0.plusMonths(8)), examPeriodEnd = Some(t0.plusMonths(10)))
        RetentionRules.attemptExpiresAt(f, policy) mustBe Some(t0.plusMonths(8))
      }
      "fall back to the end of the exam's enrolment period" in {
        val f = attempt(examPeriodEnd = Some(t0.plusMonths(10)))
        RetentionRules.attemptExpiresAt(f, policy) mustBe Some(t0.plusMonths(10))
      }
      "not shorten the period when the window closes earlier" in {
        val f = attempt(courseEnd = Some(t0.plusMonths(2)))
        RetentionRules.attemptExpiresAt(f, policy) mustBe Some(t0.plusMonths(6))
      }
      "never keep an ordinary attempt beyond a year from locking" in {
        val f = attempt(courseEnd = Some(t0.plusYears(3)))
        RetentionRules.attemptExpiresAt(f, policy) mustBe Some(t0.plusYears(1))
      }
      "never keep a maturity attempt beyond two years from locking" in {
        val f = attempt(maturity = true, examPeriodEnd = Some(t0.plusYears(5)))
        RetentionRules.attemptExpiresAt(f, policy) mustBe Some(t0.plusYears(2))
      }
      "not apply to aborted attempts" in {
        val f = attempt(
          state = ExamState.ABORTED,
          lockedAt = None,
          ended = Some(t0),
          courseEnd = Some(t0.plusYears(3))
        )
        RetentionRules.attemptExpiresAt(f, policy) mustBe Some(t0.plusYears(1))
      }
    }
  }

  "recordExpiresAt" should {
    "keep grading records for two years" in {
      dueExactlyAt(RetentionRules.recordExpiresAt(Some(t0), policy), t0.plusYears(2))
      RetentionRules.recordExpiresAt(None, policy) mustBe None
    }
  }

  "bookingExpiresAt" should {
    val none = BookingFacts(None, None, None, attemptRetained = false)
    "count from the reservation start first" in {
      val f = none.copy(
        reservationStart = Some(t0),
        examinationEventStart = Some(t0.plusDays(1)),
        enrolledOn = Some(t0.minusDays(10))
      )
      dueExactlyAt(RetentionRules.bookingExpiresAt(f, policy), t0.plusYears(2))
    }
    "fall back to the examination event, then the enrolment time" in {
      val event = none.copy(examinationEventStart = Some(t0), enrolledOn = Some(t0.minusDays(10)))
      RetentionRules.bookingExpiresAt(event, policy) mustBe Some(t0.plusYears(2))
      val enrolled = none.copy(enrolledOn = Some(t0))
      RetentionRules.bookingExpiresAt(enrolled, policy) mustBe Some(t0.plusYears(2))
    }
    "never expire without any date" in {
      RetentionRules.bookingExpiresAt(none, policy) mustBe None
    }
    "never expire while the exam copy still exists" in {
      val f = none.copy(reservationStart = Some(t0), attemptRetained = true)
      RetentionRules.bookingExpiresAt(f, policy) mustBe None
    }
  }

  "hostReservationExpiresAt" should {
    "keep host-side visitor reservations for two years from their start" in {
      dueExactlyAt(RetentionRules.hostReservationExpiresAt(Some(t0), policy), t0.plusYears(2))
    }
  }

  "hostCopyExpiresAt" should {
    "keep the host copy of a visiting attempt for three months from sending" in {
      dueExactlyAt(RetentionRules.hostCopyExpiresAt(Some(t0), policy), t0.plusMonths(3))
      RetentionRules.hostCopyExpiresAt(None, policy) mustBe None
    }
  }

  "accountExpiresAt" should {
    val idle = AccountFacts(Some(t0), studentOnly = true, hasRemainingData = false)
    "delete a pure-student account six months after the last login" in {
      dueExactlyAt(RetentionRules.accountExpiresAt(idle, policy), t0.plusMonths(6))
    }
    "keep accounts with any other role" in {
      RetentionRules.accountExpiresAt(idle.copy(studentOnly = false), policy) mustBe None
    }
    "keep accounts that still have student data" in {
      RetentionRules.accountExpiresAt(idle.copy(hasRemainingData = true), policy) mustBe None
    }
    "never expire an account without a last login" in {
      RetentionRules.accountExpiresAt(idle.copy(lastLogin = None), policy) mustBe None
    }
  }
