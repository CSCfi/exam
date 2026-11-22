// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.*
import models.enrolment.ExamEnrolment
import models.exam.{Exam, ExamState}
import models.questions.*
import models.sections.{ExamSection, ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

/** Scoring answers, assessment info, feedback and the other review actions */
class ReviewGradingSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def copy: Exam =
    DB.find(classOf[Exam]).where().eq("name", "Algoritmit, 2013").isNotNull("parent").find
      .getOrElse(fail("No exam found"))

  private def inState(state: ExamState): Exam =
    val c = copy
    c.state = state
    c.update()
    c

  private def section(e: Exam): ExamSection =
    val s = new ExamSection
    s.exam = e
    s.name = "Answers"
    s.sequenceNumber = 0
    s.save()
    s

  private def question(e: Exam, `type`: QuestionType, maxScore: Double): ExamSectionQuestion =
    val q = new Question
    q.`type` = `type`
    q.question = "Q"
    q.save()
    val esq = new ExamSectionQuestion
    esq.examSection = section(e)
    esq.question = q
    esq.maxScore = maxScore
    esq.evaluationType = QuestionEvaluationType.Points
    esq.save()
    esq

  /** A multiple choice question with its correct option answered */
  private def choice(e: Exam, maxScore: Double): ExamSectionQuestion =
    val esq     = question(e, QuestionType.MultipleChoiceQuestion, maxScore)
    val correct = new MultipleChoiceOption
    correct.question = esq.question
    correct.option = "Right"
    correct.correctOption = true
    correct.save()
    val answered = new ExamSectionQuestionOption
    answered.examSectionQuestion = esq
    answered.option = correct
    answered.answered = true
    answered.save()
    esq

  private def send(url: String, body: JsValue, session: Session): Result =
    runIO(makeRequest("PUT", url, Some(body), session = session))

  private def evaluated(esq: ExamSectionQuestion): java.lang.Double =
    DB.find(classOf[ExamSectionQuestion], esq.id).essayAnswer.evaluatedScore

  private def forced(esq: ExamSectionQuestion): java.lang.Double =
    DB.find(classOf[ExamSectionQuestion], esq.id).forcedScore

  /** Hands the teacher's exam to someone else */
  private def detach(teacher: User): Unit =
    val parent = copy.parent
    parent.creator = DB.find(classOf[User]).where().ne("id", teacher.id).list.head
    parent.examOwners.clear()
    parent.update()
    parent.examInspections.forEach(_.delete())

  "Reviewing" when:
    "scoring an essay" should:
      "store the score rounded to two decimals, making the answer if there is none" in:
        val (_, session) = runIO(loginAsTeacher())
        val esq          = question(inState(ExamState.REVIEW), QuestionType.EssayQuestion, 5)

        statusOf(send(
          s"/app/review/examquestion/${esq.id}/score",
          Json.obj("evaluatedScore" -> 3.456),
          session
        )) must be(
          Status.OK
        )
        evaluated(esq).doubleValue must be(3.46)

      "clear the score" in:
        val (_, session) = runIO(loginAsTeacher())
        val esq          = question(inState(ExamState.REVIEW), QuestionType.EssayQuestion, 5)
        val answer       = new EssayAnswer
        answer.evaluatedScore = 2.0
        answer.save()
        esq.essayAnswer = answer
        esq.update()

        // The view sends no score for an emptied field
        statusOf(send(s"/app/review/examquestion/${esq.id}/score", Json.obj(), session)) must be(
          Status.OK
        )
        evaluated(esq) must be(null)

      "answer 404 for an unknown question" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(send(
          "/app/review/examquestion/999999/score",
          Json.obj("evaluatedScore" -> 1),
          session
        )) must be(
          Status.NOT_FOUND
        )

    "forcing the score of an automatically scored question" should:
      "set it within the range and clear it again" in:
        val (_, session) = runIO(loginAsTeacher())
        val esq          = choice(inState(ExamState.REVIEW), 2)
        val url          = s"/app/review/examquestion/${esq.id}/score/force"

        statusOf(send(url, Json.obj("forcedScore" -> 1.234), session)) must be(Status.OK)
        forced(esq).doubleValue must be(1.23)

        // Back to the calculated score
        statusOf(send(url, Json.obj("forcedScore" -> JsNull), session)) must be(Status.OK)
        forced(esq) must be(null)

      "refuse a score outside the question's range" in:
        val (_, session) = runIO(loginAsTeacher())
        val esq          = choice(inState(ExamState.REVIEW), 2)

        val result = send(
          s"/app/review/examquestion/${esq.id}/score/force",
          Json.obj("forcedScore" -> 3),
          session
        )
        statusOf(result) must be(Status.FORBIDDEN)
        forced(esq) must be(null)

      "refuse once the grade is registered" in:
        val (_, session) = runIO(loginAsTeacher())
        val esq          = choice(inState(ExamState.GRADED_LOGGED), 2)

        statusOf(send(
          s"/app/review/examquestion/${esq.id}/score/force",
          Json.obj("forcedScore" -> 1),
          session
        )) must be(
          Status.FORBIDDEN
        )

      "refuse a teacher who does not review the exam" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val esq                = choice(inState(ExamState.REVIEW), 2)
        detach(teacher)

        statusOf(send(
          s"/app/review/examquestion/${esq.id}/score/force",
          Json.obj("forcedScore" -> 1),
          session
        )) must be(
          Status.FORBIDDEN
        )

      "not apply to essays" in:
        val (_, session) = runIO(loginAsTeacher())
        val esq          = question(inState(ExamState.REVIEW), QuestionType.EssayQuestion, 2)

        statusOf(send(
          s"/app/review/examquestion/${esq.id}/score/force",
          Json.obj("forcedScore" -> 1),
          session
        )) must be(
          Status.NOT_FOUND
        )

    "writing the assessment info" should:
      "store it on a registered exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = inState(ExamState.GRADED_LOGGED)

        statusOf(send(
          s"/app/review/${e.id}/info",
          Json.obj("assessmentInfo" -> "Sent to registry"),
          session
        )) must be(
          Status.OK
        )
        DB.find(classOf[Exam], e.id).assessmentInfo must be("Sent to registry")

      "not apply before the grade is registered" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = inState(ExamState.REVIEW)

        statusOf(
          send(s"/app/review/${e.id}/info", Json.obj("assessmentInfo" -> "x"), session)
        ) must be(Status.NOT_FOUND)

    "a student reading the feedback" should:
      "mark their own feedback read, and nothing else" in:
        val (student, session) = runIO(loginAsStudent())
        val e                  = inState(ExamState.GRADED_LOGGED)
        e.creator = student
        val feedback = new Comment
        feedback.comment = "Good"
        feedback.save()
        e.examFeedback = feedback
        e.update()

        statusOf(send(
          s"/app/review/${e.id}/comment/${feedback.id}/feedbackstatus",
          Json.obj("feedbackStatus" -> true),
          session
        )) must be(
          Status.OK
        )
        DB.find(classOf[Comment], feedback.id).feedbackStatus.booleanValue must be(true)

        val other = new Comment
        other.save()
        statusOf(send(
          s"/app/review/${e.id}/comment/${other.id}/feedbackstatus",
          Json.obj("feedbackStatus" -> true),
          session
        )) must be(
          Status.BAD_REQUEST
        )

    "asking what is locked" should:
      "tell whether answers are open to changes" in:
        val (_, session) = runIO(loginAsTeacher())
        def status(): String =
          (contentAsJsonOf(runIO(makeRequest(
            "GET",
            s"/app/review/${copy.parent.id}/locked",
            session = session
          ))) \ "status")
            .as[String]

        inState(ExamState.REVIEW)
        status() must be("everything")

        inState(ExamState.GRADED_LOGGED)
        status() must be("nothing")

        val config = new ExamFeedbackConfig
        config.exam = copy.parent
        config.releaseType = ExamFeedbackReleaseType.GIVEN_DATE
        config.save()
        status() must be("date")

    "working with other reviewers" should:
      "keep a comment for the reviewers and message them" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val e                  = inState(ExamState.REVIEW)

        val added = runIO(
          makeRequest(
            "POST",
            s"/app/review/${e.id}/inspection",
            Some(Json.obj("comment" -> "<p>Check Q2</p>")),
            session = session
          )
        )
        statusOf(added) must be(Status.OK)
        val comments = DB.find(classOf[InspectionComment]).where().eq("exam.id", e.id).list
        comments.map(_.comment) must contain("<p>Check Q2</p>")
        comments.head.creator.id must be(teacher.id)

        val message = runIO(
          makeRequest(
            "POST",
            s"/app/email/inspection/${e.id}",
            Some(Json.obj("msg" -> "Please look")),
            session = session
          )
        )
        statusOf(message) must be(Status.OK)

    "listing no-shows" should:
      "list the enrolments of the exam that were not used" in:
        val (_, session) = runIO(loginAsTeacher())
        val parent       = copy.parent
        val enrolment    = new ExamEnrolment
        enrolment.exam = parent
        enrolment.user = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find.get
        enrolment.noShow = true
        enrolment.save()

        val result = runIO(makeRequest("GET", s"/app/noshows/${parent.id}", session = session))
        statusOf(result) must be(Status.OK)
        contentAsJsonOf(result).as[JsArray].value.map(e => (e \ "id").as[Long]) must contain(
          enrolment.id
        )
