// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package exam

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import features.exam.services.ExamSectionError
import features.exam.services.{ExamSectionService, ExamService}
import io.ebean.DB
import models.exam.{Exam, ExamState}
import models.sections.ExamSection
import models.user.*

import scala.jdk.CollectionConverters.*

/** Section updates reach a section through its exam, so the two have to belong together: the exam
  * is what the section's rules - optionality among them - are checked against.
  */
class ExamSectionOptionalitySpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private lazy val examService: ExamService = app.injector.instanceOf(classOf[ExamService])
  private lazy val sectionService: ExamSectionService =
    app.injector.instanceOf(classOf[ExamSectionService])

  private def teacher(): User =
    val _ = app
    ensureTestDataLoaded()
    val user = DB
      .find(classOf[User])
      .where()
      .eq("email", "teacher@funet.fi")
      .find
      .getOrElse(fail("Teacher not found in test data"))
    user.loginRole = Role.Name.TEACHER
    val permission = new Permission
    permission.`type` = PermissionType.CAN_CREATE_BYOD_EXAM
    user.permissions.add(permission)
    user

  private def sourceExam(): Exam =
    DB.find(classOf[Exam])
      .where()
      .eq("name", "Johdatus alkeiden perusteisiin")
      .eq("state", ExamState.PUBLISHED)
      .find
      .getOrElse(fail("Source exam not found in test data"))

  /** A fresh DRAFT copy of the fixture exam, so that the test owns the sections it modifies. */
  private def draftCopy(user: User, implementation: String = "AQUARIUM"): Exam =
    val copy = examService
      .copyExam(sourceExam().id, user, Some(implementation), Some("PUBLIC"))
      .getOrElse(fail("Copying the exam failed"))
    DB.find(classOf[Exam]).where().idEq(copy.id).find.getOrElse(fail("Copy not found"))

  private def anySection(exam: Exam): ExamSection =
    exam.examSections.asScala.headOption.getOrElse(fail("No sections in exam"))

  private def setOptionality(exam: Exam, section: ExamSection, user: User, optional: Boolean) =
    sectionService.updateSection(
      examId = exam.id,
      sectionId = section.id,
      user = user,
      name = Option(section.name),
      expanded = section.expanded,
      lotteryOn = section.lotteryOn,
      lotteryItemCount = section.lotteryItemCount,
      description = Option(section.description),
      optional = optional
    )

  "Updating a section" should:
    "accept optionality in a room examination" in:
      val t       = teacher()
      val exam    = draftCopy(t)
      val section = anySection(exam)

      setOptionality(exam, section, t, optional = true) match
        case Left(error)    => fail(s"Updating the section failed: $error")
        case Right(updated) => updated.optional mustBe true

    "not reach a section of another exam" in:
      val t       = teacher()
      val room    = draftCopy(t)
      val foreign = anySection(draftCopy(t, "WHATEVER"))

      // Without an exam/section consistency check the foreign section would be judged - and
      // modified - by the rules of an exam it does not belong to
      setOptionality(room, foreign, t, optional = true) mustBe
        Left(ExamSectionError.SectionNotFound)
