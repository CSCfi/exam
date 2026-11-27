// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.user

import jakarta.persistence.Entity
import models.base.GeneratedIdentityModel

import scala.compiletime.uninitialized

@Entity
class Permission extends GeneratedIdentityModel:
  var `type`: PermissionType = uninitialized

  def value: String = `type`.toString

  override def equals(o: Any): Boolean = o match
    case p: Permission => this.`type` == p.`type`
    case _             => false

  override def hashCode: Int = if `type` != null then `type`.hashCode else 0

object Permission:
  type Type = PermissionType
  val Type: Class[PermissionType] = classOf[PermissionType]
