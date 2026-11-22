// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.{ExamFeedbackConfig, ExamFeedbackReleaseType}
import models.exam.{Exam, ExamState, GradeType}
import models.questions.{MultipleChoiceOption, Question, QuestionType}
import models.sections.{ExamSection, ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

import java.time.Instant
import java.time.temporal.ChronoUnit

class ExamAnswerControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def copy: Exam =
    DB.find(classOf[Exam]).where().eq("name", "Algoritmit, 2013").isNotNull("parent").find
      .getOrElse(fail("No exam found"))

  /** The student's registered copy, its answers released as configured */
  private def registered(
      student: User,
      release: ExamFeedbackReleaseType,
      releaseDate: Instant = null
  ): Exam =
    val c = copy
    c.creator = student
    c.state = ExamState.GRADED_LOGGED
    c.gradingType = GradeType.GRADED
    c.update()
    val config = new ExamFeedbackConfig
    config.exam = c.parent
    config.releaseType = release
    config.releaseDate = releaseDate
    config.save()
    c

  /** A multiple choice question in the copy, its correct option answered */
  private def answeredChoice(e: Exam): Unit =
    val q = new Question
    q.`type` = QuestionType.MultipleChoiceQuestion
    q.question = "Pick one"
    q.save()
    val correct = new MultipleChoiceOption
    correct.question = q
    correct.option = "Right"
    correct.correctOption = true
    correct.defaultScore = 1.0
    correct.save()
    val s = new ExamSection
    s.exam = e
    s.name = "Choices"
    s.sequenceNumber = 0
    s.save()
    val esq = new ExamSectionQuestion
    esq.examSection = s
    esq.question = q
    esq.maxScore = 1.0
    esq.save()
    val option = new ExamSectionQuestionOption
    option.examSectionQuestion = esq
    option.option = correct
    option.answered = true
    option.score = 1.0
    option.save()

  private def answers(examId: Long, session: Session): Result =
    runIO(makeRequest("GET", s"/app/feedback/exams/$examId/answers", session = session))

  private def released(result: Result): Boolean =
    statusOf(result) must be(Status.OK)
    contentAsStringOf(result).nonEmpty

  "ExamAnswerController" when:
    "a student asks for their answers" should:
      "give them once the grade is registered, without the scoring keys" in:
        val (student, session) = runIO(loginAsStudent())
        val e                  = registered(student, ExamFeedbackReleaseType.ONCE_LOCKED)
        answeredChoice(e)

        val result = answers(e.id, session)
        released(result) must be(true)
        val json = contentAsJsonOf(result)
        (json \ "id").as[Long] must be(e.id)
        val option = (json \ "examSections" \ 0 \ "sectionQuestions" \ 0 \ "options" \ 0)
        (option \ "answered").as[Boolean] must be(true)
        (option \ "option" \ "option").as[String] must be("Right")
        // The scoring keys stay hidden
        (option \ "score").toOption must be(None)
        (option \ "option" \ "correctOption").toOption must be(None)

      "give them after the release date" in:
        val (student, session) = runIO(loginAsStudent())
        val e = registered(
          student,
          ExamFeedbackReleaseType.GIVEN_DATE,
          Instant.now().minus(3, ChronoUnit.DAYS)
        )

        released(answers(e.id, session)) must be(true)

      "give nothing before the release date" in:
        val (student, session) = runIO(loginAsStudent())
        val e = registered(
          student,
          ExamFeedbackReleaseType.GIVEN_DATE,
          Instant.now().plus(3, ChronoUnit.DAYS)
        )

        released(answers(e.id, session)) must be(false)

      "give nothing before the grade is registered" in:
        val (student, session) = runIO(loginAsStudent())
        val e                  = registered(student, ExamFeedbackReleaseType.ONCE_LOCKED)
        e.state = ExamState.GRADED
        e.update()

        released(answers(e.id, session)) must be(false)

      "give nothing for an exam left ungraded" in:
        val (student, session) = runIO(loginAsStudent())
        val e                  = registered(student, ExamFeedbackReleaseType.ONCE_LOCKED)
        e.gradingType = GradeType.NOT_GRADED
        e.update()

        released(answers(e.id, session)) must be(false)

      "give nothing of another student's exam" in:
        val (student, session) = runIO(loginAsStudent())
        val other              = DB.find(classOf[User]).where().ne("id", student.id).list.head
        val e                  = registered(other, ExamFeedbackReleaseType.ONCE_LOCKED)

        released(answers(e.id, session)) must be(false)

      "be closed to teachers" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val e                  = registered(teacher, ExamFeedbackReleaseType.ONCE_LOCKED)

        statusOf(answers(e.id, session)) must be(Status.FORBIDDEN)
