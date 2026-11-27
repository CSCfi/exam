// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.exam.Exam
import org.joda.time.DateTime
import services.datetime.JsonDateTime

import scala.compiletime.uninitialized

@Entity
class ExamFeedbackConfig extends GeneratedIdentityModel:

  @OneToOne
  @JsonBackReference
  var exam: Exam = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var releaseDate: DateTime = uninitialized

  var releaseType: ExamFeedbackReleaseType = uninitialized

  def copy(): ExamFeedbackConfig =
    val c = new ExamFeedbackConfig
    c.releaseType = releaseType
    c.releaseDate = releaseDate
    c

  override def equals(o: Any): Boolean = o match
    case e: ExamFeedbackConfig => this.id == e.id
    case _                     => false

  override def hashCode: Int = id.toInt

// Java enum aliases: Scala code that references AutoEvaluationConfig.ReleaseType (e.g. in
// pattern matches or service logic) needs a stable path to the Java enum class and its type.
// Without these aliases, callers would have to import AutoEvaluationReleaseType directly,
// which breaks the encapsulation pattern used across the model companion objects.
object ExamFeedbackConfig:
  type ReleaseType = ExamFeedbackReleaseType
  val ReleaseType: Class[ExamFeedbackReleaseType] = classOf[ExamFeedbackReleaseType]
