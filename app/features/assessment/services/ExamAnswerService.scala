// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.DB
import io.ebean.text.PathProperties
import models.assessment.ExamFeedbackReleaseType.{GIVEN_DATE, ONCE_LOCKED}
import models.exam.Exam
import models.exam.ExamState
import models.exam.GradeType
import models.questions.ClozeTestAnswer
import models.questions.QuestionType
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

  private val answerQueryPP = PathProperties.parse(
    """(*,
      |  course(name, code, credits),
      |  grade(name),
      |  examFeedback(*),
      |  examSections(*,
      |    sectionQuestions(sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType,
      |      question(id, type, question,
      |        attachment(fileName)
      |      ),
      |      options(*,
      |        option(id, option)
      |      ),
      |      essayAnswer(id, answer, evaluatedScore,
      |        attachment(fileName)
      |      ),
      |      clozeTestAnswer(id, question, answer)
      |    )
      |  )
      |)""".stripMargin
  )

  def findExamForUser(eid: Long, user: User): Option[Exam] =
    DB
      .find(classOf[Exam])
      .apply(answerQueryPP)
      .where()
      .idEq(eid)
      .eq("creator", user)
      .isNotNull("parent.examFeedbackConfig")
      .ne("gradingType", GradeType.NOT_GRADED)
      .in("state", ExamState.GRADED_LOGGED, ExamState.ARCHIVED)
      .find

  def prepareExamForAnswerRelease(exam: Exam, user: User): Exam =
    val blankAnswerText =
      messaging("clozeTest.blank.answer")(using Lang.forCode(user.language.code))

    // Create ClozeTestAnswer if missing and set question with results
    exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .filter(_.question.`type` == QuestionType.ClozeTestQuestion)
      .foreach(esq =>
        val answer = Option(esq.clozeTestAnswer).getOrElse {
          val cta = new ClozeTestAnswer()
          cta.save()
          esq.clozeTestAnswer = cta
          esq.update()
          cta
        }
        answer.setQuestionWithResults(esq, blankAnswerText, false)
      )

    // Set derived scores
    exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .foreach { esq =>
        esq.setDerivedMaxScore()
        esq.setDerivedAssessedScore()
      }

    // Set exam scores
    exam.setMaxScore()
    exam.setTotalScore()

    // Hide correct answers for cloze test questions
    exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .filter(esq => esq.question.`type` == QuestionType.ClozeTestQuestion)
      .foreach(esq => esq.question.question = null)

    exam

  def canReleaseAnswers(exam: Exam): Boolean =
    val config = exam.parent.examFeedbackConfig
    config.releaseType match
      case ONCE_LOCKED => true
      case GIVEN_DATE =>
        DateTime.now.isAfter(config.releaseDate.withTimeAtStartOfDay.plusDays(1))
