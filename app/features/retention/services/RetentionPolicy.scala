// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.retention.services

import com.typesafe.config.Config
import org.joda.time.{DateTime, DateTimeZone, Period}
import play.api.Logging

/** Retention periods for student data, read from `exam.retention.*`. Each period counts from the
  * event named in `conf/application.conf`.
  */
final case class RetentionPolicy(
    inactivity: Period,
    booking: Period,
    attempt: Period,
    maturityAttempt: Period,
    abortedAttempt: Period,
    autoLock: Period,
    record: Period,
    hostCopy: Period,
    dryRun: Boolean,
    batchSize: Int
)

object RetentionPolicy extends Logging:
  /** Institutions choose the attempt periods within these bounds. */
  val AttemptRange: (Period, Period)         = (Period.months(6), Period.years(1))
  val MaturityAttemptRange: (Period, Period) = (Period.months(6), Period.years(2))

  // Periods have no natural ordering (a month has no fixed length), so compare them by adding
  // them to a fixed instant
  private val Reference = new DateTime(2000, 1, 1, 0, 0, DateTimeZone.UTC)

  private def length(p: Period): Long = Reference.plus(p).getMillis

  def clamp(key: String, value: Period, range: (Period, Period)): Period =
    val (min, max) = range
    if length(value) < length(min) then
      logger.warn(s"$key = $value is below the allowed minimum $min, using $min")
      min
    else if length(value) > length(max) then
      logger.warn(s"$key = $value is above the allowed maximum $max, using $max")
      max
    else value

  def fromConfig(config: Config): RetentionPolicy =
    def period(key: String) = Period.parse(config.getString(s"exam.retention.$key"))
    RetentionPolicy(
      inactivity = period("student.inactivity"),
      booking = period("booking"),
      attempt = clamp("exam.retention.attempt.assessed", period("attempt.assessed"), AttemptRange),
      maturityAttempt = clamp(
        "exam.retention.attempt.maturity",
        period("attempt.maturity"),
        MaturityAttemptRange
      ),
      abortedAttempt = period("attempt.aborted"),
      autoLock = period("attempt.autolock"),
      record = period("record"),
      hostCopy = period("iop.hostCopy"),
      dryRun = config.getBoolean("exam.retention.dryRun"),
      batchSize = config.getInt("exam.retention.batchSize")
    )
