// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.sections

import features.exam.copy.ExamCopyContext
import models.questions.MultipleChoiceOption
import models.user.User
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

import scala.jdk.CollectionConverters.*

class ExamSectionQuestionSpec extends AnyWordSpec with Matchers:

  private def option(id: Long): MultipleChoiceOption =
    val o = new MultipleChoiceOption
    o.id = id
    o

  private def row(id: Long, option: MultipleChoiceOption, answered: Boolean = false) =
    val esqo = new ExamSectionQuestionOption
    esqo.id = id
    esqo.option = option
    esqo.answered = answered
    esqo

  private def withRows(rows: ExamSectionQuestionOption*): ExamSectionQuestion =
    val esq = new ExamSectionQuestion
    esq.options = new java.util.ArrayList(rows.asJava)
    esq

  "distinctOptions" should:
    "keep one row per option in original order" in:
      val (a, b)           = (option(1), option(2))
      val (a1, b1, a2, b2) = (row(10, a), row(11, b), row(20, a), row(21, b))

      val result = withRows(b2, a1, b1, a2).distinctOptions.asScala.toSeq

      result must have size 2
      result.head must be theSameInstanceAs a1
      result(1) must be theSameInstanceAs b1

    "prefer an answered row" in:
      val a        = option(1)
      val answered = row(20, a, answered = true)

      val result = withRows(row(10, a), answered).distinctOptions.asScala.toSeq

      result must have size 1
      result.head must be theSameInstanceAs answered

    "leave distinct options untouched" in:
      val rows = Seq(row(10, option(1), answered = true), row(11, option(2)))

      withRows(rows*).distinctOptions.asScala.toSeq mustBe rows

  "teacher copy" should:
    "drop duplicate option rows" in:
      val (a, b) = (option(1), option(2))
      val esq    = withRows(row(10, a), row(11, b), row(20, a), row(21, b))

      val copy = esq.copy(ExamCopyContext.forTeacherCopy(new User).build())

      copy.options.asScala.map(_.option) mustBe Seq(a, b)
