// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.{Entity, ManyToOne}
import models.base.GeneratedIdentityModel
import models.exam.Grade

import scala.compiletime.uninitialized

@Entity
class GradeEvaluation extends GeneratedIdentityModel:
  @ManyToOne
  @JsonBackReference
  var autoEvaluationConfig: AutoEvaluationConfig = uninitialized

  @ManyToOne
  var grade: Grade = uninitialized

  var percentage: Integer = uninitialized

  def copy(): GradeEvaluation =
    val c = new GradeEvaluation
    c.autoEvaluationConfig = autoEvaluationConfig
    c.grade = grade
    c.percentage = percentage
    c

  override def equals(o: Any): Boolean = o match
    case g: GradeEvaluation => this.grade == g.grade
    case _                  => false

  override def hashCode: Int = if Option(grade).isDefined then grade.hashCode else 0
