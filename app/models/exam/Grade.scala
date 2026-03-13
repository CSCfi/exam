// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam

import com.fasterxml.jackson.annotation.JsonBackReference
import io.ebean.Model
import jakarta.persistence.*

import scala.compiletime.uninitialized

@Entity
class Grade extends Model:
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  var id: Integer = uninitialized

  @ManyToOne
  @JsonBackReference
  var gradeScale: GradeScale = uninitialized

  var name: String                      = uninitialized
  var marksRejection: java.lang.Boolean = uninitialized

  override def equals(o: Any): Boolean = o match
    case g: Grade => this.id == g.id
    case _        => false

  override def hashCode: Int = if id != null then id.hashCode else 0

object Grade:
  type Type = GradeType
  val Type: Class[GradeType] = classOf[GradeType]
