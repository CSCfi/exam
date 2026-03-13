// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.exam.Exam

import java.util.Date
import scala.compiletime.uninitialized
import scala.jdk.CollectionConverters.*

@Entity
class AutoEvaluationConfig extends GeneratedIdentityModel:
  @OneToOne
  @JsonBackReference
  var exam: Exam = uninitialized

  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "autoEvaluationConfig")
  var gradeEvaluations: java.util.Set[GradeEvaluation] = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  var releaseDate: Date = uninitialized

  var releaseType: AutoEvaluationReleaseType = uninitialized
  var amountDays: Integer                    = uninitialized

  def asGradeMap: Map[Int, GradeEvaluation] =
    gradeEvaluations.asScala.map(ge => ge.grade.id.toInt -> ge).toMap

  def copy(): AutoEvaluationConfig =
    val c = new AutoEvaluationConfig
    c.releaseType = releaseType
    c.releaseDate = releaseDate
    c.amountDays = amountDays
    gradeEvaluations.asScala.foreach(ge => c.gradeEvaluations.add(ge.copy()))
    c

  override def equals(o: Any): Boolean = o match
    case a: AutoEvaluationConfig => this.id == a.id
    case _                       => false

  override def hashCode: Int = id.toInt

// Java enum aliases: Scala code that references AutoEvaluationConfig.ReleaseType (e.g. in
// pattern matches or service logic) needs a stable path to the Java enum class and its type.
// Without these aliases, callers would have to import AutoEvaluationReleaseType directly,
// which breaks the encapsulation pattern used across the model companion objects.
object AutoEvaluationConfig:
  type ReleaseType = AutoEvaluationReleaseType
  val ReleaseType: Class[AutoEvaluationReleaseType] = classOf[AutoEvaluationReleaseType]
