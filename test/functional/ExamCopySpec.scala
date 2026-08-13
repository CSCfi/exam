// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package functional

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import features.exam.copy.ExamCopyContext
import features.exam.services.ExamService
import io.ebean.DB
import models.exam.{Exam, ExamState}
import models.sections.{ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.User

import scala.jdk.CollectionConverters.*

/** Functional tests for exam copy scenarios.
  *
  * Each test calls `teacher()` or `student()` first. That helper accesses the lazy `app` val
  * (forcing Play + Ebean initialisation), loads the YAML fixture via `ensureTestDataLoaded()`, and
  * fetches the user from the DB — no HTTP round-trip needed.
  */
class ExamCopySpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private lazy val examService: ExamService = app.injector.instanceOf(classOf[ExamService])

  /** Initialises the app (forces the lazy `app` val, which registers the Ebean server) and loads
    * the YAML fixture data. Returns the requested DB user without making an HTTP request.
    */
  private def setup(email: String): User =
    val _ = app // triggers GuiceOneAppPerTest lazy init + Ebean server registration
    ensureTestDataLoaded()
    DB.find(classOf[User]).where().eq("email", email).find
      .getOrElse(fail(s"User $email not found in test data"))

  private def teacher(): User = setup("teacher@funet.fi")
  private def student(): User = setup("student@funet.fi")

  private def loadSourceExam(): Exam =
    DB.find(classOf[Exam])
      .where()
      .eq("name", "Johdatus alkeiden perusteisiin")
      .eq("state", ExamState.PUBLISHED)
      .find
      .getOrElse(fail("Source exam not found in test data"))

  private def allSectionQuestions(exam: Exam): List[ExamSectionQuestion] =
    exam.examSections.asScala.flatMap(_.sectionQuestions.asScala).toList

  /** Seeds ExamSectionQuestionOption rows for every MC/weighted-MC/claim-choice question in the
    * exam. In production these are created when a teacher configures the exam section; the YAML
    * fixture does not include them, so student-exam and collaborative-exam copies require this
    * setup step.
    *
    * After calling this, reload the exam from DB so Ebean lazy-loads the fresh option rows.
    */
  private def initSourceExamOptions(exam: Exam): Unit =
    for
      section <- exam.examSections.asScala
      esq     <- section.sectionQuestions.asScala
      opt     <- esq.question.options.asScala
    do
      val esqo = new ExamSectionQuestionOption
      esqo.option = opt
      esqo.score = opt.defaultScore
      esqo.examSectionQuestion = esq
      esqo.save()

  "ExamCopySpec" when:
    "teacher copy" should:
      "reuse the same question objects across all sections" in:
        val t      = teacher()
        val source = loadSourceExam()
        val copy   = source.createCopy(ExamCopyContext.forTeacherCopy(t).build())

        val sourceQids = allSectionQuestions(source).map(_.question.id).toSet
        val copyQids   = allSectionQuestions(copy).map(_.question.id).toSet

        // Teacher copy shares question rows — no deep question duplication
        copyQids mustEqual sourceQids

      "copy all sections including optional ones" in:
        val t      = teacher()
        val source = loadSourceExam()
        val copy   = source.createCopy(ExamCopyContext.forTeacherCopy(t).build())

        copy.examSections.size mustEqual source.examSections.size

      "produce independent ExamSectionQuestionOption rows" in:
        val t = teacher()
        initSourceExamOptions(loadSourceExam())
        val fresh = loadSourceExam()
        val copy  = fresh.createCopy(ExamCopyContext.forTeacherCopy(t).build())

        val sourceOptionIds = allSectionQuestions(fresh).flatMap(_.options.asScala.map(_.id)).toSet
        val copyOptionIds   = allSectionQuestions(copy).flatMap(_.options.asScala.map(_.id)).toSet

        sourceOptionIds must not be empty
        copyOptionIds.intersect(sourceOptionIds) mustBe empty

      "produce a DRAFT with **COPY** prefix via ExamService" in:
        val t      = teacher()
        val source = loadSourceExam()
        val result = examService.copyExam(source.id, t, Some("AQUARIUM"), Some("PUBLIC"))

        result mustBe a[Right[?, ?]]
        val copy = result.toOption.get

        copy.state mustEqual ExamState.DRAFT
        copy.name must startWith("**COPY**")
        // ExamService explicitly nulls parent for teacher copies
        copy.parent mustBe null

    "student exam copy" should:
      "create new question instances with parent references" in:
        val s = student()
        initSourceExamOptions(loadSourceExam())
        val fresh = loadSourceExam()
        val copy  = fresh.createCopy(ExamCopyContext.forStudentExam(s).build())

        val sourceQids = allSectionQuestions(fresh).map(_.question.id).toSet
        allSectionQuestions(copy).foreach { esq =>
          sourceQids must not contain esq.question.id
          esq.question.parent must not be null
        }

      "exclude optional sections when no section IDs are selected" in:
        val s = student()
        initSourceExamOptions(loadSourceExam())
        val fresh         = loadSourceExam()
        val optionalNames = fresh.examSections.asScala.filter(_.optional).map(_.name).toSet

        optionalNames must not be empty

        val copiedNames = fresh
          .createCopy(ExamCopyContext.forStudentExam(s).build())
          .examSections.asScala.map(_.name).toSet

        optionalNames.foreach(n => copiedNames must not contain n)

      "include a selected optional section" in:
        val s = student()
        initSourceExamOptions(loadSourceExam())
        val fresh = loadSourceExam()
        val optSection = fresh.examSections.asScala
          .find(_.optional)
          .getOrElse(fail("No optional section in test data"))

        val copy = fresh.createCopy(
          ExamCopyContext
            .forStudentExam(s)
            .withSelectedSections(Set(optSection.id))
            .build()
        )

        copy.examSections.asScala.map(_.name) must contain(optSection.name)

      "not copy exam owners" in:
        val s = student()
        initSourceExamOptions(loadSourceExam())
        val copy = loadSourceExam().createCopy(ExamCopyContext.forStudentExam(s).build())

        copy.examOwners mustBe empty

    "collaborative exam copy" should:
      "create new question copies without setting parent" in:
        val s = student()
        initSourceExamOptions(loadSourceExam())
        val fresh = loadSourceExam()
        val copy  = fresh.createCopy(ExamCopyContext.forCollaborativeExam(s).build())

        val sourceQids = allSectionQuestions(fresh).map(_.question.id).toSet
        allSectionQuestions(copy).foreach { esq =>
          sourceQids must not contain esq.question.id
          // COLLABORATIVE_EXAM does not set parent — differs from STUDENT_EXAM
          esq.question.parent mustBe null
        }

      "exclude optional sections like a student exam copy" in:
        val s = student()
        initSourceExamOptions(loadSourceExam())
        val fresh            = loadSourceExam()
        val nonOptionalCount = fresh.examSections.asScala.count(!_.optional)
        val copy             = fresh.createCopy(ExamCopyContext.forCollaborativeExam(s).build())

        copy.examSections.size mustEqual nonOptionalCount

    "lottery section student copy" should:
      "include only lotteryItemCount questions from a lottery section" in:
        val s = student()
        initSourceExamOptions(loadSourceExam())
        val fresh = loadSourceExam()
        val section = fresh.examSections.asScala
          .find(s => !s.optional && s.sectionQuestions.size >= 3)
          .getOrElse(fail("Need a non-optional section with at least 3 questions"))

        val lotteryCount = section.sectionQuestions.size - 1
        section.lotteryOn = true
        section.lotteryItemCount = lotteryCount
        section.update()

        val copy = fresh.createCopy(ExamCopyContext.forStudentExam(s).build())

        val copiedSection = copy.examSections.asScala
          .find(_.name == section.name)
          .getOrElse(fail("Lottery section not found in copy"))

        copiedSection.sectionQuestions.size mustEqual lotteryCount
