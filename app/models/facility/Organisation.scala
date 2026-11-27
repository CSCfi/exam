// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.*
import models.base.GeneratedIdentityModel

import java.util.List
import scala.compiletime.uninitialized

@Entity
class Organisation extends GeneratedIdentityModel:
  @OneToMany(mappedBy = "parent")
  @JsonBackReference
  var children: java.util.List[Organisation] = uninitialized

  @ManyToOne(cascade = Array(CascadeType.PERSIST))
  var parent: Organisation = uninitialized

  var code: String             = uninitialized
  var name: String             = uninitialized
  var nameAbbreviation: String = uninitialized
