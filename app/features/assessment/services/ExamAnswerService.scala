// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

import io.ebean.{DB, FetchConfig}
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.assessment.ExamFeedbackConfig.ReleaseType.{GIVEN_DATE, ONCE_LOCKED}
import models.exam.{Exam, Grade}
import models.questions.{ClozeTestAnswer, Question}
import models.user.User
import org.joda.time.DateTime
import play.api.i18n.MessagesApi
import play.i18n.Lang

import javax.inject.Inject
import scala.jdk.CollectionConverters.CollectionHasAsScala

class ExamAnswerService @Inject() (
    private val messaging: MessagesApi
) extends EbeanQueryExtensions
    with EbeanJsonExtensions:

  def findExamForUser(eid: Long, user: User): Option[Exam] =
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
      .find

  def prepareExamForAnswerRelease(exam: Exam, user: User): Exam =
    val blankAnswerText = messaging("clozeTest.blank.answer")(using Lang.forCode(user.getLanguage.getCode))

    // Create ClozeTestAnswer if missing and set question with results
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

    // Set derived scores
    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .foreach(esq =>
        esq.setDerivedMaxScore()
        esq.setDerivedAssessedScore()
      )

    // Set exam scores
    exam.setMaxScore()
    exam.setTotalScore()

    // Hide correct answers for cloze test questions
    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .filter(esq => esq.getQuestion.getType eq Question.Type.ClozeTestQuestion)
      .foreach(esq => esq.getQuestion.setQuestion(null))

    exam

  def canReleaseAnswers(exam: Exam): Boolean =
    val config = exam.getParent.getExamFeedbackConfig
    config.getReleaseType match
      case ONCE_LOCKED => true
      case GIVEN_DATE  => DateTime.now.isAfter(config.getReleaseDate.withTimeAtStartOfDay.plusDays(1))
