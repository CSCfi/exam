// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.datetime

import models.calendar.ExceptionWorkingHours
import models.facility.ExamRoom

import java.time.{Instant, LocalDate}

trait DateTimeHandler:
  import DateTimeHandler.*

  def findGaps(reserved: List[Interval], searchInterval: Interval): List[Interval]
  def getExceptionEvents(
      hours: List[ExceptionWorkingHours],
      date: LocalDate,
      restrictionType: RestrictionType,
      timezone: String
  ): List[Interval]

  def mergeSlots(slots: List[Interval]): List[Interval]
  def getDefaultWorkingHours(date: LocalDate, room: ExamRoom): List[OpeningHours]
  def getTimezoneOffset(instant: Instant): Int
  def getWorkingHoursForDate(date: LocalDate, room: ExamRoom): List[OpeningHours]

object DateTimeHandler:
  enum RestrictionType:
    case RESTRICTIVE, NON_RESTRICTIVE

  case class OpeningHours(hours: Interval)
