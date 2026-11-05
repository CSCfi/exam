// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package database

import base.BaseIntegrationSpec
import io.ebean.DB
import models.sections.ExamSection

class QueryPathValidatorSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def started(): Unit =
    val _ = app
    ensureTestDataLoaded()

  "QueryPathValidator" when:
    "running in test mode" should:
      "reject an unknown where path before it reaches the database" in:
        started()
        val e = intercept[IllegalStateException] {
          DB.find(classOf[ExamSection]).where().in("examSectionQuestions.question.tags.id", 1L).list
        }
        e.getMessage must be(
          "Unknown property path(s) [examSectionQuestions.question.tags.id] on ExamSection"
        )

      "reject an unknown orderBy path" in:
        started()
        val e = intercept[IllegalStateException] {
          DB.find(classOf[ExamSection]).orderBy("nope desc").findList()
        }
        e.getMessage must include("[nope]")

      "let valid and raw expressions through" in:
        started()
        DB.find(classOf[ExamSection])
          .where()
          .in("sectionQuestions.question.tags.id", 1L)
          .raw("t0.id > ?", 0L)
          .orderBy("name")
          .list must not be null
