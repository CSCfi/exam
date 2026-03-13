// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonFormat}
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import org.joda.time.LocalTime

import java.util.Date
import scala.compiletime.uninitialized

@Entity
class ExamStartingHour extends GeneratedIdentityModel with Ordered[ExamStartingHour]:
  @ManyToOne
  @JsonBackReference
  var room: ExamRoom = uninitialized

  @Temporal(TemporalType.TIME)
  @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mmZ")
  var startingHour: Date = uninitialized

  var timezoneOffset: Int = 0

  override def compare(o: ExamStartingHour): Int =
    new LocalTime(startingHour)
      .plusMillis(timezoneOffset)
      .compareTo(new LocalTime(o.startingHour).plusMillis(timezoneOffset))

  override def equals(o: Any): Boolean = o match
    case e: ExamStartingHour => this.id == e.id
    case _                   => false

  override def hashCode: Int = id.toInt
