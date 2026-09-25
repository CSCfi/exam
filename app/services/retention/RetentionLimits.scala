// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.retention

import org.joda.time.Period

/** Fixed limits of student data retention, from the consortium's retention proposal. The periods
  * each deployment may choose are read from `exam.retention.*` in `application.conf`. These are the
  * bounds and rules common to all deployments, so they are not configurable.
  */
object RetentionLimits:
  /** Range a deployment may choose its assessed attempt period from (proposal item 4). */
  val AttemptRange: (Period, Period) = (Period.months(6), Period.years(1))

  /** Range a deployment may choose its maturity exam period from (proposal item 5). */
  val MaturityAttemptRange: (Period, Period) = (Period.months(6), Period.years(2))

  /** Hour of the night, in the default time zone, at which the retention job runs. */
  val NightlyRunHour: Int = 2

  /** How long an item sent through XM is retried on every run before it is given up, or for exam
    * attempts retried only weekly.
    */
  val IopGiveUpAfter: Period = Period.days(30)

  /** How often an exam attempt that has kept failing past [[IopGiveUpAfter]] is retried. */
  val IopSlowRetryInterval: Period = Period.weeks(1)
