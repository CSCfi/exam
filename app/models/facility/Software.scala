// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.{CascadeType, Entity, ManyToMany}
import models.base.GeneratedIdentityModel
import models.exam.Exam

import scala.compiletime.uninitialized

@Entity
class Software extends GeneratedIdentityModel:
  @ManyToMany(cascade = Array(CascadeType.ALL), mappedBy = "softwareInfo")
  @JsonBackReference
  var machines: java.util.List[ExamMachine] = uninitialized

  @ManyToMany(cascade = Array(CascadeType.ALL), mappedBy = "softwares")
  @JsonBackReference
  var exams: java.util.List[Exam] = uninitialized

  var name: String = uninitialized

  override def equals(o: Any): Boolean = o match
    case s: Software => this.name == s.name
    case _           => false

  override def hashCode: Int =
    val base = super.hashCode
    31 * base + (if name != null then name.hashCode else 0)
