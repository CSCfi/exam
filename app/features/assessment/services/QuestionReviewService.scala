// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.DB
import io.ebean.text.PathProperties
import models.exam.Exam
import models.exam.ExamState
import models.questions.Question
import models.questions.QuestionType
import models.sections.ExamSectionQuestion
import models.user.User
import play.api.libs.json.{JsValue, Json, Writes}

import scala.collection.immutable.TreeMap
import scala.jdk.CollectionConverters.*

class QuestionReviewService extends EbeanQueryExtensions with EbeanJsonExtensions:

  case class QuestionEntry(question: JsValue, answers: Seq[JsValue], evaluationCriteria: JsValue)
  object QuestionEntry:
    implicit val writes: Writes[QuestionEntry] = Json.writes[QuestionEntry]
    def apply(
        question: Question,
        answers: Seq[ExamSectionQuestion],
        evaluationCriteria: String
    ): QuestionEntry =
      val answerPathProps = PathProperties.parse(
        """(*,
          |essayAnswer(attachment(*), *),
          |question(
          |  parent(question),
          |  attachment(*),
          |  *
          |),
          |examSection(name,
          |  exam(id, hash,
          |    creator(id, email, userIdentifier, firstName, lastName),
          |    state,
          |    examInspections(user(id))
          |  )
          |)
          |)""".stripMargin
      )
      val questionPathProps = PathProperties.parse("(attachment(*), *)")
      QuestionEntry(
        question = Json.parse(DB.json().toJson(question, questionPathProps)),
        answers = answers.map(a => Json.parse(DB.json().toJson(a, answerPathProps))),
        evaluationCriteria = Json.parse(DB.json().toJson(evaluationCriteria))
      )

  private val VALID_STATES =
    Seq(
      ExamState.REVIEW,
      ExamState.REVIEW_STARTED,
      ExamState.GRADED,
      ExamState.GRADED_LOGGED,
      ExamState.REJECTED
    )

  def findExam(examId: Long): Option[Exam] = Option(DB.find(classOf[Exam], examId))

  def listEssays(exam: Exam, user: User, questionIds: Option[List[Long]]): List[QuestionEntry] =
    val ids = questionIds.getOrElse(List.empty)
    // This is the ordering of essay questions in the current exam
    val questionSequence = exam.examSections.asScala.toList.sorted
      .flatMap(_.sectionQuestions.asScala.toList.sorted)
      .map(_.question)
      .filter(_.`type` == QuestionType.EssayQuestion)
      .filter(q => ids.isEmpty || ids.contains(q.id))

    val answers = exam.children.asScala.toList
      .filter(canView(user, _))
      .filter(e => VALID_STATES.contains(e.state))
      .flatMap(_.examSections.asScala)
      .flatMap(_.sectionQuestions.asScala)
      .filter(_.question.`type` == QuestionType.EssayQuestion)
      .filter(esq => ids.isEmpty || ids.contains(esq.question.parent.id))

    // Get evaluation criteria from parent exam section questions
    val evaluationCriteriaMap = exam.examSections.asScala.toList
      .flatMap(_.sectionQuestions.asScala)
      .filter(esq =>
        esq.question.`type` == QuestionType.EssayQuestion &&
          Option(esq.evaluationCriteria).isDefined &&
          Option(esq.question).isDefined
      )
      .distinctBy(_.question)
      .map(esq => esq.question -> esq.evaluationCriteria)
      .toMap

    createMapping(answers, questionSequence)
      .map((question, answers) =>
        QuestionEntry(question, answers, evaluationCriteriaMap.getOrElse(question, ""))
      )
      .toList

  private def canView(user: User, exam: Exam) =
    exam.isInspectedOrCreatedOrOwnedBy(user) || user.isAdminOrSupport

  private def createMapping(
      answers: Seq[ExamSectionQuestion],
      questions: Seq[Question]
  ): Map[Question, List[ExamSectionQuestion]] =

    // Create ordering based on original question list
    val idToIndex = questions.map(_.id).zipWithIndex.toMap
    implicit val questionOrdering: Ordering[Question] = Ordering.by { q =>
      idToIndex.getOrElse(q.id, Int.MaxValue)
    }

    // Group essay answers by question parent
    val answersGrouped = answers
      .groupBy(_.question.parent)
      .view
      .mapValues(_.toList)
      .toMap

    // Add questions without answers
    val questionsWithoutAnswers = questions
      .filterNot(answersGrouped.contains)
      .map(q => q -> List.empty[ExamSectionQuestion])
      .toMap

    // Combine and convert to a sorted map
    TreeMap.from(answersGrouped ++ questionsWithoutAnswers)
