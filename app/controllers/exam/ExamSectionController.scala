// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.exam

import impl.{ExamUpdater, OptionUpdateOptions, SectionQuestionHandler}
import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.exam.Exam
import models.questions.MultipleChoiceOption.ClaimChoiceOptionType
import models.questions.{MultipleChoiceOption, Question}
import models.sections.{ExamSection, ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.{Role, User}
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json.{JsArray, JsValue, Json}
import play.api.mvc.*
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import validation.scala.core.PlayJsonHelper
import validation.scala.section.SectionQuestionDTO

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*

class ExamSectionController @Inject() (
    examUpdater: ExamUpdater,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with SectionQuestionHandler
    with DbApiHelper
    with JavaApiHelper
    with Logging:

  def insertSection(eid: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        DB.find(classOf[Exam])
          .fetch("examOwners")
          .fetch("examSections")
          .where()
          .idEq(eid)
          .find match
          case None       => NotFound("i18n_error_not_found")
          case Some(exam) =>
            // Not allowed to add a section if optional sections exist and there are upcoming reservations
            val optionalSectionsExist = exam.getExamSections.asScala.exists(_.isOptional)
            if optionalSectionsExist && !examUpdater.isAllowedToUpdate(exam, user) then
              Forbidden("i18n_error_future_reservations_exist")
            else if exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
              val section = new ExamSection()
              section.setLotteryItemCount(1)
              section.setExam(exam)
              section.setSectionQuestions(java.util.Collections.emptySet())
              section.setSequenceNumber(exam.getExamSections.size())
              section.setExpanded(true)
              section.setOptional(false)
              section.setCreatorWithDate(user)
              section.save()
              Ok(section.asJson(PathProperties.parse("(*, examMaterials(*), sectionQuestions(*))")))
            else Forbidden("i18n_error_access_forbidden")
    }

  def removeSection(eid: Long, sid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      findOrFail(eid, sid, user) match
        case Left(error)            => error
        case Right((exam, section)) =>
          // Not allowed to remove a section if optional sections exist and there are upcoming reservations
          val optionalSectionsExist = exam.getExamSections.asScala.exists(_.isOptional)
          if optionalSectionsExist && !examUpdater.isAllowedToUpdate(exam, user) then
            Forbidden("i18n_error_future_reservations_exist")
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
            Ok
    }

  def updateSection(eid: Long, sid: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .async(parse.json) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val body = request.body
      findOrFail(eid, sid, user) match
        case Left(error) => Future.successful(error)
        case Right((_, section)) =>
          val name             = PlayJsonHelper.parse[String]("name", body)
          val expanded         = PlayJsonHelper.parseOrElse("expanded", body, false)
          val lotteryOn        = PlayJsonHelper.parseOrElse("lotteryOn", body, false)
          val lotteryItemCount = PlayJsonHelper.parseOrElse("lotteryItemCount", body, 1)
          val description      = PlayJsonHelper.parse[String]("description", body)
          val optional         = PlayJsonHelper.parseOrElse("optional", body, false)

          name.foreach(section.setName)
          section.setExpanded(expanded)
          section.setLotteryOn(lotteryOn)
          section.setLotteryItemCount(Math.max(1, lotteryItemCount))
          description.foreach(section.setDescription)
          // Disallow changing optionality if future reservations exist
          if section.isOptional != optional && !examUpdater.isAllowedToUpdate(section.getExam, user) then
            Future.successful(BadRequest("i18n_error_future_reservations_exist"))
          else
            section.setOptional(optional)
            section.update()
            Future.successful(Ok(section.asJson))
    }

  def reorderSections(eid: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .async(parse.json) { request =>
      val body    = request.body
      val fromOpt = PlayJsonHelper.parse[Int]("from", body)
      val toOpt   = PlayJsonHelper.parse[Int]("to", body)

      (fromOpt, toOpt) match
        case (Some(from), Some(to)) =>
          checkBounds(from, to) match
            case Some(error) =>
              Future.successful(error)
            case None =>
              DB.find(classOf[Exam]).fetch("examSections").where().idEq(eid).find match
                case None => Future.successful(NotFound("i18n_error_exam_not_found"))
                case Some(exam) =>
                  val user = request.attrs(Auth.ATTR_USER)
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
                    Future.successful(Ok)
                  else Future.successful(Forbidden("i18n_error_access_forbidden"))
        case _ => Future.successful(BadRequest("Missing 'from' or 'to' parameter"))
    }

  def reorderSectionQuestions(eid: Long, sid: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .async(parse.json) { request =>
      val body    = request.body
      val fromOpt = PlayJsonHelper.parse[Int]("from", body)
      val toOpt   = PlayJsonHelper.parse[Int]("to", body)

      (fromOpt, toOpt) match
        case (Some(from), Some(to)) =>
          checkBounds(from, to) match
            case Some(error) =>
              Future.successful(error)
            case None =>
              Option(DB.find(classOf[Exam], eid)) match
                case None => Future.successful(NotFound("i18n_error_exam_not_found"))
                case Some(exam) =>
                  val user = request.attrs(Auth.ATTR_USER)
                  if exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
                    Option(DB.find(classOf[ExamSection], sid)) match
                      case None          => Future.successful(NotFound("section not found"))
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
                        Future.successful(Ok)
                  else Future.successful(Forbidden("i18n_error_access_forbidden"))
        case _ => Future.successful(BadRequest("Missing 'from' or 'to' parameter"))
    }

  private def findOrFail(eid: Long, sid: Long, user: User): Either[Result, (Exam, ExamSection)] =
    val examOpt =
      DB.find(classOf[Exam])
        .fetch("examOwners")
        .fetch("examSections")
        .where()
        .idEq(eid)
        .find
    val sectionOpt = Option(DB.find(classOf[ExamSection], sid))

    (examOpt, sectionOpt) match
      case (None, _) | (_, None) => Left(NotFound("i18n_error_not_found"))
      case (Some(exam), Some(section)) =>
        if !exam.isOwnedOrCreatedBy(user) && !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
          Left(Unauthorized("i18n_error_access_forbidden"))
        else Right((exam, section))

  private def updateExamQuestion(
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
      PlayJsonHelper.parse[Int]("expectedWordCount", body).map(_.asInstanceOf[java.lang.Integer]).orNull
    )
    sectionQuestion.setNegativeScoreAllowed(
      PlayJsonHelper.parseOrElse("negativeScoreAllowed", body, false)
    )
    sectionQuestion.setOptionShufflingOn(
      PlayJsonHelper.parseOrElse("optionShufflingOn", body, true)
    )

  private def insertQuestion(
      exam: Exam,
      section: ExamSection,
      question: Question,
      user: User,
      seq: Int
  ): Option[Result] =
    val sectionQuestion = new ExamSectionQuestion()
    sectionQuestion.setExamSection(section)
    sectionQuestion.setQuestion(question)
    // Assert that the sequence number provided is within limits
    val sequence = Math.min(Math.max(0, seq), section.getSectionQuestions.size())
    updateSequences(section.getSectionQuestions.asScala.toList, sequence)
    sectionQuestion.setSequenceNumber(sequence)
    if section.getSectionQuestions.contains(sectionQuestion) || section.hasQuestion(question) then
      Some(BadRequest("i18n_question_already_in_section"))
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
      None

  def insertQuestion(eid: Long, sid: Long, qid: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .async(parse.json) { request =>
      val user   = request.attrs(Auth.ATTR_USER)
      val body   = request.body
      val seqOpt = PlayJsonHelper.parse[Int]("sequenceNumber", body)

      (
        Option(DB.find(classOf[Exam], eid)),
        Option(DB.find(classOf[ExamSection], sid)),
        Option(DB.find(classOf[Question], qid)),
        seqOpt
      ) match
        case (None, _, _, _) | (_, None, _, _) | (_, _, None, _) => Future.successful(NotFound)
        case (Some(exam), Some(section), Some(question), Some(seq)) =>
          if exam.getAutoEvaluationConfig != null && question.getType == Question.Type.EssayQuestion then
            Future.successful(Forbidden("i18n_error_autoevaluation_essay_question"))
          else if !exam.isOwnedOrCreatedBy(user) && !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
            Future.successful(Forbidden("i18n_error_access_forbidden"))
          else
            insertQuestion(exam, section, question, user, seq) match
              case Some(error) => Future.successful(error)
              case None        => Future.successful(Ok(section.asJson))
        case _ => Future.successful(BadRequest("Missing sequenceNumber"))
    }

  def insertMultipleQuestions(eid: Long, sid: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .async(parse.json) { request =>
      val user         = request.attrs(Auth.ATTR_USER)
      val body         = request.body
      val sequenceOpt  = PlayJsonHelper.parse[Int]("sequenceNumber", body)
      val questionsOpt = PlayJsonHelper.parseCommaSeparatedLongs("questions", body)

      (
        Option(DB.find(classOf[Exam], eid)),
        Option(DB.find(classOf[ExamSection], sid)),
        sequenceOpt,
        questionsOpt
      ) match
        case (None, _, _, _) | (_, None, _, _) => Future.successful(NotFound)
        case (Some(exam), Some(section), Some(sequence), Some(questions)) =>
          if !exam.isOwnedOrCreatedBy(user) && !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
            Future.successful(Forbidden("i18n_error_access_forbidden"))
          else
            questions.foldLeft[Option[Result]](None) { (acc, qid) =>
              acc.orElse {
                Option(DB.find(classOf[Question], qid)) match
                  case None => None
                  case Some(question) =>
                    if Option(exam.getAutoEvaluationConfig).isDefined && question.getType == Question.Type.EssayQuestion then
                      Some(Forbidden("i18n_error_autoevaluation_essay_question"))
                    else insertQuestion(exam, section, question, user, sequence)
              }
            } match
              case Some(error) => Future.successful(error)
              case None        => Future.successful(Ok(section.asJson))
        case _ => Future.successful(BadRequest("Missing sequenceNumber or questions"))
    }

  def removeQuestion(eid: Long, sid: Long, qid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      DB.find(classOf[ExamSectionQuestion])
        .fetch("examSection.exam.examOwners")
        .fetch("question")
        .where()
        .eq("examSection.exam.id", eid)
        .eq("examSection.id", sid)
        .eq("question.id", qid)
        .find match
        case None => NotFound("i18n_error_not_found")
        case Some(sectionQuestion) =>
          val section = sectionQuestion.getExamSection
          val exam    = section.getExam
          if !exam.isOwnedOrCreatedBy(user) && !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
            Forbidden("i18n_error_access_forbidden")
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
            if section.isLotteryOn && section.getLotteryItemCount > section.getSectionQuestions.size() then
              section.setLotteryItemCount(section.getSectionQuestions.size())
            sectionQuestion.delete()
            Ok(section.asJson)
    }

  def clearQuestions(eid: Long, sid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      DB.find(classOf[ExamSection])
        .fetch("exam.creator")
        .fetch("exam.examOwners")
        .fetch("exam.parent.examOwners")
        .where()
        .idEq(sid)
        .eq("exam.id", eid)
        .find match
        case None => NotFound("i18n_error_not_found")
        case Some(section) =>
          if section.getExam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
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
            Ok(section.asJson)
          else Forbidden("i18n_error_access_forbidden")
    }

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
    val correctOption = PlayJsonHelper.parseOrElse("correctOption", baseOptionNode.getOrElse(Json.obj()), false)
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
      if PlayJsonHelper.parse[Long]("id", o).isEmpty then createOptionBasedOnExamQuestion(question, esq, user, o)
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
        optionNode.flatMap(PlayJsonHelper.parseEnum("claimChoiceType", _, classOf[ClaimChoiceOptionType]))
      val score = (n \ "score").asOpt[Double].getOrElse(0.0)
      claimChoiceType.exists(_ != ClaimChoiceOptionType.SkipOption) && score > 0
    }

    val hasIncorrectOption = an.value.exists { n =>
      val optionNode = (n \ "option").asOpt[JsValue]
      val claimChoiceType =
        optionNode.flatMap(PlayJsonHelper.parseEnum("claimChoiceType", _, classOf[ClaimChoiceOptionType]))
      val score = (n \ "score").asOpt[Double].getOrElse(0.0)
      claimChoiceType.exists(_ != ClaimChoiceOptionType.SkipOption) && score <= 0
    }

    val hasSkipOption = an.value.exists { n =>
      val optionNode = (n \ "option").asOpt[JsValue]
      val claimChoiceType =
        optionNode.flatMap(PlayJsonHelper.parseEnum("claimChoiceType", _, classOf[ClaimChoiceOptionType]))
      val score = (n \ "score").asOpt[Double].getOrElse(0.0)
      claimChoiceType.contains(ClaimChoiceOptionType.SkipOption) && score == 0
    }

    hasCorrectOption && hasIncorrectOption && hasSkipOption

  def updateDistributedExamQuestion(eid: Long, sid: Long, qid: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .async(parse.json) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val body = request.body

      // Parse and validate section question DTO manually
      val answerInstructions = PlayJsonHelper.parseHtml("answerInstructions", body)
      val evaluationCriteria = PlayJsonHelper.parseHtml("evaluationCriteria", body)
      val questionText = (body \ "question").asOpt[JsValue].flatMap { questionNode =>
        PlayJsonHelper.parseHtml("question", questionNode)
      }
      val dto = SectionQuestionDTO(answerInstructions, evaluationCriteria, questionText)

      val baseQuery = DB.find(classOf[ExamSectionQuestion]).where().idEq(qid)
      val query = if user.hasRole(Role.Name.TEACHER) then
        baseQuery.eq("examSection.exam.examOwners", user)
      else baseQuery
      val pp = PathProperties.parse("(*, question(*, options(*)), options(*, option(*)))")
      query.apply(pp)
      query.find match
        case None => Future.successful(Forbidden("i18n_error_access_forbidden"))
        case Some(examSectionQuestion) =>
          DB.find(classOf[Question])
            .fetch("examSectionQuestions")
            .fetch("examSectionQuestions.options")
            .where()
            .idEq(examSectionQuestion.getQuestion.getId)
            .find match
            case None => Future.successful(NotFound)
            case Some(question) =>
              (body \ "options").asOpt[JsArray] match
                case Some(optionsArray) =>
                  if question.getType == Question.Type.WeightedMultipleChoiceQuestion && !hasPositiveOptionScore(
                      optionsArray
                    )
                  then Future.successful(BadRequest("i18n_correct_option_required"))
                  else if question.getType == Question.Type.ClaimChoiceQuestion && !hasValidClaimChoiceOptions(
                      optionsArray
                    )
                  then Future.successful(BadRequest("i18n_incorrect_claim_question_options"))
                  else
                    // Update question: text
                    question.setQuestion(dto.getQuestionTextOrNull)
                    question.update()
                    updateExamQuestion(examSectionQuestion, body, dto)
                    examSectionQuestion.update()
                    if question.getType != Question.Type.EssayQuestion && question.getType != Question.Type.ClozeTestQuestion
                    then
                      // Process the options, this has an impact on the base question options as well as all the section questions
                      // using those.
                      processExamQuestionOptions(question, examSectionQuestion, optionsArray, user)
                    // A bit dumb, re-fetch from the database to get the updated options right in response. Could be made more elegantly
                    Future.successful(Ok(query.findOne().asJson(pp)))
                case None => Future.successful(BadRequest("Missing options array"))
    }

  def updateUndistributedExamQuestion(eid: Long, sid: Long, qid: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user  = request.attrs(Auth.ATTR_USER)
        val baseQuery = DB.find(classOf[ExamSectionQuestion]).where().idEq(qid)
        val query = if user.hasRole(Role.Name.TEACHER) then
          baseQuery.eq("examSection.exam.examOwners", user)
        else baseQuery
        val pp = PathProperties.parse("(*, question(*, attachment(*), options(*)), options(*, option(*)))")
        query.apply(pp)
        query.find match
          case None => Forbidden("i18n_error_access_forbidden")
          case Some(examSectionQuestion) =>
            Option(DB.find(classOf[Question], examSectionQuestion.getQuestion.getId)) match
              case None => NotFound
              case Some(question) =>
                updateExamQuestion(examSectionQuestion, question)
                examSectionQuestion.update()
                Ok(examSectionQuestion.asJson(pp))
    }

  def getQuestionDistribution(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Option(DB.find(classOf[ExamSectionQuestion], id)) match
        case None => NotFound
        case Some(esq) =>
          val question = esq.getQuestion
          // ATM it is enough that a question is bound to multiple exams
          val isDistributed = question.getExamSectionQuestions.asScala
            .map(_.getExamSection.getExam)
            .toSeq
            .distinct
            .size > 1

          Ok(Json.obj("distributed" -> isDistributed))
    }

  def listSections(
      filter: Option[String],
      courseIds: Option[List[Long]],
      examIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val user  = request.attrs(Auth.ATTR_USER)
      val baseQuery = DB.find(classOf[ExamSection]).where()
      val withCreatorFilter = if !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
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
      Ok(query.distinct.asJson(PathProperties.parse("(*, creator(id))")))
    }
