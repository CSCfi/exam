// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.sections

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.{Entity, ManyToOne}
import models.base.GeneratedIdentityModel
import models.questions.MultipleChoiceOption

import scala.compiletime.uninitialized

@Entity
class ExamSectionQuestionOption extends GeneratedIdentityModel:
  @ManyToOne
  @JsonBackReference
  var examSectionQuestion: ExamSectionQuestion = uninitialized

  @ManyToOne var option: MultipleChoiceOption = uninitialized

  var answered: Boolean       = false
  var score: java.lang.Double = uninitialized

  def isLegitScore(allowNegative: Boolean): Boolean =
    score != 0 && (allowNegative || score > 0)

  def copy(): ExamSectionQuestionOption =
    val o = new ExamSectionQuestionOption
    o.option = option
    o.score = score
    o

  def copyWithAnswer(): ExamSectionQuestionOption =
    val o = new ExamSectionQuestionOption
    o.option = option
    o.score = score
    o.answered = answered
    o

  override def equals(o: Any): Boolean = o match
    case e: ExamSectionQuestionOption => this.option == e.option
    case _                            => false

  override def hashCode: Int = if option != null then option.hashCode else 0
