// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.{CascadeType, Entity, ManyToMany}
import models.base.GeneratedIdentityModel

import scala.compiletime.uninitialized

@Entity
class Accessibility extends GeneratedIdentityModel:
  @ManyToMany(cascade = Array(CascadeType.ALL))
  @JsonBackReference
  var examRoom: java.util.List[ExamRoom] = uninitialized

  @ManyToMany(cascade = Array(CascadeType.ALL))
  @JsonBackReference
  var examMachine: java.util.List[ExamMachine] = uninitialized

  var name: String = uninitialized
