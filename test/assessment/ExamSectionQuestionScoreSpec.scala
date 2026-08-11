// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import models.questions.{MultipleChoiceOption, Question, QuestionType}
import models.sections.{ExamSectionQuestion, ExamSectionQuestionOption}
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

class ExamSectionQuestionScoreSpec extends AnyWordSpec with Matchers:

  // Builds a multiple-choice section question whose correct option is answered,
  // so the auto-calculated assessed score equals maxScore.
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

  "ExamSectionQuestion.getAssessedScore" when:
    "no forced score is set" should:
      "fall back to the auto-calculated score" in:
        multiChoiceQuestion(3.0, null).getAssessedScore must be(3.0)

    "a non-zero forced score lower than the auto score is set" should:
      "use the forced score" in:
        multiChoiceQuestion(3.0, java.lang.Double.valueOf(1.0)).getAssessedScore must be(1.0)

    "a forced score of zero is set" should:
      // Regression: a forced 0 used to be discarded, so the backend total
      // (shown in the review list) fell back to the auto-calculated score
      // while the assessment view correctly honored the 0.
      "use the forced score of zero, not the auto-calculated score" in:
        multiChoiceQuestion(3.0, java.lang.Double.valueOf(0.0)).getAssessedScore must be(0.0)
