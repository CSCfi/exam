// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.services

import database.EbeanQueryExtensions
import features.exam.services.ExamSectionError.*
import features.question.services.QuestionService
import io.ebean.DB
import io.ebean.text.PathProperties
import models.exam.Exam
import models.questions.ClaimChoiceOptionType
import models.questions.QuestionType
import models.questions.{MultipleChoiceOption, Question}
import models.sections.{ExamSection, ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.{Role, User}
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json.{JsArray, JsValue, Json}
import security.BlockingIOExecutionContext
import services.exam.{ExamUpdater, OptionUpdateOptions, SectionQuestionHandler}
import validation.core.PlayJsonHelper
import validation.section.SectionQuestionDTO

import javax.inject.Inject
import scala.jdk.CollectionConverters.*

class ExamSectionService @Inject() (
    private val examUpdater: ExamUpdater,
    private val questionService: QuestionService,
    implicit private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with SectionQuestionHandler
    with Logging:

  def insertSection(examId: Long, user: User): Either[ExamSectionError, ExamSection] =
    DB.find(classOf[Exam])
      .fetch("examOwners")
      .fetch("examSections")
      .where()
      .idEq(examId)
      .find match
      case None       => Left(ExamNotFound)
      case Some(exam) =>
        // Not allowed to add a section if optional sections exist and there are upcoming reservations
        val optionalSectionsExist = exam.examSections.asScala.exists(_.optional)
        if optionalSectionsExist && !examUpdater.isAllowedToUpdate(exam, user) then
          Left(FutureReservationsExist)
        else if exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)
        then
          val section = new ExamSection()
          section.lotteryItemCount = 1
          section.exam = exam
          section.sectionQuestions = java.util.Collections.emptySet()
          section.sequenceNumber = exam.examSections.size()
          section.expanded = true
          section.optional = false
          section.setCreatorWithDate(user)
          section.save()
          Right(section)
        else Left(AccessForbidden)

  def removeSection(examId: Long, sectionId: Long, user: User): Either[ExamSectionError, Unit] =
    findExamAndSection(examId, sectionId, user) match
      case Left(error)            => Left(error)
      case Right((exam, section)) =>
        // Not allowed to remove a section if optional sections exist and there are upcoming reservations
        val optionalSectionsExist = exam.examSections.asScala.exists(_.optional)
        if optionalSectionsExist && !examUpdater.isAllowedToUpdate(exam, user) then
          Left(FutureReservationsExist)
        else
          exam.examSections.remove(section)
          // Decrease sequences for the entries above the inserted one
          val seq = section.sequenceNumber
          exam.examSections.asScala.foreach { es =>
            val num = es.sequenceNumber
            if num >= seq then
              es.sequenceNumber = num - 1
              es.update()
          }
          section.delete()
          Right(())

  def updateSection(
      examId: Long,
      sectionId: Long,
      user: User,
      name: Option[String],
      expanded: Boolean,
      lotteryOn: Boolean,
      lotteryItemCount: Int,
      description: Option[String],
      optional: Boolean
  ): Either[ExamSectionError, ExamSection] =
    findExamAndSection(examId, sectionId, user) match
      case Left(error) => Left(error)
      case Right((exam, section)) =>
        name.foreach(v => section.name = v)
        section.expanded = expanded
        section.lotteryOn = lotteryOn
        section.lotteryItemCount = Math.max(1, lotteryItemCount)
        description.foreach(v => section.description = v)
        // Disallow changing optionality if future reservations exist
        if section.optional != optional && !examUpdater.isAllowedToUpdate(exam, user) then
          Left(FutureReservationsExist)
        else
          section.optional = optional
          section.update()
          Right(section)

  def reorderSections(
      examId: Long,
      from: Int,
      to: Int,
      user: User
  ): Either[ExamSectionError, Unit] =
    DB.find(classOf[Exam]).fetch("examSections").where().idEq(examId).find match
      case None => Left(ExamNotFound)
      case Some(exam) =>
        if exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
          // Reorder by sequenceNumber (TreeSet orders the collection based on it)
          val sections = exam.examSections.asScala.toSeq.sorted
          if from < sections.length then
            val prev    = sections(from)
            val updated = sections.patch(from, Nil, 1).patch(to, Seq(prev), 0)
            updated.zipWithIndex.foreach { (section, i) =>
              section.sequenceNumber = i
              section.update()
            }
          Right(())
        else Left(AccessForbidden)

  def reorderSectionQuestions(
      examId: Long,
      sectionId: Long,
      from: Int,
      to: Int,
      user: User
  ): Either[ExamSectionError, Unit] =
    Option(DB.find(classOf[Exam], examId)) match
      case None => Left(ExamNotFound)
      case Some(exam) =>
        if exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
          Option(DB.find(classOf[ExamSection], sectionId)) match
            case None          => Left(SectionNotFound)
            case Some(section) =>
              // Reorder by sequenceNumber (TreeSet orders the collection based on it)
              val questions = section.sectionQuestions.asScala.toSeq.sorted
              if from < questions.length then
                val prev    = questions(from)
                val updated = questions.patch(from, Nil, 1).patch(to, Seq(prev), 0)
                updated.zipWithIndex.foreach { (question, i) =>
                  question.sequenceNumber = i
                  question.update()
                }
              Right(())
        else Left(AccessForbidden)

  def insertQuestion(
      examId: Long,
      sectionId: Long,
      questionId: Long,
      sequenceNumber: Int,
      user: User
  ): Either[ExamSectionError, ExamSection] =
    (
      Option(DB.find(classOf[Exam], examId)),
      Option(DB.find(classOf[ExamSection], sectionId)),
      Option(DB.find(classOf[Question], questionId))
    ) match
      case (None, _, _) | (_, None, _) | (_, _, None) => Left(ExamNotFound)
      case (Some(exam), Some(section), Some(question)) =>
        if Option(
            exam.autoEvaluationConfig
          ).isDefined && question.`type` == QuestionType.EssayQuestion
        then
          Left(AutoEvaluationEssayQuestion)
        else if !exam.isOwnedOrCreatedBy(user) && !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)
        then
          Left(AccessForbidden)
        else
          insertQuestionInternal(exam, section, question, user, sequenceNumber) match
            case Left(error) => Left(error)
            case Right(_)    => Right(section)

  def insertMultipleQuestions(
      examId: Long,
      sectionId: Long,
      sequenceNumber: Int,
      questionIds: List[Long],
      user: User
  ): Either[ExamSectionError, ExamSection] =
    (Option(DB.find(classOf[Exam], examId)), Option(DB.find(classOf[ExamSection], sectionId))) match
      case (None, _) | (_, None) => Left(ExamNotFound)
      case (Some(exam), Some(section)) =>
        if !exam.isOwnedOrCreatedBy(user) && !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
          Left(AccessForbidden)
        else
          questionIds.foldLeft[Either[ExamSectionError, Unit]](Right(())) { (acc, qid) =>
            acc.flatMap { _ =>
              Option(DB.find(classOf[Question], qid)) match
                case None => Left(QuestionNotFound)
                case Some(question) =>
                  if Option(
                      exam.autoEvaluationConfig
                    ).isDefined && question.`type` == QuestionType.EssayQuestion
                  then Left(AutoEvaluationEssayQuestion)
                  else insertQuestionInternal(exam, section, question, user, sequenceNumber)
            }
          } match
            case Left(error) => Left(error)
            case Right(_)    => Right(section)

  def removeQuestion(
      examId: Long,
      sectionId: Long,
      questionId: Long,
      user: User
  ): Either[ExamSectionError, ExamSection] =
    DB.find(classOf[ExamSectionQuestion])
      .fetch("examSection.exam.examOwners")
      .fetch("question")
      .where()
      .eq("examSection.exam.id", examId)
      .eq("examSection.id", sectionId)
      .eq("question.id", questionId)
      .find match
      case None => Left(SectionQuestionNotFound)
      case Some(sectionQuestion) =>
        val section = sectionQuestion.examSection
        val exam    = section.exam
        if !exam.isOwnedOrCreatedBy(user) && !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
          Left(AccessForbidden)
        else
          section.sectionQuestions.remove(sectionQuestion)

          // Decrease sequences for the entries above the inserted one
          val seq = sectionQuestion.sequenceNumber
          section.sectionQuestions.asScala.foreach { esq =>
            val num = esq.sequenceNumber
            if num >= seq then
              esq.sequenceNumber = num - 1
              esq.update()
          }
          // Update the lottery item count if needed
          if section.lotteryOn && section.lotteryItemCount > section.sectionQuestions.size()
          then
            section.lotteryItemCount = section.sectionQuestions.size()
          sectionQuestion.delete()
          Right(section)

  def clearQuestions(
      examId: Long,
      sectionId: Long,
      user: User
  ): Either[ExamSectionError, ExamSection] =
    DB.find(classOf[ExamSection])
      .fetch("exam.creator")
      .fetch("exam.examOwners")
      .fetch("exam.parent.examOwners")
      .where()
      .idEq(sectionId)
      .eq("exam.id", examId)
      .find match
      case None => Left(SectionNotFound)
      case Some(section) =>
        if section.exam.isOwnedOrCreatedBy(user) || user.hasRole(
            Role.Name.ADMIN,
            Role.Name.SUPPORT
          )
        then
          section.sectionQuestions.asScala.foreach { sq =>
            sq.question.children.asScala.foreach { c =>
              c.parent = null
              c.update()
            }
            sq.delete()
          }
          section.sectionQuestions.clear()
          section.lotteryOn = false
          section.update()
          Right(section)
        else Left(AccessForbidden)

  def updateDistributedExamQuestion(
      examId: Long,
      sectionId: Long,
      questionId: Long,
      user: User,
      body: JsValue
  ): Either[ExamSectionError, ExamSectionQuestion] =
    // Parse and validate section question DTO manually
    val answerInstructions = PlayJsonHelper.parseHtml("answerInstructions", body)
    val evaluationCriteria = PlayJsonHelper.parseHtml("evaluationCriteria", body)
    val questionText = (body \ "question").asOpt[JsValue].flatMap { questionNode =>
      PlayJsonHelper.parseHtml("question", questionNode)
    }
    val dto = SectionQuestionDTO(answerInstructions, evaluationCriteria, questionText)

    val pp        = PathProperties.parse("(*, question(*, options(*)), options(*, option(*)))")
    val baseQuery = DB.find(classOf[ExamSectionQuestion]).apply(pp).where().idEq(questionId)
    val query =
      if user.hasRole(Role.Name.TEACHER) then baseQuery.eq("examSection.exam.examOwners", user)
      else baseQuery
    query.find match
      case None => Left(AccessForbidden)
      case Some(examSectionQuestion) =>
        DB.find(classOf[Question])
          .fetch("examSectionQuestions")
          .fetch("examSectionQuestions.options")
          .where()
          .idEq(examSectionQuestion.question.id)
          .find match
          case None => Left(QuestionNotFound)
          case Some(question) =>
            (body \ "options").asOpt[JsArray] match
              case None => Left(MissingOptionsArray)
              case Some(optionsArray) =>
                if question.`type` == QuestionType.WeightedMultipleChoiceQuestion && !hasPositiveOptionScore(
                    optionsArray
                  )
                then Left(CorrectOptionRequired)
                else if question.`type` == QuestionType.ClaimChoiceQuestion && !hasValidClaimChoiceOptions(
                    optionsArray
                  )
                then Left(IncorrectClaimQuestionOptions)
                else
                  // Update question: text and tags
                  question.question = dto.getQuestionTextOrNull
                  (body \ "question").asOpt[JsValue].foreach(questionNode =>
                    questionService.processTags(question, user, questionNode)
                  )
                  question.update()
                  updateExamQuestionFromJson(examSectionQuestion, body, dto)
                  examSectionQuestion.update()
                  if question.`type` != QuestionType.EssayQuestion && question.`type` != QuestionType.ClozeTestQuestion
                  then
                    // Process the options, this has an impact on the base question options as well as all the section questions
                    // using those.
                    processExamQuestionOptions(question, examSectionQuestion, optionsArray, user)
                    // Re-fetch to get the up-to-date option state (e.g. correctOption) that was written
                    // to the DB by processExamQuestionOptions but not reflected in the in-memory bean.
                    DB.find(classOf[ExamSectionQuestion])
                      .apply(pp)
                      .where()
                      .idEq(examSectionQuestion.id)
                      .find
                      .fold(Left(AccessForbidden): Either[ExamSectionError, ExamSectionQuestion])(
                        Right(_)
                      )
                  else Right(examSectionQuestion)

  def updateUndistributedExamQuestion(
      examId: Long,
      sectionId: Long,
      questionId: Long,
      user: User
  ): Either[ExamSectionError, ExamSectionQuestion] =
    val pp =
      PathProperties.parse("(*, question(*, attachment(*), options(*)), options(*, option(*)))")
    val baseQuery = DB.find(classOf[ExamSectionQuestion]).apply(pp).where().idEq(questionId)
    val query =
      if user.hasRole(Role.Name.TEACHER) then baseQuery.eq("examSection.exam.examOwners", user)
      else baseQuery
    query.find match
      case None => Left(AccessForbidden)
      case Some(examSectionQuestion) =>
        Option(DB.find(classOf[Question], examSectionQuestion.question.id)) match
          case None => Left(QuestionNotFound)
          case Some(question) =>
            updateExamQuestion(examSectionQuestion, question)
            examSectionQuestion.update()
            Right(examSectionQuestion)

  def getQuestionDistribution(questionId: Long): Either[ExamSectionError, Boolean] =
    Option(DB.find(classOf[ExamSectionQuestion], questionId)) match
      case None => Left(SectionQuestionNotFound)
      case Some(esq) =>
        val question = esq.question
        // ATM it is enough that a question is bound to multiple exams
        val isDistributed = question.examSectionQuestions.asScala
          .map(_.examSection.exam)
          .toSeq
          .distinct
          .size > 1
        Right(isDistributed)

  def listSections(
      user: User,
      filter: Option[String],
      courseIds: Option[List[Long]],
      examIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): List[ExamSection] =
    val baseQuery = DB.find(classOf[ExamSection]).where()
    val withCreatorFilter =
      if !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
        baseQuery.where().eq("creator.id", user.id)
      else baseQuery
    val withFilter = filter.fold(withCreatorFilter) { f =>
      val condition = s"%$f%"
      withCreatorFilter.ilike("name", condition)
    }
    val withExamFilter = examIds.filter(_.nonEmpty).fold(withFilter) { ids =>
      withFilter.in("exam.id", ids.asJava)
    }
    val withCourseFilter = courseIds.filter(_.nonEmpty).fold(withExamFilter) { ids =>
      withExamFilter.in("exam.course.id", ids.asJava)
    }
    val withTagFilter = tagIds.filter(_.nonEmpty).fold(withCourseFilter) { ids =>
      withCourseFilter.in("examSectionQuestions.question.tags.id", ids.asJava)
    }
    val query = ownerIds.filter(_.nonEmpty).fold(withTagFilter) { ids =>
      withTagFilter.in("questionOwners.id", ids.asJava)
    }
    query.distinct.toList

  // Private helper methods

  private def findExamAndSection(
      examId: Long,
      sectionId: Long,
      user: User
  ): Either[ExamSectionError, (Exam, ExamSection)] =
    val examOpt =
      DB.find(classOf[Exam])
        .fetch("examOwners")
        .fetch("examSections")
        .where()
        .idEq(examId)
        .find
    val sectionOpt = Option(DB.find(classOf[ExamSection], sectionId))

    (examOpt, sectionOpt) match
      case (None, _) | (_, None) => Left(ExamNotFound)
      case (Some(exam), Some(section)) =>
        if !exam.isOwnedOrCreatedBy(user) && !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
          Left(AccessForbidden)
        else Right((exam, section))

  private def insertQuestionInternal(
      exam: Exam,
      section: ExamSection,
      question: Question,
      user: User,
      seq: Int
  ): Either[ExamSectionError, Unit] =
    val sectionQuestion = new ExamSectionQuestion()
    sectionQuestion.examSection = section
    sectionQuestion.question = question
    // Assert that the sequence number provided is within limits
    val sequence = Math.min(Math.max(0, seq), section.sectionQuestions.size())
    updateSequences(section.sectionQuestions.asScala.toList, sequence)
    sectionQuestion.sequenceNumber = sequence
    if section.sectionQuestions.contains(sectionQuestion) || section.hasQuestion(question) then
      Left(QuestionAlreadyInSection)
    else
      if question.`type` == QuestionType.EssayQuestion then
        // disable auto evaluation for this exam
        Option(exam.autoEvaluationConfig).foreach(_.delete())
      DB.updateAll(section.sectionQuestions)

      // Insert a new section question
      sectionQuestion.creator = user
      sectionQuestion.created = DateTime.now()
      sectionQuestion.examSection = section

      updateExamQuestion(sectionQuestion, question)

      section.sectionQuestions.add(sectionQuestion)

      section.setModifierWithDate(user)
      section.save()
      section.sectionQuestions = new java.util.TreeSet(section.sectionQuestions)
      Right(())

  private def updateExamQuestionFromJson(
      sectionQuestion: ExamSectionQuestion,
      body: JsValue,
      dto: SectionQuestionDTO
  ): Unit =
    sectionQuestion.maxScore =
      PlayJsonHelper.parse[Double]("maxScore", body).map(d => round(d)).orNull

    sectionQuestion.answerInstructions = dto.getAnswerInstructionsOrNull
    sectionQuestion.evaluationCriteria = dto.getEvaluationCriteriaOrNull
    sectionQuestion.evaluationType =
      PlayJsonHelper.parseEnum("evaluationType", body, classOf[Question.EvaluationType]).orNull

    sectionQuestion.expectedWordCount =
      PlayJsonHelper.parse[Int]("expectedWordCount", body).map(
        _.asInstanceOf[java.lang.Integer]
      ).orNull

    sectionQuestion.negativeScoreAllowed =
      PlayJsonHelper.parseOrElse("negativeScoreAllowed", body, false)

    sectionQuestion.optionShufflingOn =
      PlayJsonHelper.parseOrElse("optionShufflingOn", body, true)

  private def createOptionBasedOnExamQuestion(
      question: Question,
      esq: ExamSectionQuestion,
      user: User,
      node: JsValue
  ): Unit =
    val option         = new MultipleChoiceOption()
    val baseOptionNode = (node \ "option").asOpt[JsValue]
    baseOptionNode.foreach { optNode =>
      option.option = PlayJsonHelper.parse[String]("option", optNode).orNull
    }
    option.defaultScore =
      PlayJsonHelper.parse[Double]("score", node).map(d => round(d)).orNull

    val correctOption =
      PlayJsonHelper.parseOrElse("correctOption", baseOptionNode.getOrElse(Json.obj()), false)
    option.correctOption = correctOption
    saveOption(option, question, user)
    propagateOptionCreationToExamQuestions(question, esq, option)

  private def processExamQuestionOptions(
      question: Question,
      esq: ExamSectionQuestion,
      node: JsArray,
      user: User
  ): Unit =
    // esq.options
    val persistedIds = question.options.asScala.map(_.id).toSet
    val providedIds = node.value.flatMap { n =>
      (n \ "option" \ "id").asOpt[Long]
    }.toSet

    // Updates
    node.value.foreach { n =>
      (n \ "option").asOpt[JsValue].foreach { o =>
        PlayJsonHelper.parse[Long]("id", o).foreach { id =>
          if persistedIds.contains(id) then updateOption(o, OptionUpdateOptions.SKIP_DEFAULTS)
        }
      }
    }

    // Removals
    question.options.asScala.filter(o => !providedIds.contains(o.id)).foreach(deleteOption)

    // Additions
    node.value.foreach { o =>
      if PlayJsonHelper.parse[Long]("id", o).isEmpty then
        createOptionBasedOnExamQuestion(question, esq, user, o)
    }

    // Finally, update own option scores:
    node.value.foreach { option =>
      PlayJsonHelper.parse[Long]("id", option).foreach { id =>
        Option(DB.find(classOf[ExamSectionQuestionOption], id)).foreach { esqo =>
          esqo.score =
            PlayJsonHelper.parse[Double]("score", option).map(d => round(d)).orNull

          esqo.update()
        }
      }
    }

  private def hasPositiveOptionScore(an: JsArray): Boolean =
    an.value.exists(n => (n \ "score").asOpt[Double].exists(_ > 0))

  private def hasValidClaimChoiceOptions(an: JsArray): Boolean =
    val hasCorrectOption = an.value.exists { n =>
      val optionNode = (n \ "option").asOpt[JsValue]
      val claimChoiceType =
        optionNode.flatMap(PlayJsonHelper.parseEnum(
          "claimChoiceType",
          _,
          classOf[ClaimChoiceOptionType]
        ))
      val score = (n \ "score").asOpt[Double].getOrElse(0.0)
      claimChoiceType.exists(_ != ClaimChoiceOptionType.SkipOption) && score > 0
    }

    val hasIncorrectOption = an.value.exists { n =>
      val optionNode = (n \ "option").asOpt[JsValue]
      val claimChoiceType =
        optionNode.flatMap(PlayJsonHelper.parseEnum(
          "claimChoiceType",
          _,
          classOf[ClaimChoiceOptionType]
        ))
      val score = (n \ "score").asOpt[Double].getOrElse(0.0)
      claimChoiceType.exists(_ != ClaimChoiceOptionType.SkipOption) && score <= 0
    }

    val hasSkipOption = an.value.exists { n =>
      val optionNode = (n \ "option").asOpt[JsValue]
      val claimChoiceType =
        optionNode.flatMap(PlayJsonHelper.parseEnum(
          "claimChoiceType",
          _,
          classOf[ClaimChoiceOptionType]
        ))
      val score = (n \ "score").asOpt[Double].getOrElse(0.0)
      claimChoiceType.contains(ClaimChoiceOptionType.SkipOption) && score == 0
    }

    hasCorrectOption && hasIncorrectOption && hasSkipOption
