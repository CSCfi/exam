// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam

import io.ebean.Model
import jakarta.persistence.{Entity, Id}

import scala.compiletime.uninitialized

@Entity
class ExamExecutionType extends Model:
  @Id
  var id: Integer = uninitialized

  var `type`: String  = uninitialized
  var active: Boolean = false

object ExamExecutionType:
  enum Type:
    case PRIVATE, PUBLIC, MATURITY, PRINTOUT
