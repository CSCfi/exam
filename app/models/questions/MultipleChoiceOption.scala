// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.sections.ExamSectionQuestionOption

import java.util.Set
import scala.compiletime.uninitialized

@Entity
class MultipleChoiceOption extends GeneratedIdentityModel with Ordered[MultipleChoiceOption]:
  @ManyToOne
  @JsonBackReference
  var question: Question = uninitialized

  @OneToMany(cascade = Array(CascadeType.REMOVE), mappedBy = "option")
  @JsonBackReference
  var examSectionQuestionOptions: java.util.Set[ExamSectionQuestionOption] = uninitialized

  var option: String                         = uninitialized
  var correctOption: Boolean                 = false
  var defaultScore: java.lang.Double         = uninitialized
  var claimChoiceType: ClaimChoiceOptionType = uninitialized

  def isLegitMaxScore: Boolean                         = defaultScore > 0
  def isLegitMinScore(allowNegative: Boolean): Boolean = allowNegative && defaultScore < 0

  def copy(): MultipleChoiceOption =
    val o = new MultipleChoiceOption
    o.option = option
    o.correctOption = correctOption
    o.defaultScore = defaultScore
    o.claimChoiceType = claimChoiceType
    o.question = question
    o

  override def compare(o: MultipleChoiceOption): Int = id.compareTo(o.id)

  override def equals(o: Any): Boolean = o match
    case m: MultipleChoiceOption => this.id == m.id
    case _                       => false

  override def hashCode: Int =
    val base = super.hashCode
    31 * base + id.toInt

object MultipleChoiceOption:
  type ClaimChoiceOptionType = models.questions.ClaimChoiceOptionType
