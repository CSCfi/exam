// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions

import jakarta.persistence.*
import models.base.OwnedModel

import scala.compiletime.uninitialized

@Entity
@Table(uniqueConstraints = Array(new UniqueConstraint(columnNames = Array("name", "creator_id"))))
class Tag extends OwnedModel:
  @ManyToMany(mappedBy = "tags", cascade = Array(CascadeType.ALL))
  var questions: java.util.List[Question] = uninitialized

  var name: String = uninitialized

  override def equals(o: Any): Boolean = o match
    case t: Tag => this.name == t.name
    case _      => false

  override def hashCode: Int = if name != null then name.hashCode else 0
