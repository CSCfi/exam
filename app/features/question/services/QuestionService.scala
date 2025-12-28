// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.question.services

import com.fasterxml.jackson.databind.JsonNode
import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.question.services.QuestionError.*
import io.ebean.text.PathProperties
import io.ebean.{DB, ExpressionList}
import jakarta.persistence.PersistenceException
import models.exam.Exam
import models.questions.*
import models.sections.{ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.{Role, User}
import play.api.Logging
import play.api.libs.json.{JsArray, JsValue, Json}
import services.exam.{OptionUpdateOptions, SectionQuestionHandler}
import services.xml.{MoodleXmlExporter, MoodleXmlImporter}
import validation.core.SanitizingHelper

import javax.inject.Inject
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
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
          |modifier(*),
          |questionOwners(*),
          |attachment(*),
          |options(*),
          |tags(*, creator(*)),
          |examSectionQuestions(
          |  examSection(
          |    exam(*, course(*))
          |  )
          |)
          |)""".stripMargin
      )
      val query = DB.find(classOf[Question])
      pp.apply(query)
      val baseQuery =
        query.where().isNull("parent").endJunction().ne("state", QuestionState.DELETED.toString)
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
          baseQuestions.filter(_.getQuestionOwners.contains(user))
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
        |questionOwners(*),
        |attachment(*),
        |options(*),
        |tags(*, creator(*)),
        |examSectionQuestions(*,
        |  examSection(*,
        |    exam(*)
        |  )
        |)
        |)""".stripMargin
    )
    pp.apply(query)
    val expr = query.where().idEq(id)
    getQuestionOfUser(expr, user) match
      case Some(q) =>
        val sortedOptions = q.getOptions.asScala.toSeq.sorted
        q.getOptions.clear()
        q.getOptions.addAll(sortedOptions.asJava)
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
        val sortedOptions = question.getOptions.asScala.toSeq.sorted
        question.getOptions.clear()
        question.getOptions.addAll(sortedOptions.asJava)
        val copy = question.copy()
        copy.setParent(null)
        copy.setQuestion(s"<p>**COPY**</p>${question.getQuestion}")
        copy.setCreatorWithDate(user)
        copy.setModifierWithDate(user)
        copy.save()
        copy.getTags.addAll(question.getTags)
        copy.getQuestionOwners.clear()
        copy.getQuestionOwners.add(user)
        copy.update()
        DB.saveAll(copy.getOptions)
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
      (body \ "defaultMaxScore").asOpt[Double].map(_.asInstanceOf[java.lang.Double]).map(
        round
      ).orNull
    val defaultWordCount =
      (body \ "defaultExpectedWordCount").asOpt[Int].map(_.asInstanceOf[java.lang.Integer]).orNull
    val defaultEvaluationType = (body \ "defaultEvaluationType")
      .asOpt[String]
      .flatMap(s => Try(Question.EvaluationType.valueOf(s)).toOption)
      .orNull
    val defaultInstructions = (body \ "defaultAnswerInstructions").asOpt[String].orNull
    val defaultCriteria     = (body \ "defaultEvaluationCriteria").asOpt[String].orNull
    val defaultNegativeScoreAllowed =
      (body \ "defaultNegativeScoreAllowed").asOpt[Boolean].getOrElse(false)
    val defaultOptionShufflingOn =
      (body \ "defaultOptionShufflingOn").asOpt[Boolean].getOrElse(true)
    val questionType = (body \ "type")
      .asOpt[String]
      .flatMap(s => Try(Question.Type.valueOf(s)).toOption)
      .orNull

    val question = existing.getOrElse(new Question())
    question.setType(questionType)
    question.setQuestion(sanitizedQuestionText)
    question.setDefaultMaxScore(defaultMaxScore)
    question.setDefaultExpectedWordCount(defaultWordCount)
    question.setDefaultEvaluationType(defaultEvaluationType)
    question.setDefaultAnswerInstructions(defaultInstructions)
    question.setDefaultEvaluationCriteria(defaultCriteria)
    question.setDefaultNegativeScoreAllowed(defaultNegativeScoreAllowed)
    question.setDefaultOptionShufflingOn(defaultOptionShufflingOn)
    if !Option(question.getState).contains(QuestionState.DELETED.toString) then
      question.setState(QuestionState.SAVED.toString)
    if Option(question.getId).isEmpty then question.setCreatorWithDate(user)
    question.setModifierWithDate(user)

    question.getQuestionOwners.clear()
    (body \ "questionOwners").asOpt[JsArray] match
      case Some(ownerArray) =>
        ownerArray.value.foreach { ownerNode =>
          (ownerNode \ "id").asOpt[Long].flatMap(id => Option(DB.find(classOf[User], id))) match
            case Some(owner) => question.getQuestionOwners.add(owner)
            case None        => // Skip invalid owner
        }
      case None => // No owners specified
    question.getTags.clear()
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
                  newTag.setName((tagNode \ "name").asOpt[String].getOrElse("").toLowerCase)
                  newTag.setCreatorWithDate(user)
                  newTag.setModifier(user)
                  Some(newTag)
          tag.foreach(t => question.getTags.add(t))
        }
      case None => // No tags specified
    question

  private def processOptions(question: Question, user: User, node: JsArray): Unit =
    val persistedIds = question.getOptions.asScala.map(_.getId).toSet
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
    question.getOptions.asScala
      .filter(o => !providedIds.contains(o.getId))
      .foreach(deleteOption)
    // Additions
    node.value
      .filter(o => (o \ "id").asOpt[Long].isEmpty)
      .foreach(o => createOption(question, o, user))

  private def createOption(question: Question, node: JsValue, user: User): Unit =
    val option = new MultipleChoiceOption()
    option.setOption(parseHtml("option", node).orNull)
    val scoreFieldName =
      if (node \ "defaultScore").asOpt[Double].isDefined then "defaultScore" else "score"
    option.setDefaultScore(
      (node \ scoreFieldName).asOpt[Double].map(_.asInstanceOf[java.lang.Double]).map(round).orNull
    )
    val correctOption = (node \ "correctOption").asOpt[Boolean].getOrElse(false)
    option.setCorrectOption(correctOption)
    option.setClaimChoiceType(
      (node \ "claimChoiceType")
        .asOpt[String]
        .flatMap(s => Try(MultipleChoiceOption.ClaimChoiceOptionType.valueOf(s)).toOption)
        .orNull
    )
    saveOption(option, question, user)
    propagateOptionCreationToExamQuestions(question, null, option)

  private def parseHtml(fieldName: String, node: JsValue): Option[String] =
    SanitizingHelper.parseHtml(fieldName, node)

  def createQuestion(
      body: JsValue,
      user: User,
      questionText: Option[String]
  ): Either[QuestionError, Question] =
    val question = parseFromBody(body, user, None, questionText)
    question.getQuestionOwners.add(user)
    question.getValidationResult(toJacksonJson(body)).toScala match
      case Some(errorResult) =>
        // The validation Result is a BadRequest with the validation message as the body
        // We'll extract it in the controller, for now just return a generic validation error
        Left(QuestionError.ValidationError)
      case None =>
        if question.getType != Question.Type.EssayQuestion then
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
        question.getValidationResult(toJacksonJson(body)).toScala match
          case Some(errorResult) =>
            // The validation Result is a BadRequest with the validation message as the body
            // We'll extract it in the controller, for now just return a generic validation error
            Left(QuestionError.ValidationError)
          case None =>
            if updatedQuestion.getType != Question.Type.EssayQuestion then
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
        if question.getExamSectionQuestions.asScala.exists { esq =>
            val exam = esq.getExamSection.getExam
            exam.getState == Exam.State.PUBLISHED && exam.getPeriodEnd.isAfterNow
          }
        then Left(QuestionInUse)
        else
          question.getChildren.asScala.foreach { c =>
            c.setParent(null)
            c.update()
          }
          question.getExamSectionQuestions.asScala.foreach(_.delete())
          Try {
            question.delete()
          } match
            case Failure(_: PersistenceException) =>
              logger.info(
                "Shared question attachment reference found, can not delete the reference yet"
              )
              question.setAttachment(null)
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
    question.getQuestionOwners.add(user)
    question.update()

  def exportQuestions(body: JsValue): String =
    val ids = (body \ "params" \ "ids")
      .asOpt[JsArray]
      .getOrElse(Json.arr())
      .value
      .map(_.as[Long])
      .toSet
    val questions = DB
      .find(classOf[Question])
      .where()
      .idIn(ids.asJava)
      .list
      .filter(q =>
        q.getType != Question.Type.ClaimChoiceQuestion && q.getType != Question.Type.ClozeTestQuestion
      )
    xmlExporter.convert(questions)

  def importQuestions(fileContent: String, user: User): (Seq[Question], Seq[String]) =
    val (successes, errors) = xmlImporter.convert(fileContent, user)
    (successes, errors.flatMap(_.error))

  private def processPreview(esq: ExamSectionQuestion): JsValue =
    if esq.getQuestion.getType == Question.Type.ClozeTestQuestion then
      val answer = new ClozeTestAnswer()
      answer.setQuestion(esq)
      esq.setClozeTestAnswer(answer)
    esq.setDerivedMaxScore()
    if esq.getQuestion.getType == Question.Type.ClaimChoiceQuestion then esq.setDerivedMinScore()
    if esq.getQuestion.getType == Question.Type.ClozeTestQuestion then
      esq.getQuestion.setQuestion(null)
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
        val esqos = question.getOptions.asScala.map { o =>
          val esqo = new ExamSectionQuestionOption()
          esqo.setId(1L)
          esqo.setOption(o)
          esqo.setScore(o.getDefaultScore)
          esqo
        }.toSeq
        val esq = new ExamSectionQuestion()
        esq.setOptions(esqos.asJava)
        esq.setQuestion(question)
        esq.setAnswerInstructions(question.getDefaultAnswerInstructions)
        esq.setEvaluationCriteria(question.getDefaultEvaluationCriteria)
        esq.setExpectedWordCount(question.getDefaultExpectedWordCount)
        esq.setEvaluationType(question.getDefaultEvaluationType)
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
