// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.{ExamInspection, ExamRecord}
import models.exam.*
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.Session

class ReviewControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private lazy val exam: Option[Exam] =
    DB.find(classOf[Exam]).where().eq("name", "Algoritmit, 2013").isNotNull("parent").find

  private def setupExamInspection(user: User): Unit =
    val examInspection = new ExamInspection()
    exam match
      case Some(exam) =>
        examInspection.user = user
        examInspection.exam = exam
        examInspection.save()
      case None => fail("No exam found")

  private def examParentId: Long =
    exam.get.parent.id // Safe since we validate exam exists in setup

  private def gradeNamed(name: String): Grade =
    DB.find(classOf[Grade]).where().eq("name", name).eq(
      "gradeScale.id",
      exam.get.gradeScale.id
    ).find.getOrElse(fail(s"No grade $name found"))

  private def reload(): Exam = DB.find(classOf[Exam], exam.get.id)

  private def reviewBody(state: String, grade: Option[Int], gradingType: String): JsObject =
    Json.obj(
      "id"             -> JsNumber(BigDecimal(exam.get.id)),
      "state"          -> state,
      "gradingType"    -> gradingType,
      "creditType"     -> "FINAL",
      "answerLanguage" -> "de",
      "customCredit"   -> 5.0,
      "additionalInfo" -> JsNull
    ) ++ grade.fold(Json.obj())(g => Json.obj("grade" -> JsNumber(BigDecimal(g))))

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

    "clearing a previously set grade" should:
      "remove the grade and put the exam back to review" in:
        val (_, session) = loginAsAdminWithExamInspection()
        val grade        = gradeNamed("APPROVED")

        val graded = runIO(
          put(
            s"/app/review/${exam.get.id}",
            reviewBody("GRADED", Some(grade.id.intValue), "GRADED"),
            session = session
          )
        )
        statusOf(graded) must be(Status.OK)
        reload().grade.id must be(grade.id)

        // Picking the empty option in the grade dropdown sends no grade at all
        val cleared = runIO(
          put(
            s"/app/review/${exam.get.id}",
            reviewBody("REVIEW_STARTED", None, "GRADED"),
            session = session
          )
        )
        statusOf(cleared) must be(Status.OK)
        val updated = reload()
        Option(updated.grade) must be(None)
        updated.gradingType must be(GradeType.GRADED)
        updated.state must be(ExamState.REVIEW_STARTED)

    "clearing the 'not graded' selection" should:
      "reset the grading type back to graded" in:
        val (_, session) = loginAsAdminWithExamInspection()

        val notGraded = runIO(
          put(
            s"/app/review/${exam.get.id}",
            reviewBody("GRADED", None, "NOT_GRADED"),
            session = session
          )
        )
        statusOf(notGraded) must be(Status.OK)
        reload().gradingType must be(GradeType.NOT_GRADED)

        val cleared = runIO(
          put(
            s"/app/review/${exam.get.id}",
            reviewBody("REVIEW_STARTED", None, "GRADED"),
            session = session
          )
        )
        statusOf(cleared) must be(Status.OK)
        val updated = reload()
        Option(updated.grade) must be(None)
        updated.gradingType must be(GradeType.GRADED)
        updated.state must be(ExamState.REVIEW_STARTED)

    "locking an assessment" should:
      "not set the lock time when the exam is only graded" in:
        val (_, session) = loginAsAdminWithExamInspection()
        val grade        = gradeNamed("APPROVED")
        val graded = runIO(
          put(
            s"/app/review/${exam.get.id}",
            reviewBody("GRADED", Some(grade.id.intValue), "GRADED"),
            session = session
          )
        )
        statusOf(graded) must be(Status.OK)
        Option(reload().lockedAt) must be(None)

      "set the lock time on registering, and keep it when archiving" in:
        val (_, session) = loginAsAdminWithExamInspection()
        val grade        = gradeNamed("APPROVED")
        runIO(
          put(
            s"/app/review/${exam.get.id}",
            reviewBody("GRADED", Some(grade.id.intValue), "GRADED"),
            session = session
          )
        )
        val registered = runIO(
          makeRequest(
            "POST",
            "/app/exam/record",
            Some(Json.obj("id" -> JsNumber(BigDecimal(exam.get.id)))),
            session = session
          )
        )
        statusOf(registered) must be(Status.OK)
        val locked = reload()
        locked.state must be(ExamState.GRADED_LOGGED)
        val record = DB.find(classOf[ExamRecord]).where().eq("exam.id", exam.get.id).find
        Option(locked.lockedAt) must be(record.map(_.timeStamp))

        val archived = runIO(
          put(
            "/app/reviews/archive",
            Json.obj("ids" -> exam.get.id.toString),
            session = session
          )
        )
        statusOf(archived) must be(Status.OK)
        val after = reload()
        after.state must be(ExamState.ARCHIVED)
        after.lockedAt must be(locked.lockedAt)

      "set the lock time on registering without a record" in:
        val (_, session) = loginAsAdminWithExamInspection()
        runIO(
          put(
            s"/app/review/${exam.get.id}",
            reviewBody("GRADED", None, "NOT_GRADED"),
            session = session
          )
        )
        val registered = runIO(
          makeRequest(
            "POST",
            "/app/exam/register",
            Some(Json.obj("id" -> JsNumber(BigDecimal(exam.get.id)))),
            session = session
          )
        )
        statusOf(registered) must be(Status.OK)
        val locked = reload()
        locked.state must be(ExamState.GRADED_LOGGED)
        Option(locked.lockedAt) must not be None

      "set the lock time on rejecting" in:
        val (_, session) = loginAsAdminWithExamInspection()
        val grade        = gradeNamed("REJECTED")
        val rejected = runIO(
          put(
            s"/app/review/${exam.get.id}",
            reviewBody("REJECTED", Some(grade.id.intValue), "GRADED"),
            session = session
          )
        )
        statusOf(rejected) must be(Status.OK)
        val locked = reload()
        locked.state must be(ExamState.REJECTED)
        Option(locked.lockedAt) must not be None
