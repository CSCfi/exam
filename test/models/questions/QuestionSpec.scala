// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions

import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

class QuestionSpec extends AnyWordSpec with Matchers:

  private def ltiQuestion: Question =
    val q = new Question
    q.`type` = QuestionType.LtiQuestion
    q.ltiId = "resource-42"
    q.options = new java.util.ArrayList()
    q

  // Student exams are built from these copies and the LTI launch reads ltiId off them.
  "copy" should:
    "keep the LTI resource id" in:
      ltiQuestion.copy().ltiId mustBe "resource-42"

  "copyWithOptions" should:
    "keep the LTI resource id with or without a parent" in:
      Seq(true, false).foreach { setParent =>
        val (copy, _) = ltiQuestion.copyWithOptions(setParent)
        withClue(s"setParent=$setParent: ")(copy.ltiId mustBe "resource-42")
      }
