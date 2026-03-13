// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.admin

import jakarta.persistence.Entity
import models.base.GeneratedIdentityModel

import scala.compiletime.uninitialized

@Entity
class GeneralSettings extends GeneratedIdentityModel:
  var name: String  = uninitialized
  var value: String = uninitialized
