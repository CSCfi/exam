// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assessment

import controllers.base.scala.ExamBaseController
import io.ebean.{DB, FetchConfig}
import miscellaneous.scala.DbApiHelper
import models.assessment.ExamFeedbackConfig.ReleaseType.{GIVEN_DATE, ONCE_LOCKED}
import models.exam.{Exam, Grade}
import models.questions.{ClozeTestAnswer, Question}
import models.user.Role
import org.joda.time.DateTime
import play.api.i18n.MessagesApi
import play.api.mvc.*
import play.i18n.Lang
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}
import system.interceptors.scala.{SecureController, SensitiveDataFilter}
import validation.scala.core.Validators

import javax.inject.Inject
import scala.jdk.CollectionConverters.CollectionHasAsScala

class ExamAnswerController @Inject() (
    val controllerComponents: ControllerComponents,
    val validators: Validators,
    val authenticated: AuthenticatedAction,
    val sensitiveDataFilter: SensitiveDataFilter,
    val messaging: MessagesApi,
    implicit val ec: AuthExecutionContext
) extends SecureController
    with ExamBaseController
    with DbApiHelper:

  override protected val sensitiveFields = Set("score", "defaultScore", "correctOption", "claimChoiceType", "configKey")

  def listAnswers(eid: Long): Action[AnyContent] = Action.andThen(authorized(Seq(Role.Name.STUDENT))) { request =>
    val user = request.attrs(Auth.ATTR_USER)
    DB
      .find(classOf[Exam])
      .fetch("course", "name, code, credits")
      .fetch("grade", "name")
      .fetch("examFeedback")
      .fetch("examSections")
      .fetch(
        "examSections.sectionQuestions",
        "sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType",
        FetchConfig.ofQuery()
      )
      .fetch("examSections.sectionQuestions.question", "id, type, question")
      .fetch("examSections.sectionQuestions.question.attachment", "fileName")
      .fetch("examSections.sectionQuestions.options")
      .fetch("examSections.sectionQuestions.options.option", "id, option")
      .fetch("examSections.sectionQuestions.essayAnswer", "id, answer, evaluatedScore")
      .fetch("examSections.sectionQuestions.essayAnswer.attachment", "fileName")
      .fetch("examSections.sectionQuestions.clozeTestAnswer", "id, question, answer")
      .where()
      .idEq(eid)
      .eq("creator", user)
      .isNotNull("parent.examFeedbackConfig")
      .ne("gradingType", Grade.Type.NOT_GRADED)
      .in("state", Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)
      .find match
      case Some(exam) if canReleaseAnswers(exam) =>
        val blankAnswerText = messaging("clozeTest.blank.answer")(using Lang.forCode(user.getLanguage.getCode))
        exam.getExamSections.asScala
          .flatMap(_.getSectionQuestions.asScala)
          .filter(_.getQuestion.getType == Question.Type.ClozeTestQuestion)
          .foreach(esq =>
            val answer = Option(esq.getClozeTestAnswer).getOrElse {
              val cta = new ClozeTestAnswer()
              cta.save()
              esq.setClozeTestAnswer(cta)
              esq.update()
              cta
            }
            answer.setQuestionWithResults(esq, blankAnswerText, false)
          )
        exam.getExamSections.asScala
          .flatMap(_.getSectionQuestions.asScala)
          .foreach(esq =>
            esq.setDerivedMaxScore()
            esq.setDerivedAssessedScore()
          )
        exam.setMaxScore()
        exam.setTotalScore()
        // hide the correct answers for cloze test questions// hide the correct answers for cloze test questions
        exam.getExamSections.asScala
          .flatMap(_.getSectionQuestions.asScala)
          .filter(esq => esq.getQuestion.getType eq Question.Type.ClozeTestQuestion)
          .foreach(esq => esq.getQuestion.setQuestion(null))
        Ok(exam.asJson)
      case _ => Ok
  }

  private def canReleaseAnswers(exam: Exam) =
    val config = exam.getParent.getExamFeedbackConfig
    config.getReleaseType match
      case ONCE_LOCKED => true
      case GIVEN_DATE  => DateTime.now.isAfter(config.getReleaseDate.withTimeAtStartOfDay.plusDays(1))
