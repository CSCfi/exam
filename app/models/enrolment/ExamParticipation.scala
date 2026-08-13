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
import org.joda.time.DateTime
import services.datetime.JsonDateTime

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

  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var started: DateTime = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var ended: DateTime = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var duration: DateTime = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var deadline: DateTime = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var sentForReview: DateTime = uninitialized

  override def equals(o: Any): Boolean = o match
    case e: ExamParticipation => this.id == e.id
    case _                    => false

  override def hashCode: Int = id.toInt
