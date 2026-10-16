// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonFormat}
import jakarta.persistence.*
import models.base.GeneratedIdentityModel

import java.time.LocalTime
import scala.compiletime.uninitialized

@Entity
class ExamStartingHour extends GeneratedIdentityModel with Ordered[ExamStartingHour]:
  @ManyToOne
  @JsonBackReference
  var room: ExamRoom = uninitialized

  @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "H:mm")
  var startingHour: LocalTime = uninitialized

  override def compare(o: ExamStartingHour): Int =
    startingHour.compareTo(o.startingHour)

  override def equals(o: Any): Boolean = o match
    case e: ExamStartingHour => this.id == e.id
    case _                   => false

  override def hashCode: Int = id.toInt
