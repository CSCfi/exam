// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import features.assessment.services.ReviewDocumentsService
import io.ebean.DB
import models.exam.*
import models.user.{Role, User}

import java.nio.file.Files

class GradeImportSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def examUnderReview(): Exam =
    val exam = DB
      .find(classOf[Exam])
      .where()
      .eq("name", "Algoritmit, 2013")
      .isNotNull("parent")
      .find
      .getOrElse(fail("No exam found"))
    exam.state = ExamState.REVIEW
    exam.update()
    exam

  private def addOwner(exam: Exam, user: User): Unit =
    val parent = DB.find(classOf[Exam], exam.parent.id)
    parent.examOwners.add(user)
    parent.update()

  private def importGrade(exam: Exam, user: User, role: Role.Name): Unit =
    user.loginRole = role // transient, normally set per request
    val csv = Files.createTempFile("grades", ".csv")
    Files.writeString(csv, s"exam id,grade,feedback,a,b,c\n${exam.id},APPROVED,Well done\n")
    val service = app.injector.instanceOf(classOf[ReviewDocumentsService])
    service.importGrades(csv.toFile, user) mustBe Right(())

  private def reload(exam: Exam): Exam = DB.find(classOf[Exam], exam.id)

  "Grade import" when:
    "importing as teacher" should:
      "grade an exam the teacher owns" in:
        val (user, _) = runIO(loginAsTeacher())
        val exam      = examUnderReview()
        addOwner(exam, user)

        importGrade(exam, user, Role.Name.TEACHER)

        val graded = reload(exam)
        graded.state mustBe ExamState.GRADED
        graded.grade.name mustBe "APPROVED"
        graded.gradedByUser.id mustBe user.id

      "not grade an exam owned by someone else" in:
        val (user, _) = runIO(loginAsTeacher())
        val exam      = examUnderReview()

        importGrade(exam, user, Role.Name.TEACHER)

        val notGraded = reload(exam)
        notGraded.state mustBe ExamState.REVIEW
        Option(notGraded.grade) mustBe None

    "importing as admin" should:
      "grade any exam under review" in:
        val (user, _) = runIO(loginAsAdmin())
        val exam      = examUnderReview()

        importGrade(exam, user, Role.Name.ADMIN)

        val graded = reload(exam)
        graded.state mustBe ExamState.GRADED
        graded.gradedByUser.id mustBe user.id
