// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.datetime

import java.time.*
import java.time.format.{DateTimeFormatter, DateTimeParseException}

object TimeUtils:
  /** Parses an [[Instant]] from either a date-only string (`yyyy-MM-dd`) or a full ISO offset
    * datetime string (e.g. `2026-03-30T10:00:00Z`). Date-only strings are interpreted as midnight
    * UTC.
    */
  def parseInstant(s: String): Instant =
    try DateTimeFormatter.ISO_OFFSET_DATE_TIME.parse(s, Instant.from)
    catch
      case _: DateTimeParseException => LocalDate.parse(s).atStartOfDay(ZoneOffset.UTC).toInstant

  /** Converts a timezone string to a [[ZoneId]], falling back to UTC when the string is null or
    * blank (mirrors Joda's `DateTimeZone.forID(null)` behaviour).
    */
  def zoneIdOf(timezone: String): ZoneId =
    Option(timezone).filter(_.nonEmpty).map(ZoneId.of).getOrElse(ZoneOffset.UTC)
