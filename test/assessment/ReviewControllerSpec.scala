// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.*
import models.enrolment.ExamParticipation
import models.exam.*
import models.user.{Permission, PermissionType, User}
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
        val parent          = exam.get.parent
        parent.gradeScale = exam.get.gradeScale
        parent.update()
        // Execute
        val result = runIO(get(s"/app/reviews/$examParentId", session = session))

        // Verify
        statusOf(result) must be(Status.OK)
        val json = contentAsJsonOf(result)
        json.mustBe(a[JsArray])
        val participationArray = json.as[JsArray]
        participationArray.value must have size 1
        // The parent's scale is needed in full to name grades of copies without their own scale
        (participationArray.value.head \ "exam" \ "parent" \ "gradeScale" \ "description")
          .as[String] must be(parent.gradeScale.description)

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

      "register an auto-graded exam and credit the registering teacher" in:
        val (user, session) = loginAsAdminWithExamInspection()
        // Mirror AutoEvaluationHandler: graded, but no graded-by-user
        val config = new AutoEvaluationConfig
        config.releaseType = AutoEvaluationReleaseType.IMMEDIATE
        config.exam = exam.get
        config.save()
        val autoGraded = reload()
        autoGraded.autoEvaluationConfig = config
        autoGraded.grade = gradeNamed("APPROVED")
        autoGraded.gradingType = GradeType.GRADED
        autoGraded.creditType = autoGraded.examType
        autoGraded.answerLanguage = "fi"
        autoGraded.gradedByUser = null
        autoGraded.state = ExamState.GRADED
        autoGraded.update()
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
        locked.gradedByUser.id must be(user.id)
        val record = DB.find(classOf[ExamRecord]).where().eq("exam.id", exam.get.id).find
        record.map(_.teacher.id) must be(Some(user.id))

      "refuse to register a manually reviewed exam with no grader" in:
        val (_, session) = loginAsAdminWithExamInspection()
        val noGrader     = reload()
        noGrader.grade = gradeNamed("APPROVED")
        noGrader.gradingType = GradeType.GRADED
        noGrader.creditType = noGrader.examType
        noGrader.answerLanguage = "fi"
        noGrader.gradedByUser = null
        noGrader.state = ExamState.GRADED
        noGrader.update()
        val registered = runIO(
          makeRequest(
            "POST",
            "/app/exam/record",
            Some(Json.obj("id" -> JsNumber(BigDecimal(exam.get.id)))),
            session = session
          )
        )
        statusOf(registered) must be(Status.FORBIDDEN)
        reload().state must be(ExamState.GRADED)

      "leave the exam unlocked if registering fails" in:
        val (_, session) = loginAsAdminWithExamInspection()
        val grade        = gradeNamed("APPROVED")
        runIO(
          put(
            s"/app/review/${exam.get.id}",
            reviewBody("GRADED", Some(grade.id.intValue), "GRADED"),
            session = session
          )
        )
        DB.find(classOf[ExamParticipation]).where().eq("exam.id", exam.get.id).delete()
        val registered = runIO(
          makeRequest(
            "POST",
            "/app/exam/record",
            Some(Json.obj("id" -> JsNumber(BigDecimal(exam.get.id)))),
            session = session
          )
        )
        statusOf(registered) must be(Status.NOT_FOUND)
        val after = reload()
        after.state must be(ExamState.GRADED)
        Option(after.lockedAt) must be(None)

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

    "updating the feedback comment" should:
      def userNamed(eppn: String): User =
        DB.find(classOf[User]).where().eq("eppn", eppn).find.getOrElse(fail(s"$eppn missing"))

      // Detach the exam copy and its parent from teacher@funet.fi (the test data creator)
      def detachFromTeacher(): Unit =
        val child = reload()
        child.creator = userNamed("student@funet.fi")
        child.update()
        val parent = DB.find(classOf[Exam], examParentId)
        parent.creator = userNamed("teacher@b.funet.fi")
        parent.update()

      def saveFeedback(session: Session, body: JsObject) =
        runIO(put(s"/app/review/${exam.get.id}/comment", body, session = session))

      "create and then update the feedback for an inspector" in:
        val (_, session) = loginAsTeacherWithExamInspection()
        detachFromTeacher()

        val created = saveFeedback(session, Json.obj("comment" -> "first"))
        statusOf(created) must be(Status.OK)
        val id = (contentAsJsonOf(created) \ "id").as[Long]
        reload().examFeedback.id must be(id)

        val updated = saveFeedback(session, Json.obj("id" -> id, "comment" -> "second"))
        statusOf(updated) must be(Status.OK)
        DB.find(classOf[Comment], id).comment must be("second")

      "forbid a teacher who does not review the exam" in:
        val (_, session) = runIO(loginAsTeacher())
        detachFromTeacher()

        val result = saveFeedback(session, Json.obj("comment" -> "nope"))
        statusOf(result) must be(Status.FORBIDDEN)
        reload().examFeedback must be(null)

      "allow an admin without any relation to the exam" in:
        val (_, session) = runIO(loginAsAdmin())
        detachFromTeacher()
        statusOf(saveFeedback(session, Json.obj("comment" -> "admin"))) must be(Status.OK)

      "allow the assigned language inspector of a maturity exam" in:
        val (inspector, _) = runIO(loginAsTeacher())
        detachFromTeacher()
        val perm = new Permission
        perm.`type` = PermissionType.CAN_INSPECT_LANGUAGE
        perm.save()
        inspector.permissions.add(perm)
        inspector.update()
        val child = reload()
        child.executionType = DB.find(classOf[ExamExecutionType])
          .where()
          .eq("type", ExamExecutionType.Type.MATURITY.toString)
          .find
          .getOrElse(fail("no maturity type"))
        child.update()
        val li = new LanguageInspection
        li.exam = child
        li.assignee = inspector
        li.save()
        // permissions are read into the session at login
        val (_, inspectorSession) = runIO(loginAsTeacher())

        statusOf(saveFeedback(inspectorSession, Json.obj("comment" -> "lang"))) must be(Status.OK)

      "refuse to update a comment that is not this exam's feedback" in:
        val (teacher, session) = loginAsTeacherWithExamInspection()
        val other              = new Comment
        other.comment = "someone else's"
        other.setCreatorWithDate(teacher)
        other.save()

        val result =
          saveFeedback(session, Json.obj("id" -> other.id.longValue, "comment" -> "hijack"))
        statusOf(result) must be(Status.NOT_FOUND)
        DB.find(classOf[Comment], other.id).comment must be("someone else's")
