// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.calendar

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.facility.ExamRoom
import org.joda.time.{DateTime, Interval, LocalDate}
import services.datetime.JsonDateTime

import scala.compiletime.uninitialized

@Entity
class DefaultWorkingHours extends GeneratedIdentityModel:
  @Temporal(TemporalType.TIME)
  @JsonDateTime
  var startTime: DateTime = uninitialized

  @Temporal(TemporalType.TIME)
  @JsonDateTime
  var endTime: DateTime = uninitialized

  var timezoneOffset: Int = 0

  var weekday: String = uninitialized

  @ManyToOne
  @JsonBackReference
  var room: ExamRoom = uninitialized

  def overlaps(other: DefaultWorkingHours): Boolean =
    weekday == other.weekday && toInterval.overlaps(other.toInterval)

  private def toInterval: Interval =
    if startTime.isAfter(endTime) then
      new Interval(startTime.withDate(LocalDate.now).minusDays(1), endTime.withDate(LocalDate.now))
    else
      new Interval(startTime.withDate(LocalDate.now), endTime.withDate(LocalDate.now))

  override def equals(o: Any): Boolean = o match
    case d: DefaultWorkingHours => this.id == d.id
    case _                      => false

  override def hashCode: Int = id.toInt
