// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assessment

import controllers.base.AnonymousHandler
import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.exam.Exam
import models.questions.Question
import models.sections.ExamSectionQuestion
import models.user.{Role, User}
import org.apache.pekko.stream.Materializer
import play.api.libs.json.{JsValue, Json, Writes}
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}
import system.interceptors.scala.AnonymousJsonFilter

import javax.inject.Inject
import scala.collection.immutable.TreeMap
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

class QuestionReviewController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    val anonymous: AnonymousJsonFilter,
    implicit val ec: AuthExecutionContext,
    implicit val mat: Materializer
) extends BaseController
    with JavaApiHelper
    with AnonymousHandler
    with DbApiHelper:

  override protected def executionContext: ExecutionContext = ec
  override protected def materializer: Materializer         = mat

  case class QuestionEntry(question: JsValue, answers: Seq[JsValue], evaluationCriteria: JsValue)
  private object QuestionEntry:
    implicit val writes: Writes[QuestionEntry] = Json.writes[QuestionEntry]
    def apply(question: Question, answers: Seq[ExamSectionQuestion], evaluationCriteria: String): QuestionEntry =
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
    Seq(Exam.State.REVIEW, Exam.State.REVIEW_STARTED, Exam.State.GRADED, Exam.State.GRADED_LOGGED, Exam.State.REJECTED)

  def listEssays(examId: Long, ids: Option[List[Long]]): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.TEACHER)))
    .andThen(anonymous(Set("user", "creator", "modifier"))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      Option(DB.find(classOf[Exam], examId)) match
        case Some(exam) if exam.isInspectedOrCreatedOrOwnedBy(user) =>
          val questionIds = ids.getOrElse(List.empty)
          // This is the ordering of essay questions in the current exam
          val questionSequence = exam.getExamSections.asScala.toList.sorted
            .flatMap(_.getSectionQuestions.asScala.toList.sorted)
            .map(_.getQuestion)
            .filter(_.getType == Question.Type.EssayQuestion)
            .filter(q => questionIds.isEmpty || questionIds.contains(q.getId))

          val answers = exam.getChildren.asScala.toList
            .filter(canAssess(user, _))
            .filter(e => VALID_STATES.contains(e.getState))
            .flatMap(_.getExamSections.asScala)
            .flatMap(_.getSectionQuestions.asScala)
            .filter(_.getQuestion.getType == Question.Type.EssayQuestion)
            .filter(esq => questionIds.isEmpty || questionIds.contains(esq.getQuestion.getParent.getId))

          // Get evaluation criteria from parent exam section questions
          val evaluationCriteriaMap = exam.getExamSections.asScala.toList
            .flatMap(_.getSectionQuestions.asScala)
            .filter(esq =>
              esq.getQuestion.getType == Question.Type.EssayQuestion &&
                Option(esq.getEvaluationCriteria).isDefined &&
                Option(esq.getQuestion).isDefined
            )
            .distinctBy(_.getQuestion) // Keep first occurrence (like Java's merge function)
            .map(esq => esq.getQuestion -> esq.getEvaluationCriteria)
            .toMap

          val results = createMapping(answers, questionSequence)
            .map((question, answers) => QuestionEntry(question, answers, evaluationCriteriaMap.getOrElse(question, "")))
            .toSeq

          writeAnonymousResult(request, Ok(Json.toJson(results)), exam.isAnonymous)

        case _ => BadRequest
    }

  private def canAssess(user: User, exam: Exam) =
    exam.getParent.getExamOwners.contains(user) ||
      exam.getExamInspections.asScala.exists(_.getUser.equals(user))

  private def createMapping(
      answers: Seq[ExamSectionQuestion],
      questions: Seq[Question]
  ): Map[Question, List[ExamSectionQuestion]] =

    // Create ordering based on original question list
    val idToIndex = questions.map(_.getId).zipWithIndex.toMap
    implicit val questionOrdering: Ordering[Question] = Ordering.by { q =>
      idToIndex.getOrElse(q.getId, Int.MaxValue)
    }

    // Group essay answers by question parent
    val answersGrouped = answers
      .groupBy(_.getQuestion.getParent)
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
