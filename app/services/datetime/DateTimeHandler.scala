// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.datetime

import models.calendar.ExceptionWorkingHours
import models.enrolment.{ExternalReservation, Reservation}
import models.facility.ExamRoom
import org.joda.time._

trait DateTimeHandler:
  import DateTimeHandler.*

  def findGaps(reserved: List[Interval], searchInterval: Interval): List[Interval]
  def getExceptionEvents(
      hours: List[ExceptionWorkingHours],
      date: LocalDate,
      restrictionType: RestrictionType
  ): List[Interval]

  def mergeSlots(slots: List[Interval]): List[Interval]
  def resolveStartWorkingHourMillis(startTime: DateTime, timeZoneOffset: Int): Int
  def resolveEndWorkingHourMillis(endTime: DateTime, timeZoneOffset: Int): Int
  def adjustDST(dateTime: DateTime): DateTime
  def adjustDST(dateTime: DateTime, reservation: Reservation): DateTime
  def adjustDST(dateTime: DateTime, externalReservation: ExternalReservation): DateTime
  def adjustDST(dateTime: DateTime, room: ExamRoom): DateTime
  def normalize(dateTime: DateTime, reservation: Reservation): DateTime
  def normalize(dateTime: DateTime, dtz: DateTimeZone): DateTime
  def getDefaultWorkingHours(date: LocalDate, room: ExamRoom): List[OpeningHours]
  def getTimezoneOffset(date: LocalDate, room: ExamRoom): Int
  def getTimezoneOffset(date: DateTime): Int
  def getWorkingHoursForDate(date: LocalDate, room: ExamRoom): List[OpeningHours]

object DateTimeHandler:
  enum RestrictionType:
    case RESTRICTIVE, NON_RESTRICTIVE

  case class OpeningHours(hours: Interval, timezoneOffset: Int)
