// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.*
import models.base.GeneratedIdentityModel

import java.util.Date
import scala.compiletime.uninitialized

@Entity
class ExaminationDate extends GeneratedIdentityModel:
  @ManyToOne
  @JsonBackReference
  var exam: Exam = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  var date: Date = uninitialized

  override def equals(o: Any): Boolean = o match
    case e: ExaminationDate => this.id == e.id
    case _                  => false

  override def hashCode: Int = id.toInt
