// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions

import models.sections.ExamSectionQuestion
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

class ClozeTestAnswerSpec extends AnyWordSpec with Matchers:

  private def score(blank: String, answer: String): ClozeTestAnswer.Score =
    val question = new Question
    question.question = s"""<p>$blank</p>"""
    val esq = new ExamSectionQuestion
    esq.question = question
    val cta = new ClozeTestAnswer
    cta.answer = s"""{"1": "$answer"}"""
    cta.calculateScore(esq)

  private def numericBlank(correct: String, precision: String = "0") =
    s"""<span cloze="true" id="1" numeric="true" precision="$precision">$correct</span>"""

  "A numeric cloze blank" should {

    "accept an answer within the precision" in {
      val s = score(numericBlank("2.5", "0.5"), "2.9")
      (s.correctAnswers, s.incorrectAnswers) mustBe (1, 0)
    }

    "reject an answer outside the precision" in {
      val s = score(numericBlank("2.5", "0.5"), "3.1")
      (s.correctAnswers, s.incorrectAnswers) mustBe (0, 1)
    }

    // The correct answer and precision come from the teacher's question text
    "count as incorrect when the teacher's correct answer is not a number" in {
      val s = score(numericBlank("2,5"), "2.5")
      (s.correctAnswers, s.incorrectAnswers) mustBe (0, 1)
    }

    "count as incorrect when the teacher's precision is not a number" in {
      val s = score(numericBlank("2.5", "half"), "2.5")
      (s.correctAnswers, s.incorrectAnswers) mustBe (0, 1)
    }
  }
