// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.user

import jakarta.persistence.Entity
import models.base.GeneratedIdentityModel

import scala.compiletime.uninitialized

@Entity
class Role extends GeneratedIdentityModel:
  var name: String = uninitialized

  override def equals(o: Any): Boolean = o match
    case r: Role => this.name == r.name
    case _       => false

  override def hashCode: Int = if name != null then name.hashCode else 0

object Role:
  enum Name:
    case STUDENT, TEACHER, ADMIN, SUPPORT

  def withName(name: String): Role =
    val role = new Role
    role.name = name
    role
