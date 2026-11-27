// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility

import jakarta.persistence.Entity
import models.base.GeneratedIdentityModel

import scala.compiletime.uninitialized

@Entity
class MailAddress extends GeneratedIdentityModel:
  var street: String = uninitialized
  var zip: String    = uninitialized
  var city: String   = uninitialized

  override def toString: String = s"$street, $zip  $city"
