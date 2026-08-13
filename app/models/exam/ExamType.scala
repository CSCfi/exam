// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam

import jakarta.persistence.Entity
import models.base.GeneratedIdentityModel

import scala.compiletime.uninitialized

@Entity
class ExamType extends GeneratedIdentityModel:
  var `type`: String      = uninitialized
  var deprecated: Boolean = false
