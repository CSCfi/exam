// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.exam

import io.ebean.DB
import models.questions.ClaimChoiceOptionType
import models.questions.QuestionType
import models.questions.{MultipleChoiceOption, Question}
import models.sections.{ExamSectionQuestion, ExamSectionQuestionOption, Sortable}
import models.user.User
import org.jsoup.Jsoup
import org.jsoup.safety.Safelist
import play.api.libs.json.JsValue
import play.api.mvc.Result
import play.api.mvc.Results.*
import validation.core.PlayJsonHelper

import scala.jdk.CollectionConverters.*

enum OptionUpdateOptions:
  case SKIP_DEFAULTS, HANDLE_DEFAULTS

trait SectionQuestionHandler:

  def checkBounds(from: Int, to: Int): Option[Result] =
    if from < 0 || to < 0 then Some(BadRequest)
    else if from == to then Some(Ok)
    else None

  def saveOption(option: MultipleChoiceOption, question: Question, user: User): Unit =
    question.options.add(option)
    question.setModifierWithDate(user)
    question.save()
    option.save()

  def updateOptions(sectionQuestion: ExamSectionQuestion, question: Question): Unit =
    sectionQuestion.options.clear()
    question.options.asScala.foreach { option =>
      val esqo = new ExamSectionQuestionOption()
      esqo.option = option
      esqo.score = option.defaultScore
      sectionQuestion.options.add(esqo)
    }

  def propagateOptionCreationToExamQuestions(
      question: Question,
      modifiedExamQuestion: ExamSectionQuestion,
      option: MultipleChoiceOption
  ): Unit =
    // Need to add the new option to bound exam section questions as well
    if question.`type` == QuestionType.MultipleChoiceQuestion ||
      question.`type` == QuestionType.WeightedMultipleChoiceQuestion
    then
      question.examSectionQuestions.asScala.foreach { examQuestion =>
        val esqo = new ExamSectionQuestionOption()
        // Preserve scores for the exam question that is under modification right now
        val preserveScore =
          modifiedExamQuestion != null && modifiedExamQuestion.equals(examQuestion)
        val unroundedScore =
          if preserveScore then option.defaultScore
          else calculateOptionScore(question, option, examQuestion)
        esqo.score = if unroundedScore == null then null else round(unroundedScore)
        esqo.option = option
        examQuestion.addOption(esqo, preserveScore)
        examQuestion.update()
      }

  /** Calculates a new option score for ExamSectionQuestionOption.
    *
    * @param question
    *   Base question.
    * @param option
    *   New added option.
    * @param esq
    *   ExamSectionQuestion.
    * @return
    *   New calculated score rounded to two decimals.
    */
  def calculateOptionScore(
      question: Question,
      option: MultipleChoiceOption,
      esq: ExamSectionQuestion
  ): java.lang.Double =
    val defaultScore = option.defaultScore
    if defaultScore == null || defaultScore == 0 then defaultScore
    else
      val result =
        if defaultScore > 0 then
          (esq.getMaxAssessedScore / 100) * ((defaultScore / question.getMaxDefaultScore) * 100)
        else if defaultScore < 0 then
          (esq.getMinScore / 100) * ((defaultScore / question.getMinDefaultScore) * 100)
        else 0.0
      result

  def updateSequences(sortables: List[Sortable], ordinal: Int): Unit =
    // Increase sequences for the entries above the inserted one
    sortables.foreach { s =>
      val sequenceNumber = s.getOrdinal
      if sequenceNumber >= ordinal then s.setOrdinal(sequenceNumber + 1)
    }

  def updateOption(node: JsValue, defaults: OptionUpdateOptions): Unit =
    PlayJsonHelper.parse[Long]("id", node) match
      case None => ()
      case Some(id) =>
        Option(DB.find(classOf[MultipleChoiceOption], id)).foreach { option =>
          PlayJsonHelper.parse[String]("option", node).foreach(v => option.option = v)
          PlayJsonHelper
            .parseEnum("claimChoiceType", node, classOf[ClaimChoiceOptionType])
            .foreach(v => option.claimChoiceType = v)
          if defaults == OptionUpdateOptions.HANDLE_DEFAULTS then
            PlayJsonHelper.parse[Double]("defaultScore", node).foreach { d =>
              option.defaultScore = round(java.lang.Double.valueOf(d))
            }
          option.correctOption = PlayJsonHelper.parseOrElse("correctOption", node, false)
          option.update()
        }

  def round(src: java.lang.Double): java.lang.Double =
    if src == null then null
    else Math.round(src * 100) * (1.0 / 100)

  def deleteOption(option: MultipleChoiceOption): Unit =
    val question = option.question
    if question.`type` == QuestionType.WeightedMultipleChoiceQuestion then
      question.examSectionQuestions.asScala.foreach { esq =>
        esq.removeOption(option, false)
        esq.save()
      }
    option.delete()

  def updateExamQuestion(sectionQuestion: ExamSectionQuestion, question: Question): Unit =
    sectionQuestion.question = question
    sectionQuestion.maxScore = question.defaultMaxScore
    val answerInstructions = question.defaultAnswerInstructions
    sectionQuestion.answerInstructions =
      if answerInstructions == null then null
      else Jsoup.clean(answerInstructions, Safelist.relaxed())

    val evaluationCriteria = question.defaultEvaluationCriteria
    sectionQuestion.evaluationCriteria =
      if evaluationCriteria == null then null
      else Jsoup.clean(evaluationCriteria, Safelist.relaxed())

    sectionQuestion.evaluationType = question.defaultEvaluationType
    sectionQuestion.expectedWordCount = question.defaultExpectedWordCount
    sectionQuestion.negativeScoreAllowed = question.defaultNegativeScoreAllowed
    sectionQuestion.optionShufflingOn = question.defaultOptionShufflingOn
    updateOptions(sectionQuestion, question)
