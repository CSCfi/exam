// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import base.BaseIntegrationSpec
import io.ebean.DB
import database.EbeanQueryExtensions
import models.assessment.ExamInspection
import models.exam.Exam
import models.user.User
import play.api.http.Status
import play.api.libs.json._
import play.api.mvc.Session

class ReviewControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private lazy val exam: Option[Exam] =
    DB.find(classOf[Exam]).where().eq("name", "Algoritmit, 2013").isNotNull("parent").find

  private def setupExamInspection(user: User): Unit =
    val examInspection = new ExamInspection()
    exam match
      case Some(exam) =>
        examInspection.setUser(user)
        examInspection.setExam(exam)
        examInspection.save()
      case None => fail("No exam found")

  private def examParentId: Long = exam.get.getParent.getId // Safe since we validate exam exists in setup

  // Custom login methods that automatically set up exam inspection
  private def loginAsTeacherWithExamInspection(): (User, Session) =
    val (user, session) = runIO(loginAsTeacher())
    setupExamInspection(user)
    (user, session)

  private def loginAsAdminWithExamInspection(): (User, Session) =
    val (user, session) = runIO(loginAsAdmin())
    setupExamInspection(user)
    (user, session)

  "ReviewController" when:
    "getting exam reviews as teacher" should:
      "return reviews with grade scale information" in:
        val (user, session) = loginAsTeacherWithExamInspection()
        // Execute
        val result = runIO(get(s"/app/reviews/$examParentId", session = session))

        // Verify
        statusOf(result) must be(Status.OK)
        val json = contentAsJsonOf(result)
        json.mustBe(a[JsArray])
        val participationArray = json.as[JsArray]
        participationArray.value must have size 1

        val participation  = participationArray.value.head
        val examGradeScale = (participation \ "exam" \ "gradeScale").as[JsObject]
        examGradeScale.keys must not be empty
        val examGrades = (examGradeScale \ "grades").as[JsArray]
        examGrades.value must have size 2

        val courseGradeScale = (participation \ "exam" \ "course" \ "gradeScale").as[JsObject]
        courseGradeScale.keys must not be empty
        val courseGrades = (courseGradeScale \ "grades").as[JsArray]
        courseGrades.value must have size 6

    "getting exam reviews as admin" should:
      "return reviews array" in:
        val (user, session) = loginAsAdminWithExamInspection()
        // Execute
        val result = runIO(get(s"/app/reviews/$examParentId", session = session))

        // Verify
        statusOf(result) must be(Status.OK)
        val json = contentAsJsonOf(result)
        json.mustBe(a[JsArray])
        val participationArray = json.as[JsArray]
        participationArray.value must have size 1
