// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.exam.{Exam, ExamState}
import models.questions.{EssayAnswer, Question, QuestionType}
import models.sections.{ExamSection, ExamSectionQuestion}
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

class QuestionReviewControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def parent: Exam =
    DB.find(classOf[Exam]).where().eq("name", "Algoritmit, 2013").isNull("parent").find
      .getOrElse(fail("No exam found"))
  private def copy: Exam = parent.children.get(0)

  private def essayQuestion(text: String, parentQuestion: Question = null): Question =
    val q = new Question
    q.`type` = QuestionType.EssayQuestion
    q.question = text
    q.parent = parentQuestion
    q.save()
    q

  private def section(exam: Exam, name: String): ExamSection =
    val s = new ExamSection
    s.exam = exam
    s.name = name
    s.sequenceNumber = 99
    s.save()
    s

  private def sectionQuestion(
      s: ExamSection,
      q: Question,
      seq: Int,
      criteria: String = null
  ): ExamSectionQuestion =
    val esq = new ExamSectionQuestion
    esq.examSection = s
    esq.question = q
    esq.sequenceNumber = seq
    esq.evaluationCriteria = criteria
    esq.save()
    esq

  /** The student's answer in the copy, to the copy's version of `q` */
  private def answer(s: ExamSection, q: Question, text: String): Unit =
    val esq = sectionQuestion(s, essayQuestion(q.question, q), 0)
    val a   = new EssayAnswer
    a.answer = text
    a.save()
    esq.essayAnswer = a
    esq.update()

  private def essays(examId: Long, session: Session, query: String = ""): Result =
    runIO(makeRequest("GET", s"/app/exam/$examId/questions$query", session = session))

  private def entries(result: Result): Seq[(String, Seq[String])] =
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[JsArray].value.toSeq.map { e =>
      (e \ "question" \ "question").as[String] ->
        (e \ "answers").as[JsArray].value.toSeq.map(a => (a \ "essayAnswer" \ "answer").as[String])
    }

  private def underReview(state: ExamState = ExamState.REVIEW): Exam =
    val c = copy
    c.state = state
    c.update()
    c

  "QuestionReviewController" when:
    "listing essay answers by question" should:
      "give the exam's essay questions in order, each with the answers and criteria" in:
        val (_, session) = runIO(loginAsTeacher())
        val exam         = parent
        val s            = section(exam, "Essays")
        val first        = essayQuestion("Why?")
        val second       = essayQuestion("How?")
        sectionQuestion(s, second, 1)
        sectionQuestion(s, first, 0, criteria = "Reasons given")
        val answers = section(underReview(), "Essays")
        answer(answers, first, "Because")
        answer(answers, second, "Like this")

        val listed = entries(essays(exam.id, session)).filter((q, _) => q == "Why?" || q == "How?")
        listed must be(Seq("Why?" -> Seq("Because"), "How?" -> Seq("Like this")))

        val criteria = contentAsJsonOf(essays(exam.id, session)).as[JsArray].value
          .find(e => (e \ "question" \ "id").as[Long] == first.id)
          .map(e => (e \ "evaluationCriteria").as[String])
        criteria must be(Some("Reasons given"))

      "leave out the answers of copies not yet returned" in:
        val (_, session) = runIO(loginAsTeacher())
        val exam         = parent
        val q            = essayQuestion("Why?")
        sectionQuestion(section(exam, "Essays"), q, 0)
        answer(section(underReview(ExamState.STUDENT_STARTED), "Essays"), q, "Half way")

        entries(essays(exam.id, session)).find(_._1 == "Why?") must be(Some("Why?" -> Seq.empty))

      "give only the questions asked for" in:
        val (_, session) = runIO(loginAsTeacher())
        val exam         = parent
        val s            = section(exam, "Essays")
        val wanted       = essayQuestion("Why?")
        sectionQuestion(s, wanted, 0)
        sectionQuestion(s, essayQuestion("How?"), 1)

        entries(essays(exam.id, session, s"?ids=${wanted.id}")).map(_._1) must be(Seq("Why?"))

      "keep apart the answers to questions removed from the exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val exam         = parent
        // In no section of the exam any more
        val removedA = essayQuestion("Removed A")
        val removedB = essayQuestion("Removed B")
        val answers  = section(underReview(), "Essays")
        answer(answers, removedA, "Answer A")
        answer(answers, removedB, "Answer B")

        val listed = entries(essays(exam.id, session)).filter(_._1.startsWith("Removed"))
        listed.toMap must be(Map("Removed A" -> Seq("Answer A"), "Removed B" -> Seq("Answer B")))

      "refuse a teacher who neither owns nor reviews the exam" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val exam               = parent
        exam.creator = DB.find(classOf[User]).where().ne("id", teacher.id).list.head
        exam.examOwners.clear()
        exam.update()
        exam.examInspections.forEach(_.delete())

        statusOf(essays(exam.id, session)) must be(Status.BAD_REQUEST)
