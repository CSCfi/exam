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
    q.ltiTool = "moodle"
    q.ltiCustom = new java.util.HashMap[String, Object](java.util.Map.of("id", "resource-42"))
    q.options = new java.util.ArrayList()
    q

  private def mustKeepLti(copy: Question): Unit =
    copy.ltiTool mustBe "moodle"
    copy.ltiCustomParameters mustBe Map("id" -> "resource-42")

  // Student exams are built from these copies and the LTI launch reads the tool and parameters
  // off them.
  "copy" should:
    "keep the LTI tool and parameters" in:
      mustKeepLti(ltiQuestion.copy())

    "not share the parameters with the original" in:
      val original = ltiQuestion
      val copy     = original.copy()
      copy.ltiCustom.put("id", "changed")
      original.ltiCustomParameters mustBe Map("id" -> "resource-42")

  "copyWithOptions" should:
    "keep the LTI tool and parameters with or without a parent" in:
      Seq(true, false).foreach { setParent =>
        val (copy, _) = ltiQuestion.copyWithOptions(setParent)
        withClue(s"setParent=$setParent: ")(mustKeepLti(copy))
      }
