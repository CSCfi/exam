// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.enrolment

import jakarta.persistence.{Entity, OneToOne}
import models.base.GeneratedIdentityModel
import models.exam.Exam
import services.datetime.Interval
import services.datetime.IntervalExtensions.*
import services.datetime.JsonInstant

import java.time.{Duration, Instant}
import scala.compiletime.uninitialized

@Entity
class ExaminationEvent extends GeneratedIdentityModel:
  @OneToOne(mappedBy = "examinationEvent")
  var examinationEventConfiguration: ExaminationEventConfiguration = uninitialized

  @JsonInstant var start: Instant = uninitialized

  var description: String = uninitialized
  var capacity: Int       = 0

  def toInterval(exam: Exam): Interval =
    start to start.plus(Duration.ofMinutes(exam.duration.toLong))

  override def equals(o: Any): Boolean = o match
    case e: ExaminationEvent => this.id == e.id
    case _                   => false

  override def hashCode: Int = id.toInt
