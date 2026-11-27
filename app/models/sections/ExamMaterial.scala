// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.sections

import jakarta.persistence.{Entity, ManyToMany}
import models.base.OwnedModel
import models.user.User

import scala.compiletime.uninitialized

@Entity
final class ExamMaterial extends OwnedModel:
  @ManyToMany(mappedBy = "examMaterials")
  var examSections: java.util.Set[ExamSection] = uninitialized

  var name: String   = uninitialized
  var isbn: String   = uninitialized
  var author: String = uninitialized

  def copy(user: User): ExamMaterial =
    val m = new ExamMaterial
    m.name = name
    m.isbn = isbn
    m.author = author
    m.setCreatorWithDate(user)
    m.setModifierWithDate(user)
    m

  override def equals(o: Any): Boolean = o match
    case e: ExamMaterial => this.id == e.id
    case _               => false

  override def hashCode: Int = id.toInt
