// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.services

import ExamSectionError._
import io.ebean.DB
import io.ebean.text.PathProperties
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.exam.Exam
import models.questions.MultipleChoiceOption.ClaimChoiceOptionType
import models.questions.{MultipleChoiceOption, Question}
import models.sections.{ExamSection, ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.{Role, User}
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json.{JsArray, JsValue, Json}
import services.exam.{ExamUpdater, OptionUpdateOptions, SectionQuestionHandler}
import validation.core.PlayJsonHelper
import validation.section.SectionQuestionDTO

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

class ExamSectionService @Inject() (
    private val examUpdater: ExamUpdater,
    implicit private val ec: ExecutionContext
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
        val optionalSectionsExist = exam.getExamSections.asScala.exists(_.isOptional)
        if optionalSectionsExist && !examUpdater.isAllowedToUpdate(exam, user) then
          Left(FutureReservationsExist)
        else if exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)
        then
          val section = new ExamSection()
          section.setLotteryItemCount(1)
          section.setExam(exam)
          section.setSectionQuestions(java.util.Collections.emptySet())
          section.setSequenceNumber(exam.getExamSections.size())
          section.setExpanded(true)
          section.setOptional(false)
          section.setCreatorWithDate(user)
          section.save()
          Right(section)
        else Left(AccessForbidden)

  def removeSection(examId: Long, sectionId: Long, user: User): Either[ExamSectionError, Unit] =
    findExamAndSection(examId, sectionId, user) match
      case Left(error)            => Left(error)
      case Right((exam, section)) =>
        // Not allowed to remove a section if optional sections exist and there are upcoming reservations
        val optionalSectionsExist = exam.getExamSections.asScala.exists(_.isOptional)
        if optionalSectionsExist && !examUpdater.isAllowedToUpdate(exam, user) then
          Left(FutureReservationsExist)
        else
          exam.getExamSections.remove(section)
          // Decrease sequences for the entries above the inserted one
          val seq = section.getSequenceNumber
          exam.getExamSections.asScala.foreach { es =>
            val num = es.getSequenceNumber
            if num >= seq then
              es.setSequenceNumber(num - 1)
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
        name.foreach(section.setName)
        section.setExpanded(expanded)
        section.setLotteryOn(lotteryOn)
        section.setLotteryItemCount(Math.max(1, lotteryItemCount))
        description.foreach(section.setDescription)
        // Disallow changing optionality if future reservations exist
        if section.isOptional != optional && !examUpdater.isAllowedToUpdate(exam, user) then
          Left(FutureReservationsExist)
        else
          section.setOptional(optional)
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
          val sections = exam.getExamSections.asScala.toSeq.sorted
          if from < sections.length then
            val prev    = sections(from)
            val updated = sections.patch(from, Nil, 1).patch(to, Seq(prev), 0)
            updated.zipWithIndex.foreach { (section, i) =>
              section.setSequenceNumber(i)
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
              val questions = section.getSectionQuestions.asScala.toSeq.sorted
              if from < questions.length then
                val prev    = questions(from)
                val updated = questions.patch(from, Nil, 1).patch(to, Seq(prev), 0)
                updated.zipWithIndex.foreach { (question, i) =>
                  question.setSequenceNumber(i)
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
        if exam.getAutoEvaluationConfig != null && question.getType == Question.Type.EssayQuestion
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
                      exam.getAutoEvaluationConfig
                    ).isDefined && question.getType == Question.Type.EssayQuestion
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
        val section = sectionQuestion.getExamSection
        val exam    = section.getExam
        if !exam.isOwnedOrCreatedBy(user) && !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
          Left(AccessForbidden)
        else
          section.getSectionQuestions.remove(sectionQuestion)

          // Decrease sequences for the entries above the inserted one
          val seq = sectionQuestion.getSequenceNumber
          section.getSectionQuestions.asScala.foreach { esq =>
            val num = esq.getSequenceNumber
            if num >= seq then
              esq.setSequenceNumber(num - 1)
              esq.update()
          }
          // Update the lottery item count if needed
          if section.isLotteryOn && section.getLotteryItemCount > section.getSectionQuestions.size()
          then
            section.setLotteryItemCount(section.getSectionQuestions.size())
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
        if section.getExam.isOwnedOrCreatedBy(user) || user.hasRole(
            Role.Name.ADMIN,
            Role.Name.SUPPORT
          )
        then
          section.getSectionQuestions.asScala.foreach { sq =>
            sq.getQuestion.getChildren.asScala.foreach { c =>
              c.setParent(null)
              c.update()
            }
            sq.delete()
          }
          section.getSectionQuestions.clear()
          section.setLotteryOn(false)
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

    val baseQuery = DB.find(classOf[ExamSectionQuestion]).where().idEq(questionId)
    val query =
      if user.hasRole(Role.Name.TEACHER) then baseQuery.eq("examSection.exam.examOwners", user)
      else baseQuery
    val pp = PathProperties.parse("(*, question(*, options(*)), options(*, option(*)))")
    query.apply(pp)
    query.find match
      case None => Left(AccessForbidden)
      case Some(examSectionQuestion) =>
        DB.find(classOf[Question])
          .fetch("examSectionQuestions")
          .fetch("examSectionQuestions.options")
          .where()
          .idEq(examSectionQuestion.getQuestion.getId)
          .find match
          case None => Left(QuestionNotFound)
          case Some(question) =>
            (body \ "options").asOpt[JsArray] match
              case None => Left(MissingOptionsArray)
              case Some(optionsArray) =>
                if question.getType == Question.Type.WeightedMultipleChoiceQuestion && !hasPositiveOptionScore(
                    optionsArray
                  )
                then Left(CorrectOptionRequired)
                else if question.getType == Question.Type.ClaimChoiceQuestion && !hasValidClaimChoiceOptions(
                    optionsArray
                  )
                then Left(IncorrectClaimQuestionOptions)
                else
                  // Update question: text
                  question.setQuestion(dto.getQuestionTextOrNull)
                  question.update()
                  updateExamQuestionFromJson(examSectionQuestion, body, dto)
                  examSectionQuestion.update()
                  if question.getType != Question.Type.EssayQuestion && question.getType != Question.Type.ClozeTestQuestion
                  then
                    // Process the options, this has an impact on the base question options as well as all the section questions
                    // using those.
                    processExamQuestionOptions(question, examSectionQuestion, optionsArray, user)
                  Right(examSectionQuestion)

  def updateUndistributedExamQuestion(
      examId: Long,
      sectionId: Long,
      questionId: Long,
      user: User
  ): Either[ExamSectionError, ExamSectionQuestion] =
    val baseQuery = DB.find(classOf[ExamSectionQuestion]).where().idEq(questionId)
    val query =
      if user.hasRole(Role.Name.TEACHER) then baseQuery.eq("examSection.exam.examOwners", user)
      else baseQuery
    val pp =
      PathProperties.parse("(*, question(*, attachment(*), options(*)), options(*, option(*)))")
    query.apply(pp)
    query.find match
      case None => Left(AccessForbidden)
      case Some(examSectionQuestion) =>
        Option(DB.find(classOf[Question], examSectionQuestion.getQuestion.getId)) match
          case None => Left(QuestionNotFound)
          case Some(question) =>
            updateExamQuestion(examSectionQuestion, question)
            examSectionQuestion.update()
            Right(examSectionQuestion)

  def getQuestionDistribution(questionId: Long): Either[ExamSectionError, Boolean] =
    Option(DB.find(classOf[ExamSectionQuestion], questionId)) match
      case None => Left(SectionQuestionNotFound)
      case Some(esq) =>
        val question = esq.getQuestion
        // ATM it is enough that a question is bound to multiple exams
        val isDistributed = question.getExamSectionQuestions.asScala
          .map(_.getExamSection.getExam)
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
        baseQuery.where().eq("creator.id", user.getId)
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
    sectionQuestion.setExamSection(section)
    sectionQuestion.setQuestion(question)
    // Assert that the sequence number provided is within limits
    val sequence = Math.min(Math.max(0, seq), section.getSectionQuestions.size())
    updateSequences(section.getSectionQuestions.asScala.toList, sequence)
    sectionQuestion.setSequenceNumber(sequence)
    if section.getSectionQuestions.contains(sectionQuestion) || section.hasQuestion(question) then
      Left(QuestionAlreadyInSection)
    else
      if question.getType == Question.Type.EssayQuestion then
        // disable auto evaluation for this exam
        Option(exam.getAutoEvaluationConfig).foreach(_.delete())
      DB.updateAll(section.getSectionQuestions)

      // Insert a new section question
      sectionQuestion.setCreator(user)
      sectionQuestion.setCreated(DateTime.now())
      sectionQuestion.setExamSection(section)

      updateExamQuestion(sectionQuestion, question)

      section.getSectionQuestions.add(sectionQuestion)

      section.setModifierWithDate(user)
      section.save()
      section.setSectionQuestions(new java.util.TreeSet(section.getSectionQuestions))
      Right(())

  private def updateExamQuestionFromJson(
      sectionQuestion: ExamSectionQuestion,
      body: JsValue,
      dto: SectionQuestionDTO
  ): Unit =
    sectionQuestion.setMaxScore(
      PlayJsonHelper.parse[Double]("maxScore", body).map(d => round(d)).orNull
    )
    sectionQuestion.setAnswerInstructions(dto.getAnswerInstructionsOrNull)
    sectionQuestion.setEvaluationCriteria(dto.getEvaluationCriteriaOrNull)
    sectionQuestion.setEvaluationType(
      PlayJsonHelper.parseEnum("evaluationType", body, classOf[Question.EvaluationType]).orNull
    )
    sectionQuestion.setExpectedWordCount(
      PlayJsonHelper.parse[Int]("expectedWordCount", body).map(
        _.asInstanceOf[java.lang.Integer]
      ).orNull
    )
    sectionQuestion.setNegativeScoreAllowed(
      PlayJsonHelper.parseOrElse("negativeScoreAllowed", body, false)
    )
    sectionQuestion.setOptionShufflingOn(
      PlayJsonHelper.parseOrElse("optionShufflingOn", body, true)
    )

  private def createOptionBasedOnExamQuestion(
      question: Question,
      esq: ExamSectionQuestion,
      user: User,
      node: JsValue
  ): Unit =
    val option         = new MultipleChoiceOption()
    val baseOptionNode = (node \ "option").asOpt[JsValue]
    baseOptionNode.foreach { optNode =>
      option.setOption(PlayJsonHelper.parse[String]("option", optNode).orNull)
    }
    option.setDefaultScore(
      PlayJsonHelper.parse[Double]("score", node).map(d => round(d)).orNull
    )
    val correctOption =
      PlayJsonHelper.parseOrElse("correctOption", baseOptionNode.getOrElse(Json.obj()), false)
    option.setCorrectOption(correctOption)
    saveOption(option, question, user)
    propagateOptionCreationToExamQuestions(question, esq, option)

  private def processExamQuestionOptions(
      question: Question,
      esq: ExamSectionQuestion,
      node: JsArray,
      user: User
  ): Unit =
    // esq.options
    val persistedIds = question.getOptions.asScala.map(_.getId).toSet
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
    question.getOptions.asScala.filter(o => !providedIds.contains(o.getId)).foreach(deleteOption)

    // Additions
    node.value.foreach { o =>
      if PlayJsonHelper.parse[Long]("id", o).isEmpty then
        createOptionBasedOnExamQuestion(question, esq, user, o)
    }

    // Finally, update own option scores:
    node.value.foreach { option =>
      PlayJsonHelper.parse[Long]("id", option).foreach { id =>
        Option(DB.find(classOf[ExamSectionQuestionOption], id)).foreach { esqo =>
          esqo.setScore(
            PlayJsonHelper.parse[Double]("score", option).map(d => round(d)).orNull
          )
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
