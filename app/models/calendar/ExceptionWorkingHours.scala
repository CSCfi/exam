// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.calendar

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonFormat}
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.facility.ExamRoom

import java.util.Date
import scala.compiletime.uninitialized

@Entity
class ExceptionWorkingHours extends GeneratedIdentityModel:
  @Temporal(TemporalType.TIMESTAMP)
  @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mmZ")
  var startDate: Date = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mmZ")
  var endDate: Date = uninitialized

  var outOfService: Boolean = false
  // TODO: Remove these and use room.localTimezone instead. Alos make startDate and endDate be DateTimee.
  var startDateTimezoneOffset: Int = 0
  var endDateTimezoneOffset: Int   = 0

  @ManyToOne
  @JsonBackReference
  var room: ExamRoom = uninitialized

  override def equals(o: Any): Boolean = o match
    case e: ExceptionWorkingHours => this.id == e.id
    case _                        => false

  override def hashCode: Int = id.toInt
