// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.user

import jakarta.persistence.{Entity, Id}
import models.base.VersionedModel

import scala.compiletime.uninitialized

@Entity
class Language extends VersionedModel:
  @Id var code: String = uninitialized
  var name: String     = uninitialized

  override def equals(o: Any): Boolean = o match
    case l: Language => this.code == l.code
    case _           => false

  override def hashCode: Int = if code != null then code.hashCode else 0
