// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam

import io.ebean.Model
import jakarta.persistence.*

import java.util.Set
import scala.compiletime.uninitialized

@Entity
class GradeScale extends Model:
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  var id: Int = 0

  @OneToMany(mappedBy = "gradeScale", cascade = Array(CascadeType.ALL))
  var grades: Set[Grade] = uninitialized

  var description: String = uninitialized
  var externalRef: String = uninitialized
  var displayName: String = uninitialized

  def getType: GradeScale.Type = GradeScale.Type.get(description).orElse(null)

  override def equals(o: Any): Boolean = o match
    case s: GradeScale => this.id == s.id
    case _             => false

  override def hashCode: Int = id

object GradeScale:
  enum Type(val value: Int):
    case ZERO_TO_FIVE      extends Type(1)
    case LATIN             extends Type(2)
    case APPROVED_REJECTED extends Type(3)
    case OTHER             extends Type(4)

  object Type:
    def get(value: String): java.util.Optional[Type] =
      values.find(_.toString == value) match
        case Some(t) => java.util.Optional.of(t)
        case None    => java.util.Optional.empty()
