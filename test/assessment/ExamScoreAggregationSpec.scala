// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import models.exam.Exam
import models.questions.{MultipleChoiceOption, Question, QuestionType}
import models.sections.{ExamSection, ExamSectionQuestion, ExamSectionQuestionOption}
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

// Regression coverage for the exam-level score aggregation. examSections is a
// java.util.Set, so `examSections.asScala.map(...)` produced a Scala Set that
// deduplicated equal per-section results before summing — two 3-point sections
// collapsed to a max of 3 instead of 6, and two questions scored identically
// counted only once. See Exam.getTotalScore / getMaxScore.
class ExamScoreAggregationSpec extends AnyWordSpec with Matchers:

  // A multiple-choice section question whose correct option is answered, so the
  // auto-calculated assessed score equals maxScore.
  private def multiChoiceQuestion(
      maxScore: Double,
      forcedScore: java.lang.Double
  ): ExamSectionQuestion =
    val question = new Question
    question.`type` = QuestionType.MultipleChoiceQuestion

    val correct = new MultipleChoiceOption
    correct.correctOption = true

    val answeredOption = new ExamSectionQuestionOption
    answeredOption.option = correct
    answeredOption.answered = true

    val esq = new ExamSectionQuestion
    esq.question = question
    esq.maxScore = maxScore
    esq.forcedScore = forcedScore
    esq.options = java.util.List.of(answeredOption)
    esq

  // Distinct id required: ExamSection equals/hashCode is id-based, so sections
  // sharing the default id would collapse in the containing Set.
  private def sectionWith(id: Long, question: ExamSectionQuestion): ExamSection =
    val section = new ExamSection
    section.id = id
    question.examSection = section
    section.sectionQuestions = new java.util.HashSet(java.util.List.of(question))
    section

  private def examOf(sections: ExamSection*): Exam =
    val exam       = new Exam
    val sectionSet = new java.util.LinkedHashSet[ExamSection]()
    sections.foreach(sectionSet.add)
    exam.examSections = sectionSet
    exam

  "Exam score aggregation over two sections worth the same points" should:
    "sum max scores instead of collapsing equal section maxima" in:
      val exam = examOf(
        sectionWith(1L, multiChoiceQuestion(3.0, null)),
        sectionWith(2L, multiChoiceQuestion(3.0, null))
      )
      exam.getMaxScore must be(6.0)

    "sum total scores instead of collapsing equal section totals" in:
      val exam = examOf(
        sectionWith(1L, multiChoiceQuestion(3.0, null)),
        sectionWith(2L, multiChoiceQuestion(3.0, null))
      )
      exam.getTotalScore must be(6.0)

    "count identical awarded scores from both sections" in:
      // Both questions forced to the same 2 points — must total 4, not 2.
      val exam = examOf(
        sectionWith(1L, multiChoiceQuestion(3.0, java.lang.Double.valueOf(2.0))),
        sectionWith(2L, multiChoiceQuestion(3.0, java.lang.Double.valueOf(2.0)))
      )
      exam.getTotalScore must be(4.0)
