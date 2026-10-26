// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.calendar

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonFormat}
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.facility.ExamRoom
import services.datetime.Interval
import services.datetime.IntervalExtensions.*

import java.time.*
import scala.compiletime.uninitialized

@Entity
class DefaultWorkingHours extends GeneratedIdentityModel:
  @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "H:mm")
  var startTime: LocalTime = uninitialized

  @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "H:mm")
  var endTime: LocalTime = uninitialized

  var weekday: String = uninitialized

  @ManyToOne
  @JsonBackReference
  var room: ExamRoom = uninitialized

  def overlaps(other: DefaultWorkingHours): Boolean =
    weekday == other.weekday && toInterval.overlaps(other.toInterval)

  private def toInterval: Interval =
    val today  = LocalDate.now(ZoneOffset.UTC)
    val start  = today.atTime(startTime).toInstant(ZoneOffset.UTC)
    val end    = today.atTime(endTime).toInstant(ZoneOffset.UTC)
    val (s, e) = if start.isAfter(end) then (start.minus(Duration.ofDays(1)), end) else (start, end)
    s to e

  override def equals(o: Any): Boolean = o match
    case d: DefaultWorkingHours => this.id == d.id
    case _                      => false

  override def hashCode: Int = id.toInt
