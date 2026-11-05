// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package database

import database.EbeanPaths.{path, props}
import models.exam.Exam
import models.questions.Question
import models.sections.ExamSection
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

import scala.compiletime.testing.typeCheckErrors

class EbeanPathsSpec extends AnyWordSpec with Matchers:

  private def errorsOf(errors: List[scala.compiletime.testing.Error]): List[String] =
    errors.map(_.message)

  "path" should:
    "expand to the path itself" in:
      path[ExamSection]("sectionQuestions.question.tags.id") must be(
        "sectionQuestions.question.tags.id"
      )

    "accept inherited properties" in:
      path[ExamSection]("creator.id") must be("creator.id")
      path[Exam]("modified") must be("modified")

    "reject an unknown property, suggesting a close match" in:
      errorsOf(
        typeCheckErrors("""path[ExamSection]("examSectionQuestions.question.tags.id")""")
      ) must be(
        List(
          "ExamSection has no property 'examSectionQuestions' (did you mean 'sectionQuestions'?)"
        )
      )

    "reject an unknown property further down the path" in:
      errorsOf(
        typeCheckErrors("""path[ExamSection]("sectionQuestions.question.owners.id")""")
      ) must be(
        List("Question has no property 'owners' (did you mean 'questionOwners'?)")
      )

    "reject navigating past a non-entity property" in:
      errorsOf(typeCheckErrors("""path[ExamSection]("name.length")""")) must be(
        List("'ExamSection.name' is a String, not an entity, so it has no property 'length'")
      )

    "reject transient properties" in:
      errorsOf(typeCheckErrors("""path[Exam]("totalScore")""")) must be(
        List("Exam.totalScore is @Transient, it has no column to query by")
      )

    "reject non-literal paths" in:
      errorsOf(typeCheckErrors("""val p = "name"; path[Exam](p)""")) must be(
        List("Ebean paths must be string literals so that they can be checked at compile time")
      )

  "props" should:
    "accept nested properties, wildcards and transient properties" in:
      props[Exam]("(*, totalScore, examSections(name, sectionQuestions(*)))") must not be null

    "accept the stripMargin form" in:
      props[Question](
        """(*,
          |questionOwners(id, firstName),
          |tags(id, name, creator(id))
          |)""".stripMargin
      ) must not be null

    "accept a list without outer parentheses" in:
      props[Exam]("*, course(code)") must not be null

    "reject an unknown property" in:
      errorsOf(typeCheckErrors("""props[Exam]("(*, examSections(name, questions(*)))")""")) must be(
        List("ExamSection has no property 'questions' (did you mean 'sectionQuestions'?)")
      )

    "reject malformed input" in:
      errorsOf(typeCheckErrors("""props[Exam]("(*, course(code)")""")) must be(
        List("Expected ')' but found end of input at position 16 in \"(*, course(code)\"")
      )
