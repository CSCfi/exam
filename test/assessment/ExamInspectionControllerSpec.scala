// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.ExamInspection
import models.exam.{Exam, ExamState}
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

class ExamInspectionControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  /** The teacher's exam, with a student's copy under review */
  private def examUnderReview: Exam =
    val parent = DB.find(classOf[Exam]).where().eq("name", "Algoritmit, 2013").isNull("parent").find
      .getOrElse(fail("No exam found"))
    parent.children.forEach { child =>
      child.state = ExamState.REVIEW
      child.update()
    }
    parent

  private def colleague(teacher: User): User =
    DB.find(classOf[User]).where().ne("id", teacher.id).orderBy("id").list.head

  private def add(eid: Long, uid: Long, session: Session, comment: Option[String] = None): Result =
    runIO(
      makeRequest(
        "POST",
        s"/app/exams/$eid/inspector/$uid",
        Some(comment.fold(Json.obj())(c => Json.obj("comment" -> c))),
        session = session
      )
    )

  private def inspectionsOf(examId: Long, user: User): List[ExamInspection] =
    DB.find(classOf[ExamInspection]).where().eq("exam.id", examId).eq("user.id", user.id).list

  "ExamInspectionController" when:
    "adding a reviewer" should:
      "add them to the exam and to the copies under review" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val parent             = examUnderReview
        val reviewer           = colleague(teacher)

        val result = add(parent.id, reviewer.id, session, Some("Could you review these?"))
        statusOf(result) must be(Status.OK)

        val added = inspectionsOf(parent.id, reviewer)
        added must have size 1
        added.head.assignedBy.id must be(teacher.id)
        added.head.comment.comment must be("Could you review these?")
        parent.children.forEach(child => inspectionsOf(child.id, reviewer) must have size 1)

      "not add the same reviewer twice" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val parent             = examUnderReview
        val reviewer           = colleague(teacher)
        statusOf(add(parent.id, reviewer.id, session)) must be(Status.OK)

        statusOf(add(parent.id, reviewer.id, session)) must be(Status.FORBIDDEN)
        inspectionsOf(parent.id, reviewer) must have size 1

      "refuse a teacher who does not own the exam" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val parent             = examUnderReview
        val reviewer           = colleague(teacher)
        parent.creator = reviewer
        parent.examOwners.clear()
        parent.update()

        statusOf(add(parent.id, reviewer.id, session)) must be(Status.FORBIDDEN)

      "not send a review request for an exam without a name" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val parent             = examUnderReview
        parent.name = ""
        parent.update()

        val result = add(parent.id, colleague(teacher).id, session, Some("Please review"))
        statusOf(result) must be(Status.BAD_REQUEST)
        inspectionsOf(parent.id, colleague(teacher)) must be(empty)

      "answer 404 for an unknown user or exam" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val parent             = examUnderReview
        statusOf(add(parent.id, 999999L, session)) must be(Status.NOT_FOUND)
        statusOf(add(999999L, colleague(teacher).id, session)) must be(Status.NOT_FOUND)

    "working with the reviewers" should:
      "list them, mark one ready and remove them from the copies too" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val parent             = examUnderReview
        val reviewer           = colleague(teacher)
        statusOf(add(parent.id, reviewer.id, session)) must be(Status.OK)
        val inspection = inspectionsOf(parent.id, reviewer).head

        val listed =
          runIO(makeRequest("GET", s"/app/exam/${parent.id}/inspections", session = session))
        contentAsJsonOf(listed).as[JsArray].value.map(i =>
          (i \ "user" \ "id").as[Long]
        ) must contain(
          reviewer.id
        )

        val ready = runIO(
          makeRequest(
            "PUT",
            s"/app/exams/inspection/${inspection.id}",
            Some(Json.obj("ready" -> true)),
            session = session
          )
        )
        statusOf(ready) must be(Status.OK)
        DB.find(classOf[ExamInspection], inspection.id).ready must be(true)

        val removed =
          runIO(makeRequest("DELETE", s"/app/exams/inspector/${inspection.id}", session = session))
        statusOf(removed) must be(Status.OK)
        inspectionsOf(parent.id, reviewer) must be(empty)
        parent.children.forEach(child => inspectionsOf(child.id, reviewer) must be(empty))

      "answer 404 for an unknown inspection" in:
        val (_, session) = runIO(loginAsTeacher())
        val missing = runIO(makeRequest("DELETE", "/app/exams/inspector/999999", session = session))
        statusOf(missing) must be(Status.NOT_FOUND)
        val outcome = runIO(
          makeRequest(
            "PUT",
            "/app/exams/inspection/999999",
            Some(Json.obj("ready" -> true)),
            session = session
          )
        )
        statusOf(outcome) must be(Status.NOT_FOUND)
