// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.enrolment

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonManagedReference}
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.exam.Exam
import models.iop.CollaborativeExam
import models.user.User
import services.datetime.JsonInstant

import java.time.Instant
import scala.compiletime.uninitialized

@Entity
class ExamParticipation extends GeneratedIdentityModel:
  @ManyToOne
  @JsonManagedReference
  var user: User = uninitialized

  @OneToOne
  @JsonBackReference
  var exam: Exam = uninitialized

  @ManyToOne
  @JsonBackReference
  var collaborativeExam: CollaborativeExam = uninitialized

  @OneToOne(cascade = Array(CascadeType.REMOVE))
  var reservation: Reservation = uninitialized

  @ManyToOne
  @JsonBackReference
  var examinationEvent: ExaminationEvent = uninitialized

  @JsonInstant var started: Instant  = uninitialized
  @JsonInstant var ended: Instant    = uninitialized
  @JsonInstant var duration: Instant = uninitialized // FIXME: maybe int in seconds
  @JsonInstant var deadline: Instant = uninitialized

  @JsonInstant
  var sentForReview: Instant = uninitialized

  override def equals(o: Any): Boolean = o match
    case e: ExamParticipation => this.id == e.id
    case _                    => false

  override def hashCode: Int = id.toInt
