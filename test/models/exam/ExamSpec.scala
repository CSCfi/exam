// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam

import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

class ExamSpec extends AnyWordSpec with Matchers:

  private def exam(implementation: ExamImplementation, executionType: String): Exam =
    val e = new Exam
    e.implementation = implementation
    val t = new ExamExecutionType
    t.`type` = executionType
    e.executionType = t
    e

  "An exam" should:
    "be unsupervised when taken at home or with SEB, whatever its execution type" in:
      for t <- ExamExecutionType.Type.values.map(_.toString) do
        exam(ExamImplementation.AQUARIUM, t).isUnsupervised must be(false)
        exam(ExamImplementation.WHATEVER, t).isUnsupervised must be(true)
        exam(ExamImplementation.CLIENT_AUTH, t).isUnsupervised must be(true)

    "count as an aquarium exam without an implementation" in:
      exam(null, "PUBLIC").isUnsupervised must be(false)
