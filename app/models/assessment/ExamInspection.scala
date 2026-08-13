// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonManagedReference}
import jakarta.persistence.{Entity, ManyToOne, OneToOne}
import models.base.GeneratedIdentityModel
import models.exam.Exam
import models.user.User

import scala.compiletime.uninitialized

@Entity
class ExamInspection extends GeneratedIdentityModel:
  @ManyToOne
  @JsonBackReference
  var exam: Exam = uninitialized

  @ManyToOne
  @JsonManagedReference
  var user: User = uninitialized

  @OneToOne
  var assignedBy: User = uninitialized

  @OneToOne
  @JsonBackReference
  var comment: Comment = uninitialized

  var ready: Boolean = false

  override def equals(o: Any): Boolean = o match
    case e: ExamInspection => this.id == e.id
    case _                 => false

  override def hashCode: Int = id.toInt
