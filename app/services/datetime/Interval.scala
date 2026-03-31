// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.datetime

import java.time.{Duration, Instant}

/** Replacement for org.joda.time.Interval backed by java.time.Instant.
  *
  * Semantics match Joda: start is inclusive, end is exclusive.
  */
case class Interval(start: Instant, end: Instant):
  require(!end.isBefore(start), s"End ($end) cannot be before start ($start)")

  def duration: Duration = Duration.between(start, end)

  /** True if the instant falls within [start, end). */
  def contains(instant: Instant): Boolean =
    !instant.isBefore(start) && instant.isBefore(end)

  /** True if the other interval is completely within this one. */
  def contains(other: Interval): Boolean =
    !other.start.isBefore(start) && !end.isBefore(other.end)

  /** True if the two intervals share any time (touching at a boundary does not count). */
  def overlaps(other: Interval): Boolean =
    start.isBefore(other.end) && other.start.isBefore(end)

  def intersect(other: Interval): Option[Interval] =
    if !overlaps(other) then None
    else
      val newStart = if start.isAfter(other.start) then start else other.start
      val newEnd   = if end.isBefore(other.end) then end else other.end
      Some(Interval(newStart, newEnd))

  /** True if the entire interval ends at or before the given instant. */
  def isBefore(instant: Instant): Boolean = !end.isAfter(instant)

  /** True if the interval has not yet started. */
  def isAfter(instant: Instant): Boolean = start.isAfter(instant)

  def isAfterNow: Boolean = isAfter(Instant.now())

object IntervalExtensions:
  /** Enables `x to y` syntax for Instant ranges. */
  extension (start: Instant)
    infix def to(end: Instant): Interval = Interval(start, end)
