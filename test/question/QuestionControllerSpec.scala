// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package question

import base.BaseIntegrationSpec
import io.ebean.DB
import database.EbeanQueryExtensions
import models.questions.{MultipleChoiceOption, Question}
import models.sections.{ExamSection, ExamSectionQuestion}
import models.user.User
import play.api.http.Status
import play.api.libs.json._
import play.api.mvc.Result
import play.api.test.Helpers._

import scala.jdk.CollectionConverters._

class QuestionControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  "QuestionController" when:
    "adding essay question to exam" should:
      "create, update and add question successfully" in:
        val (user, session) = runIO(loginAsTeacher())
        // Setup
        val examId    = 1L
        val sectionId = 1L

        val section = DB.find(classOf[ExamSection], sectionId)
        section must not be null
        val sectionQuestionCount = section.getSectionQuestions.size

        val draft = Json.obj(
          "type"                  -> "EssayQuestion",
          "question"              -> "What is love?",
          "defaultMaxScore"       -> 2,
          "defaultEvaluationType" -> "Points",
          "questionOwners"        -> Json.arr(Json.obj("id" -> JsNumber(BigDecimal(user.getId))))
        )

        // Create draft
        val createResult = runIO(makeRequest(POST, "/app/questions", Some(draft), session = session))
        statusOf(createResult).must(be(Status.OK))
        val createJson      = contentAsJsonOf(createResult)
        val questionId      = (createJson \ "id").as[Long]
        val createdQuestion = DB.find(classOf[Question], questionId)
        createdQuestion.getType must be(Question.Type.EssayQuestion)

        // Update it
        val update = Json.obj(
          "type"                  -> "EssayQuestion",
          "question"              -> "What is love now?",
          "defaultMaxScore"       -> 3,
          "defaultEvaluationType" -> "Selection",
          "questionOwners"        -> Json.arr(Json.obj("id" -> JsNumber(BigDecimal(user.getId))))
        )
        val updateResult = runIO(put(s"/app/questions/$questionId", update, session = session))
        statusOf(updateResult).must(be(Status.OK))
        val updateJson        = contentAsJsonOf(updateResult)
        val updatedQuestionId = (updateJson \ "id").as[Long]

        // Add to exam
        val addToExamData = Json.obj("sequenceNumber" -> 0)
        val addResult = runIO(
          makeRequest(
            POST,
            s"/app/exams/$examId/sections/$sectionId/questions/$updatedQuestionId",
            Some(addToExamData),
            session = session
          )
        )
        statusOf(addResult).must(be(Status.OK))
        val sectionJson      = contentAsJsonOf(addResult)
        val sectionQuestions = (sectionJson \ "sectionQuestions").as[JsArray]
        sectionQuestions.value must have size (sectionQuestionCount + 1)

        // Check that section now has a reference to the original question
        val examSectionQuestion =
          DB.find(classOf[ExamSectionQuestion]).where().eq("question.id", updatedQuestionId).findOne()
        examSectionQuestion must not be null

    "working with weighted multiple choice questions" should:
      "add option to weighted multiple choice question" in:
        val q               = getQuestionWithOwnership()
        val (user, session) = runIO(loginAsTeacher())
        assertExamSectionQuestion(q, 3, 4.0, Array(2.0, 2.0, -2.0), -2.0)

        // Add new option to question
        val updatedQuestion = addNewOption(q, Some(0.75), Array(1.0, 1.0, -1.0, 0.75), -1.0, user, session)

        assertExamSectionQuestion(updatedQuestion, 4, 4.0, Array(1.46, 1.46, -2.0, 1.08), -2.0)

      "add null score option to weighted multiple choice question" in:
        val q               = getQuestionWithOwnership()
        val (user, session) = runIO(loginAsTeacher())
        assertExamSectionQuestion(q, 3, 4.0, Array(2.0, 2.0, -2.0), -2.0)

        // Add new option to question
        val updatedQuestion = addNewOption(q, None, Array(1.0, 1.0, -1.0, Double.NaN), -1.0, user, session)

        assertExamSectionQuestion(updatedQuestion, 4, 4.0, Array(2.0, 2.0, -2.0, Double.NaN), -2.0)

      "add negative option to weighted multiple choice question" in:
        val q               = getQuestionWithOwnership()
        val (user, session) = runIO(loginAsTeacher())
        assertExamSectionQuestion(q, 3, 4.0, Array(2.0, 2.0, -2.0), -2.0)

        // Add new option to question
        val updatedQuestion = addNewOption(q, Some(-0.73), Array(1.0, 1.0, -1.0, -0.73), -1.73, user, session)

        assertExamSectionQuestion(updatedQuestion, 4, 4.0, Array(2.0, 2.0, -1.16, -0.84), -2.0)

      "delete option from weighted multiple choice question" in:
        val q               = getQuestionWithOwnership()
        val (user, session) = runIO(loginAsTeacher())
        // Add new option to question and then delete it
        assertExamSectionQuestion(q, 3, 4.0, Array(2.0, 2.0, -2.0), -2.0)
        val questionWithNewOption =
          addNewOption(q, Some(0.75), Array(1.0, 1.0, -1.0, 0.75), -1.0, user, session)
        assertExamSectionQuestion(questionWithNewOption, 4, 4.0, Array(1.46, 1.46, -2.0, 1.08), -2.0)

        deleteAddedOption(questionWithNewOption, user, session)

        val finalQuestion = DB.find(classOf[Question], questionWithNewOption.getId)
        finalQuestion must not be null
        finalQuestion.getOptions.size must be(3)
        assertExamSectionQuestion(finalQuestion, 3, 4.0, Array(2.0, 2.0, -2.0), -2.0)

      "delete negative option from weighted multiple choice question" in:
        val q               = getQuestionWithOwnership()
        val (user, session) = runIO(loginAsTeacher())
        // Add new option to question and then delete it
        assertExamSectionQuestion(q, 3, 4.0, Array(2.0, 2.0, -2.0), -2.0)
        val questionWithNewOption =
          addNewOption(q, Some(-0.5), Array(1.0, 1.0, -1.0, -0.5), -1.5, user, session)
        assertExamSectionQuestion(questionWithNewOption, 4, 4.0, Array(2.0, 2.0, -1.33, -0.67), -2.0)

        deleteAddedOption(questionWithNewOption, user, session)

        val finalQuestion = DB.find(classOf[Question], questionWithNewOption.getId)
        finalQuestion must not be null
        finalQuestion.getOptions.size must be(3)
        assertExamSectionQuestion(finalQuestion, 3, 4.0, Array(2.0, 2.0, -2.0), -2.0)

    "exporting questions" should:
      "export questions to Moodle format" in:
        val (user, session) = runIO(loginAsTeacher())
        val questionIds     = DB.find(classOf[Question]).findList().asScala.map(_.getId)
        val idsArray        = JsArray(questionIds.map(id => JsNumber(BigDecimal(id))).toSeq)
        val params          = Json.obj("params" -> Json.obj("ids" -> idsArray))

        val result = runIO(makeRequest(POST, "/app/questions/export", Some(params), session = session))
        statusOf(result).must(be(Status.OK))

    "working with claim choice questions" should:
      "create and update claim choice question" in:
        val (user, session) = runIO(loginAsTeacher())
        val correctOption   = createClaimChoiceOptionJson("Oikea", 1.0, correct = true, "CorrectOption")
        val incorrectOption = createClaimChoiceOptionJson("Väärä", -1.0, correct = false, "IncorrectOption")
        val skipOption      = createClaimChoiceOptionJson("EOS", 0.0, correct = false, "SkipOption")

        val options = JsArray(Seq(correctOption, incorrectOption, skipOption))
        val draft   = createClaimChoiceQuestionJson("<p>Testikysymys</p>", options, user.getId)

        val createResult = runIO(makeRequest(POST, "/app/questions", Some(draft), session = session))
        statusOf(createResult).must(be(Status.OK))

        val saved = parseQuestionFromResponse(createResult)
        saved.getType must be(Question.Type.ClaimChoiceQuestion)
        saved.getOptions.size must be(3)

        val hasCorrectAnswer = saved.getOptions.asScala.exists { o =>
          o.getClaimChoiceType == MultipleChoiceOption.ClaimChoiceOptionType.CorrectOption &&
          o.getOption == "Oikea" &&
          math.abs(o.getDefaultScore.doubleValue - 1.0) < 0.01
        }
        val hasIncorrectAnswer = saved.getOptions.asScala.exists { o =>
          o.getClaimChoiceType == MultipleChoiceOption.ClaimChoiceOptionType.IncorrectOption &&
          o.getOption == "Väärä" &&
          math.abs(o.getDefaultScore.doubleValue - -1.0) < 0.01
        }
        val hasSkipAnswer = saved.getOptions.asScala.exists { o =>
          o.getClaimChoiceType == MultipleChoiceOption.ClaimChoiceOptionType.SkipOption &&
          o.getOption == "EOS" &&
          math.abs(o.getDefaultScore.doubleValue - 0.0) < 0.01
        }

        (hasCorrectAnswer && hasIncorrectAnswer && hasSkipAnswer) must be(true)

        // Update the question
        val correctOptionUpdated =
          createClaimChoiceOptionJson("Oikea, muokattu", 2.0, correct = true, "CorrectOption")
        val modifiedOptions = JsArray(Seq(correctOptionUpdated, incorrectOption, skipOption))
        val updatedQuestion =
          createClaimChoiceQuestionJson("<p>Testi väittämä-kysymys, muokattu</p>", modifiedOptions, user.getId)

        val updateResult = runIO(put(s"/app/questions/${saved.getId}", updatedQuestion, session = session))
        statusOf(updateResult).must(be(Status.OK))

        val updated = parseQuestionFromResponse(updateResult)
        updated.getOptions.size must be(3)
        updated.getQuestion must be("<p>Testi väittämä-kysymys, muokattu</p>")

        val hasModifiedOption = updated.getOptions.asScala.exists { o =>
          o.getOption == "Oikea, muokattu" &&
          math.abs(o.getDefaultScore.doubleValue - 2.0) < 0.01 &&
          o.getClaimChoiceType == MultipleChoiceOption.ClaimChoiceOptionType.CorrectOption
        }
        hasModifiedOption must be(true)

      "reject empty claim choice question options" in:
        val (user, session) = runIO(loginAsTeacher())
        val options         = JsArray()
        val draft           = createClaimChoiceQuestionJson("Testikysymys", options, user.getId)

        val result = runIO(makeRequest(POST, "/app/questions", Some(draft), session = session))
        statusOf(result).must(be(Status.BAD_REQUEST))

      "validate claim choice options correctly" in:
        val (user, session) = runIO(loginAsTeacher())
        // Create set of different kind of possible options
        val correct            = createClaimChoiceOptionJson("Oikea", 1.0, correct = true, "CorrectOption")
        val correctWithError   = createClaimChoiceOptionJson("Oikea", -1.0, correct = true, "CorrectOption")
        val incorrect          = createClaimChoiceOptionJson("Väärä", -1.0, correct = false, "IncorrectOption")
        val incorrectWithError = createClaimChoiceOptionJson("Väärä", 1.0, correct = false, "IncorrectOption")
        val skip               = createClaimChoiceOptionJson("EOS", 0.0, correct = false, "SkipOption")

        // Create invalid sets of options
        val invalidOptionSets = Seq(
          JsArray(Seq(correctWithError, incorrect, skip)),
          JsArray(Seq(correct, incorrectWithError, skip)),
          JsArray(Seq(correct, incorrect)),
          JsArray(Seq(correct, correct, incorrect, skip)),
          JsArray(Seq(correct, correct, skip))
        )

        val drafts = invalidOptionSets.map(options =>
          createClaimChoiceQuestionJson("Virheellinen testikysymys", options, user.getId)
        )

        // Test that all sets of invalid options return bad request code
        drafts.foreach { draft =>
          val result = runIO(makeRequest(POST, "/app/questions", Some(draft), session = session))
          statusOf(result).must(be(Status.BAD_REQUEST))
        }

  // Helper methods
  /** Fetch the test question fresh from DB and ensure teacher ownership is set up. This avoids test isolation issues
    * where question owners might be cleared between tests.
    */
  private def getQuestionWithOwnership(): Question =
    ensureTestDataLoaded()
    val q = DB
      .find(classOf[Question])
      .fetch("questionOwners")
      .list
      .find(q => q.getQuestion.contains("Kumpi vai kampi") && q.getType == Question.Type.WeightedMultipleChoiceQuestion)
      .getOrElse(fail("Question not found"))
    DB.find(classOf[User]).where().eq("eppn", "teacher@funet.fi").find match
      case Some(teacher) =>
        if !q.getQuestionOwners.contains(teacher) then
          q.getQuestionOwners.add(teacher)
          q.update()
        q
      case None => fail("Teacher user not found")

  private def deleteAddedOption(question: Question, user: User, session: play.api.mvc.Session): Unit =
    val options = question.getOptions.asScala.toList.sortBy(_.getId)
    val json = Json.obj(
      "id"       -> JsNumber(BigDecimal(question.getId)),
      "type"     -> "WeightedMultipleChoiceQuestion",
      "question" -> question.getQuestion,
      "options" -> JsArray(
        Seq(
          Json.obj(
            "id"           -> JsNumber(BigDecimal(options.head.getId)),
            "defaultScore" -> 1.0,
            "option"       -> "Kumpi"
          ),
          Json.obj(
            "id"           -> JsNumber(BigDecimal(options(1).getId)),
            "defaultScore" -> 1.0,
            "option"       -> "Kampi"
          ),
          Json.obj(
            "id"           -> JsNumber(BigDecimal(options(2).getId)),
            "defaultScore" -> -1.0,
            "option"       -> "Molemmat"
          )
        )
      ),
      "questionOwners" -> JsArray(Seq(Json.obj("id" -> JsNumber(BigDecimal(user.getId)))))
    )

    val result = runIO(put(s"/app/questions/${question.getId}", json, session = session))
    statusOf(result).must(be(Status.OK))

  private def addNewOption(
      question: Question,
      defaultScore: Option[Double],
      expectedDefaultScores: Array[Double],
      minDefaultScore: Double,
      user: User,
      session: play.api.mvc.Session
  ): Question =
    val options = question.getOptions.asScala.toList.sortBy(_.getId)

    val newOptionJson = defaultScore match
      case Some(score) => Json.obj("defaultScore" -> score, "option" -> "Uusi")
      case None        => Json.obj("option" -> "Uusi") // No defaultScore field for null

    val json = Json.obj(
      "id"                          -> JsNumber(question.getId.longValue()),
      "type"                        -> "WeightedMultipleChoiceQuestion",
      "question"                    -> question.getQuestion,
      "defaultNegativeScoreAllowed" -> true,
      "options" -> JsArray(
        Seq(
          Json.obj(
            "id"           -> JsNumber(options.head.getId.longValue()),
            "defaultScore" -> 1.0,
            "option"       -> "Kumpi"
          ),
          Json.obj(
            "id"           -> JsNumber(options(1).getId.longValue()),
            "defaultScore" -> 1.0,
            "option"       -> "Kampi"
          ),
          Json.obj(
            "id"           -> JsNumber(options(2).getId.longValue()),
            "defaultScore" -> -1.0,
            "option"       -> "Molemmat"
          ),
          newOptionJson
        )
      ),
      "questionOwners" -> JsArray(Seq(Json.obj("id" -> JsNumber(user.getId.longValue()))))
    )

    val result = runIO(put(s"/app/questions/${question.getId}", json, session = session))
    statusOf(result).must(be(Status.OK))

    val saved = DB.find(classOf[Question], question.getId)
    saved must not be null
    saved.getOptions.size must be(4)
    saved.getMinDefaultScore.doubleValue must be(minDefaultScore +- 0.01)

    val defaultScores = saved.getOptions.asScala.toList.sortBy(_.getId).map(_.getDefaultScore)
    // Handle NaN comparison specially
    expectedDefaultScores.zip(defaultScores).foreach { case (expected, actual) =>
      if (expected.isNaN) Option(actual).forall(_.isNaN) must be(true)
      else if (actual != null) actual.doubleValue must be(expected +- 0.01) // Allow small floating point differences
      else fail(s"Expected $expected but got null")
    }

    saved

  private def assertExamSectionQuestion(
      question: Question,
      optionSize: Int,
      maxScore: Double,
      expectedScores: Array[Double],
      minScore: Double
  ): Unit =
    val examSectionQuestions = question.getExamSectionQuestions
    examSectionQuestions.size must be(1)

    val esq = examSectionQuestions.iterator().next()
    esq.getOptions.size must be(optionSize)
    esq.getMinScore.doubleValue must be(minScore +- 0.01)
    esq.getMaxAssessedScore.doubleValue must be(maxScore +- 0.01)

    val scores = esq.getOptions.asScala.map(_.getScore).toArray
    expectedScores.zip(scores).foreach { case (expected, actual) =>
      if (expected.isNaN) Option(actual).forall(_.isNaN) must be(true)
      else if (actual != null) actual.doubleValue must be(expected +- 0.01) // Allow small floating point differences
      else fail(s"Expected $expected but got null")
    }

  private def parseQuestionFromResponse(result: Result): Question =
    val responseJson = contentAsJsonOf(result)
    val questionId   = (responseJson \ "id").as[Long]
    DB.find(classOf[Question], questionId)

  private def createClaimChoiceOptionJson(
      option: String,
      score: Double,
      correct: Boolean,
      optionType: String
  ): JsObject =
    Json.obj(
      "option"          -> option,
      "defaultScore"    -> score,
      "correctOption"   -> correct,
      "claimChoiceType" -> optionType
    )

  private def createClaimChoiceQuestionJson(questionText: String, options: JsArray, userId: Long): JsObject =
    Json.obj(
      "type"           -> "ClaimChoiceQuestion",
      "question"       -> questionText,
      "options"        -> options,
      "questionOwners" -> JsArray(Seq(Json.obj("id" -> JsNumber(BigDecimal(userId)))))
    )
