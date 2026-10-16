// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package helpers

import java.time.{Instant, ZoneOffset}

/** Calendar arithmetic on [[Instant]] for specs, done in UTC. Instant itself only adds fixed
  * lengths, which keeps month and year based retention fixtures readable.
  */
object InstantArithmetic:
  def utc(year: Int, month: Int, day: Int, hour: Int, minute: Int): Instant =
    java.time.LocalDateTime.of(year, month, day, hour, minute).toInstant(ZoneOffset.UTC)

  extension (i: Instant)
    private def zoned                 = i.atZone(ZoneOffset.UTC)
    def plusYears(n: Int): Instant    = zoned.plusYears(n.toLong).toInstant
    def plusMonths(n: Int): Instant   = zoned.plusMonths(n.toLong).toInstant
    def minusMonths(n: Int): Instant  = zoned.minusMonths(n.toLong).toInstant
    def plusDays(n: Int): Instant     = zoned.plusDays(n.toLong).toInstant
    def minusDays(n: Int): Instant    = zoned.minusDays(n.toLong).toInstant
    def plusHours(n: Int): Instant    = zoned.plusHours(n.toLong).toInstant
    def minusHours(n: Int): Instant   = zoned.minusHours(n.toLong).toInstant
    def plusMinutes(n: Int): Instant  = zoned.plusMinutes(n.toLong).toInstant
    def minusMinutes(n: Int): Instant = zoned.minusMinutes(n.toLong).toInstant
