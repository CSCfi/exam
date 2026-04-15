// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.question.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.question.services.QuestionError.*
import io.ebean.text.PathProperties
import io.ebean.{DB, ExpressionList}
import jakarta.persistence.PersistenceException
import models.exam.ExamState
import models.questions.*
import models.sections.{ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.{Role, User}
import org.apache.commons.lang3.math.NumberUtils
import org.jsoup.Jsoup
import play.api.Logging
import play.api.libs.json.*
import services.exam.{OptionUpdateOptions, SectionQuestionHandler}
import services.xml.{MoodleXmlExporter, MoodleXmlImporter}
import validation.core.SanitizingHelper

import javax.inject.Inject
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Try}

enum QuestionState:
  case NEW, SAVED, DELETED

class QuestionService @Inject() (
    private val xmlExporter: MoodleXmlExporter,
    private val xmlImporter: MoodleXmlImporter
) extends SectionQuestionHandler
    with EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  /** @return optional validation message (i18n key or plain string) when the body is invalid */
  def validate(question: Question, body: JsValue): Option[String] =
    def fieldExists(name: String) = (body \ name).toOption.exists(_ != JsNull)

    def typeError: Option[String] =
      question.`type` match
        case QuestionType.EssayQuestion =>
          if !fieldExists("defaultEvaluationType") then Some("no evaluation type defined")
          else
            val evalType =
              QuestionEvaluationType.valueOf((body \ "defaultEvaluationType").as[String])
            Option.when(
              evalType == QuestionEvaluationType.Points && !fieldExists("defaultMaxScore")
            )("no max score defined")
        case QuestionType.MultipleChoiceQuestion =>
          (body \ "options").asOpt[JsArray].filter(_.value.size >= 2) match
            case None => Some("i18n_minimum_of_two_options_required")
            case Some(options) =>
              Option.when(options.value.forall(o => !(o \ "correctOption").as[Boolean]))(
                "i18n_correct_option_required"
              )
        case QuestionType.WeightedMultipleChoiceQuestion =>
          (body \ "options").asOpt[JsArray].filter(_.value.size >= 2) match
            case None => Some("i18n_minimum_of_two_options_required")
            case Some(options) =>
              Option.when(options.value.forall(o => (o \ "defaultScore").as[Double] <= 0))(
                "i18n_correct_option_required"
              )
        case QuestionType.ClozeTestQuestion =>
          if !fieldExists("defaultMaxScore") then Some("no max score defined") else clozeError(body)
        case QuestionType.ClaimChoiceQuestion =>
          (body \ "options").asOpt[JsArray].filter(_.value.size == 3) match
            case None => Some("i18n_three_answers_required_in_claim_question")
            case Some(options) =>
              Option.when(!claimChoiceOptionsValid(options))(
                "i18n_incorrect_claim_question_options"
              )
        case null => Some("unknown question type")

    val questionError =
      if fieldExists("question") then typeError else Some("no question text defined")

    val ownerError = Option.when((body \ "questionOwners").asOpt[JsArray].forall(_.value.isEmpty))(
      "no owners defined"
    )

    ownerError.orElse(questionError)

  private def clozeError(body: JsValue): Option[String] =
    val questionText = (body \ "question").as[String]
    if !questionText.contains("cloze=\"true\"") then Some("no embedded answers")
    else
      val doc     = Jsoup.parse(questionText)
      val answers = doc.select("span[cloze=true]")
      val ids     = answers.asScala.map(_.attr("id")).toSet
      if answers.size != ids.size then Some("duplicate ids found")
      else if answers.asScala.exists(a => {
          val p = a.attr("precision"); p.isEmpty || !NumberUtils.isParsable(p)
        })
      then Some("invalid precision found")
      else if answers.asScala.filter(_.attr("numeric") == "true").exists(a =>
          !NumberUtils.isParsable(a.text())
        )
      then Some("non-numeric correct answer for numeric question")
      else None

  private def claimChoiceOptionsValid(options: JsArray): Boolean =
    options.value.filter { n =>
      val cType   = SanitizingHelper.parseEnum("claimChoiceType", n, classOf[ClaimChoiceOptionType])
      val score   = (n \ "defaultScore").as[Double]
      val optText = (n \ "option").as[String]
      cType.exists(ct =>
        (ct == ClaimChoiceOptionType.CorrectOption && score > 0 && optText.nonEmpty) ||
          (ct == ClaimChoiceOptionType.IncorrectOption && score <= 0 && optText.nonEmpty) ||
          (ct == ClaimChoiceOptionType.SkipOption && score == 0 && optText.nonEmpty)
      )
    }.flatMap(n => SanitizingHelper.parseEnum("claimChoiceType", n, classOf[ClaimChoiceOptionType]))
      .toSet.size == 3

  def getQuestions(
      user: User,
      examIds: List[Long],
      courseIds: List[Long],
      tagIds: List[Long],
      sectionIds: List[Long],
      ownerIds: List[Long]
  ): (List[Question], PathProperties) =
    if user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) &&
      Seq(examIds, courseIds, tagIds, sectionIds, ownerIds).forall(_.isEmpty)
    then (List.empty[Question], PathProperties.parse("(*)"))
    else
      val pp = PathProperties.parse(
        """(*,
          |questionOwners(id, firstName, lastName, email),
          |attachment(*),
          |options(*),
          |tags(id, name, creator(id)),
          |examSectionQuestions(
          |  examSection(
          |    exam(id, name, state, periodEnd, course(id, name, code))
          |  )
          |)
          |)""".stripMargin
      )
      val baseQuery =
        DB.find(classOf[Question]).apply(pp).where().isNull("parent").endJunction().ne(
          "state",
          QuestionState.DELETED.toString
        )
      val withOwnerFilter =
        if user.hasRole(Role.Name.TEACHER) then
          if ownerIds.isEmpty then baseQuery.eq("questionOwners", user)
          else baseQuery.in("questionOwners.id", ownerIds.asJava)
        else baseQuery.inOrEmpty("questionOwners.id", ownerIds.asJava)
      val withExamFilter =
        withOwnerFilter.inOrEmpty("examSectionQuestions.examSection.exam.id", examIds.asJava)
      val withCourseFilter =
        withExamFilter.inOrEmpty(
          "examSectionQuestions.examSection.exam.course.id",
          courseIds.asJava
        )
      val withTagFilter = withCourseFilter.inOrEmpty("tags.id", tagIds.asJava)
      val withSectionFilter =
        withTagFilter.inOrEmpty("examSectionQuestions.examSection.id", sectionIds.asJava)

      val baseQuestions = withSectionFilter.orderBy("created desc").distinct
      val questions =
        if user.hasRole(Role.Name.TEACHER) && ownerIds.nonEmpty then
          baseQuestions.filter(_.questionOwners.contains(user))
        else baseQuestions

      (questions.toList, pp)

  private def getQuestionOfUser(expr: ExpressionList[Question], user: User): Option[Question] =
    if user.hasRole(Role.Name.TEACHER) then
      expr
        .disjunction()
        .eq("shared", true)
        .eq("questionOwners", user)
        .eq("examSectionQuestions.examSection.exam.examOwners", user)
        .endJunction()
        .find
    else expr.find

  def getQuestion(id: Long, user: User): Either[QuestionError, (Question, PathProperties)] =
    val query = DB.find(classOf[Question])
    val pp = PathProperties.parse(
      """(*,
        |questionOwners(id, firstName, lastName, email),
        |attachment(*),
        |options(*),
        |tags(id, name, creator(id)),
        |examSectionQuestions(
        |  examSection(
        |    exam(id, name)
        |  )
        |)
        |)""".stripMargin
    )
    val expr = DB.find(classOf[Question]).apply(pp).where().idEq(id)
    getQuestionOfUser(expr, user) match
      case Some(q) =>
        val sortedOptions = q.options.asScala.toSeq.sorted
        q.options.clear()
        q.options.addAll(sortedOptions.asJava)
        Right((q, pp))
      case None => Left(AccessForbidden)

  def copyQuestion(id: Long, user: User): Either[QuestionError, Question] =
    val baseQuery = DB.find(classOf[Question]).fetch("questionOwners").where().idEq(id)
    val query =
      if user.hasRole(Role.Name.TEACHER) then
        baseQuery.disjunction().eq("shared", true).eq("questionOwners", user).endJunction()
      else baseQuery
    query.find match
      case None => Left(AccessForbidden)
      case Some(question) =>
        val sortedOptions = question.options.asScala.toSeq.sorted
        question.options.clear()
        question.options.addAll(sortedOptions.asJava)
        val copy = question.copy()
        copy.parent = null
        copy.question = s"<p>**COPY**</p>${question.question}"
        copy.setCreatorWithDate(user)
        copy.setModifierWithDate(user)
        copy.save()
        copy.tags.addAll(question.tags)
        copy.questionOwners.clear()
        copy.questionOwners.add(user)
        copy.update()
        DB.saveAll(copy.options)
        Right(copy)

  // TODO: Move to sanitizer
  private def parseFromBody(
      body: JsValue,
      user: User,
      existing: Option[Question],
      questionText: Option[String]
  ): Question =
    val sanitizedQuestionText = questionText.orNull
    val defaultMaxScore =
      (body \ "defaultMaxScore").asOpt[Double].map(round).getOrElse(0.0)
    val defaultWordCount =
      (body \ "defaultExpectedWordCount").asOpt[Int].map(_.asInstanceOf[java.lang.Integer]).orNull
    val defaultEvaluationType = (body \ "defaultEvaluationType")
      .asOpt[String]
      .flatMap(s => Try(QuestionEvaluationType.valueOf(s)).toOption)
      .orNull
    val defaultInstructions = (body \ "defaultAnswerInstructions").asOpt[String].orNull
    val defaultCriteria     = (body \ "defaultEvaluationCriteria").asOpt[String].orNull
    val defaultNegativeScoreAllowed =
      (body \ "defaultNegativeScoreAllowed").asOpt[Boolean].getOrElse(false)
    val defaultOptionShufflingOn =
      (body \ "defaultOptionShufflingOn").asOpt[Boolean].getOrElse(true)
    val questionType = (body \ "type")
      .asOpt[String]
      .flatMap(s => Try(QuestionType.valueOf(s)).toOption)
      .orNull

    val question = existing.getOrElse(new Question())
    question.`type` = questionType
    question.question = sanitizedQuestionText
    question.defaultMaxScore = defaultMaxScore
    question.defaultExpectedWordCount = defaultWordCount
    question.defaultEvaluationType = defaultEvaluationType
    question.defaultAnswerInstructions = defaultInstructions
    question.defaultEvaluationCriteria = defaultCriteria
    question.defaultNegativeScoreAllowed = defaultNegativeScoreAllowed
    question.defaultOptionShufflingOn = defaultOptionShufflingOn
    if !Option(question.state).contains(QuestionState.DELETED.toString) then
      question.state = QuestionState.SAVED.toString
    if question.id == 0 then question.setCreatorWithDate(user)
    question.setModifierWithDate(user)

    question.questionOwners.clear()
    (body \ "questionOwners").asOpt[JsArray] match
      case Some(ownerArray) =>
        ownerArray.value.foreach { ownerNode =>
          (ownerNode \ "id").asOpt[Long].flatMap(id => Option(DB.find(classOf[User], id))) match
            case Some(owner) => question.questionOwners.add(owner)
            case None        => // Skip invalid owner
        }
      case None => // No owners specified
    processTags(question, user, body)
    question

  def processTags(question: Question, user: User, body: JsValue): Unit =
    question.tags.clear()
    (body \ "tags").asOpt[JsArray] match
      case Some(tagArray) =>
        tagArray.value.foreach { tagNode =>
          val tag = (tagNode \ "id").asOpt[Long] match
            case Some(tagId) =>
              DB.find(classOf[Tag]).where().idEq(tagId).find
            case None =>
              val tagName = (tagNode \ "name").asOpt[String].getOrElse("")
              DB
                .find(classOf[Tag])
                .where()
                .eq("name", tagName)
                .eq("creator", user)
                .list
                .headOption match
                case t @ Some(_) => t
                case None =>
                  val newTag = new Tag()
                  newTag.name = tagName.toLowerCase
                  newTag.setCreatorWithDate(user)
                  newTag.modifier = user
                  newTag.save()
                  Some(newTag)
          tag.foreach(t => question.tags.add(t))
        }
      case None => // No tags specified
  private def processOptions(question: Question, user: User, node: JsArray): Unit =
    val persistedIds = question.options.asScala.map(_.id).toSet
    val providedIds = node.value
      .flatMap(n => (n \ "id").asOpt[Long])
      .toSet
    // Updates
    node.value
      .filter { o =>
        (o \ "id").asOpt[Long].exists(id => persistedIds.contains(id))
      }
      .foreach { o =>
        updateOption(o, OptionUpdateOptions.HANDLE_DEFAULTS)
      }
    // Removals
    question.options.asScala
      .filter(o => !providedIds.contains(o.id))
      .foreach(deleteOption)
    // Additions
    node.value
      .filter(o => (o \ "id").asOpt[Long].isEmpty)
      .foreach(o => createOption(question, o, user))

  private def createOption(question: Question, node: JsValue, user: User): Unit =
    val option = new MultipleChoiceOption()
    option.option = parseHtml("option", node).orNull
    val scoreFieldName =
      if (node \ "defaultScore").asOpt[Double].isDefined then "defaultScore" else "score"
    option.defaultScore =
      (node \ scoreFieldName).asOpt[Double].map(round).getOrElse(0.0)

    val correctOption = (node \ "correctOption").asOpt[Boolean].getOrElse(false)
    option.correctOption = correctOption
    option.claimChoiceType =
      (node \ "claimChoiceType")
        .asOpt[String]
        .flatMap(s => Try(ClaimChoiceOptionType.valueOf(s)).toOption)
        .orNull

    saveOption(option, question, user)
    propagateOptionCreationToExamQuestions(question, None, option)

  private def parseHtml(fieldName: String, node: JsValue): Option[String] =
    SanitizingHelper.parseHtml(fieldName, node)

  def createQuestion(
      body: JsValue,
      user: User,
      questionText: Option[String]
  ): Either[QuestionError, Question] =
    val question = parseFromBody(body, user, None, questionText)
    question.questionOwners.add(user)
    validate(question, body) match
      case Some(message) => Left(QuestionError.ValidationErrorWithMessage(message))
      case None =>
        if question.`type` != QuestionType.EssayQuestion then
          processOptions(question, user, (body \ "options").asOpt[JsArray].getOrElse(Json.arr()))
        question.save()
        Right(question)

  def updateQuestion(
      id: Long,
      body: JsValue,
      user: User,
      questionText: Option[String]
  ): Either[QuestionError, Question] =
    val baseQuery = DB.find(classOf[Question]).where().idEq(id)
    val query =
      if user.hasRole(Role.Name.TEACHER) then
        baseQuery
          .or()
          .eq("shared", true)
          .eq("questionOwners", user)
          .eq("examSectionQuestions.examSection.exam.examOwners", user)
          .endOr()
      else baseQuery
    query.find match
      case None => Left(AccessForbidden)
      case Some(question) =>
        val updatedQuestion = parseFromBody(body, user, Some(question), questionText)
        validate(updatedQuestion, body) match
          case Some(message) => Left(QuestionError.ValidationErrorWithMessage(message))
          case None =>
            if updatedQuestion.`type` != QuestionType.EssayQuestion then
              processOptions(
                updatedQuestion,
                user,
                (body \ "options").asOpt[JsArray].getOrElse(Json.arr())
              )
            updatedQuestion.update()
            Right(updatedQuestion)

  def deleteQuestion(id: Long, user: User): Either[QuestionError, Unit] =
    val baseExpr = DB.find(classOf[Question]).where().idEq(id)
    val expr =
      if user.hasRole(Role.Name.TEACHER) then
        baseExpr.disjunction().eq("shared", true).eq("questionOwners", user).endJunction()
      else baseExpr
    expr.find match
      case None           => Left(QuestionNotFound)
      case Some(question) =>
        // Not allowed to remove if used in active exams
        if question.examSectionQuestions.asScala.exists { esq =>
            val exam = esq.examSection.exam
            exam.state == ExamState.PUBLISHED && exam.periodEnd.isAfterNow
          }
        then Left(QuestionInUse)
        else
          question.children.asScala.foreach { c =>
            c.parent = null
            c.update()
          }
          question.examSectionQuestions.asScala.foreach(_.delete())
          Try {
            question.delete()
          } match
            case Failure(_: PersistenceException) =>
              logger.info(
                "Shared question attachment reference found, can not delete the reference yet"
              )
              question.attachment = null
              question.delete()
            case _ => // Success
          Right(())

  def addOwner(uid: Long, body: JsValue, modifier: User): Either[QuestionError, User] =
    DB.find(classOf[User])
      .where()
      .idEq(uid)
      .find match
      case None => Left(UserNotFound)
      case Some(newOwner) =>
        val questionIds = (body \ "questionIds").asOpt[String]
        questionIds match
          case None | Some("") => Left(InvalidRequest)
          case Some(idsStr) =>
            val ids      = idsStr.split(",").map(_.toLong).toSeq
            val baseExpr = DB.find(classOf[Question]).where().idIn(ids.asJava)
            val expr =
              if modifier.hasRole(Role.Name.TEACHER) then
                baseExpr.disjunction().eq("shared", true).eq(
                  "questionOwners",
                  modifier
                ).endJunction()
              else baseExpr
            val questions = expr.list
            if questions.isEmpty then Left(QuestionNotFound)
            else
              questions.foreach(q => addOwnerToQuestion(q, newOwner, modifier))
              Right(newOwner)

  private def addOwnerToQuestion(question: Question, user: User, modifier: User): Unit =
    question.setModifierWithDate(modifier)
    question.questionOwners.add(user)
    question.update()

  def exportQuestions(body: JsValue): String =
    xmlExporter.convert(questionsForExport(body))

  /** Streams Moodle XML for the questions identified in body to the given output stream. Caller
    * must close the stream.
    */
  def streamExportQuestions(body: JsValue)(os: java.io.OutputStream): Unit =
    xmlExporter.writeToStream(questionsForExport(body))(os)

  private def questionsForExport(body: JsValue): Seq[Question] =
    val ids = (body \ "params" \ "ids")
      .asOpt[JsArray]
      .getOrElse(Json.arr())
      .value
      .map(_.as[Long])
      .toSet
    DB
      .find(classOf[Question])
      .where()
      .idIn(ids.asJava)
      .list
      .filter(q =>
        q.`type` != QuestionType.ClaimChoiceQuestion && q.`type` != QuestionType.ClozeTestQuestion
      )
      .toSeq

  def importQuestions(fileContent: String, user: User): (Seq[Question], Seq[String]) =
    val (successes, errors) = xmlImporter.convert(fileContent, user)
    (successes, errors.flatMap(_.error))

  private def processPreview(esq: ExamSectionQuestion): JsValue =
    if esq.question.`type` == QuestionType.ClozeTestQuestion then
      val answer = new ClozeTestAnswer()
      answer.setQuestion(esq)
      esq.clozeTestAnswer = answer
    esq.setDerivedMaxScore()
    if esq.question.`type` == QuestionType.ClaimChoiceQuestion then esq.setDerivedMinScore()
    if esq.question.`type` == QuestionType.ClozeTestQuestion then
      esq.question.question = null
    esq.asJson

  def getQuestionPreview(qid: Long, user: User): Either[QuestionError, JsValue] =
    val baseQuery =
      DB.find(classOf[Question]).fetch("attachment", "fileName").fetch("options").where().idEq(qid)
    val el =
      if user.hasRole(Role.Name.TEACHER) then baseQuery.eq("questionOwners", user) else baseQuery
    el.find match
      case None           => Left(QuestionNotFound)
      case Some(question) =>
        // Produce fake exam section question based on base question
        val esqos = question.options.asScala.map { o =>
          val esqo = new ExamSectionQuestionOption()
          esqo.id = 1L
          esqo.option = o
          esqo.score = o.defaultScore
          esqo
        }.toSeq
        val esq = new ExamSectionQuestion()
        esq.options = esqos.asJava
        esq.question = question
        esq.answerInstructions = question.defaultAnswerInstructions
        esq.evaluationCriteria = question.defaultEvaluationCriteria
        esq.expectedWordCount = question.defaultExpectedWordCount
        esq.evaluationType = question.defaultEvaluationType
        Right(processPreview(esq))

  def getExamSectionQuestionPreview(esqId: Long, user: User): Either[QuestionError, JsValue] =
    val baseQuery = DB
      .find(classOf[ExamSectionQuestion])
      .fetch("question", "id, type, question")
      .fetch("question.attachment", "fileName")
      .fetch("options")
      .fetch("options.option", "id, option")
      .where()
      .idEq(esqId)
    val el =
      if user.hasRole(Role.Name.TEACHER) then
        baseQuery.or().in("question.questionOwners", user).in(
          "examSection.exam.examOwners",
          user
        ).endOr()
      else baseQuery
    el.find match
      case None      => Left(QuestionNotFound)
      case Some(esq) => Right(processPreview(esq))
