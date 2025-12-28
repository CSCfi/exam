// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.controllers

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.iop.collaboration.services.*
import io.ebean.Model
import io.ebean.text.PathProperties
import models.exam.Exam
import models.questions.Question
import models.sections.{ExamSection, ExamSectionQuestion}
import models.user.{Role, User}
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import services.config.ConfigReader
import services.exam.{ExamUpdater, SectionQuestionHandler}
import services.json.JsonDeserializer
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*

class CollaborativeExamSectionController @Inject() (
    wsClient: play.api.libs.ws.WSClient,
    examUpdater: ExamUpdater,
    examLoader: CollaborativeExamLoaderService,
    configReader: ConfigReader,
    collaborativeExamService: CollaborativeExamService,
    collaborativeExamSectionService: CollaborativeExamSectionService,
    collaborativeExamSearchService: CollaborativeExamSearchService,
    collaborativeExamAuthorizationService: CollaborativeExamAuthorizationService,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    override val controllerComponents: ControllerComponents
)(implicit ec: BlockingIOExecutionContext)
    extends BaseController
    with EbeanQueryExtensions
    with EbeanJsonExtensions
    with SectionQuestionHandler
    with Logging:

  def addSection(examId: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))
    ).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      collaborativeExamSectionService.addSection(examId, user.getId).map {
        case Left(error)    => Forbidden(error)
        case Right(section) => Ok(section.asJson)
      }
    }

  private def update(
      request: play.api.mvc.Request[?],
      examId: Long,
      updater: (Exam, User) => Option[Result],
      resultProvider: Exam => Option[? <: Model]
  ): Future[Result] =
    collaborativeExamAuthorizationService.findCollaborativeExam(examId).flatMap {
      case Left(errorResult) => Future.successful(errorResult)
      case Right(ce) =>
        val user    = request.attrs(Auth.ATTR_USER)
        val homeOrg = configReader.getHomeOrganisationRef
        examLoader.downloadExam(ce).flatMap {
          case None => Future.successful(NotFound("i18n_error_exam_not_found"))
          case Some(exam)
              if !collaborativeExamAuthorizationService.isAuthorizedToView(exam, user, homeOrg) =>
            Future.successful(Forbidden("i18n_error_access_forbidden"))
          case Some(exam) =>
            updater(exam, user) match
              case Some(err) => Future.successful(err)
              case None =>
                val pp = PathProperties.parse(
                  "(*, question(*, attachment(*), questionOwners(*), tags(*), options(*)), options(*, option(*)))"
                )
                examLoader.uploadExam(ce, exam, user, resultProvider(exam).orNull, pp)
        }
    }

  def removeSection(examId: Long, sectionId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))).async { request =>
      val updater = (exam: Exam, _: User) =>
        exam.getExamSections.asScala.find(_.getId == sectionId) match
          case None => Some(NotFound("i18n_error_not_found"))
          case Some(es) =>
            exam.getExamSections.remove(es)
            // Decrease sequences for the entries above the removed one
            val seq = es.getSequenceNumber
            exam.getExamSections.asScala.foreach { sibling =>
              val num = sibling.getSequenceNumber
              if num >= seq then sibling.setSequenceNumber(num - 1)
            }
            None

      update(request, examId, updater, _ => None)
    }

  def updateSection(examId: Long, sectionId: Long): Action[AnyContent] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async { request =>
      val updater = (exam: Exam, _: User) =>
        exam.getExamSections.asScala.find(_.getId == sectionId) match
          case None     => Some(NotFound("i18n_error_not_found"))
          case Some(es) =>
            // Bind form data
            val formData = request.body.asFormUrlEncoded.getOrElse(Map.empty)
            formData.get("name").flatMap(_.headOption).foreach(es.setName)
            formData.get("expanded").flatMap(_.headOption).foreach(v => es.setExpanded(v.toBoolean))
            formData.get("lotteryOn").flatMap(_.headOption).foreach(v =>
              es.setLotteryOn(v.toBoolean)
            )
            formData
              .get("lotteryItemCount")
              .flatMap(_.headOption)
              .foreach(v => es.setLotteryItemCount(Math.max(1, v.toInt)))
            formData.get("description").flatMap(_.headOption).foreach(es.setDescription)
            None

      update(
        request,
        examId,
        updater,
        exam => exam.getExamSections.asScala.find(_.getId == sectionId)
      )
    }

  def reorderSections(examId: Long): Action[AnyContent] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async { request =>
      val updater = (exam: Exam, _: User) =>
        val formData = request.body.asFormUrlEncoded.getOrElse(Map.empty)
        (formData.get("from").flatMap(_.headOption), formData.get("to").flatMap(_.headOption)) match
          case (Some(fromStr), Some(toStr)) =>
            val from = fromStr.toInt
            val to   = toStr.toInt
            checkBounds(from, to) match
              case Some(err) => Some(err)
              case None      =>
                // Reorder by sequenceNumber (TreeSet orders the collection based on it)
                val sections =
                  exam.getExamSections.asScala.toSeq.sortBy(_.getSequenceNumber).toBuffer
                val prev = sections(from)
                sections.remove(from)
                sections.insert(to, prev)
                sections.zipWithIndex.foreach { case (section, i) =>
                  section.setSequenceNumber(i)
                }
                None
          case _ => Some(BadRequest("Missing from/to parameters"))

      update(request, examId, updater, _ => None)
    }

  def reorderSectionQuestions(examId: Long, sectionId: Long): Action[AnyContent] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async { request =>
      val updater = (exam: Exam, _: User) =>
        val formData = request.body.asFormUrlEncoded.getOrElse(Map.empty)
        (formData.get("from").flatMap(_.headOption), formData.get("to").flatMap(_.headOption)) match
          case (Some(fromStr), Some(toStr)) =>
            val from = fromStr.toInt
            val to   = toStr.toInt
            checkBounds(from, to) match
              case Some(err) => Some(err)
              case None =>
                exam.getExamSections.asScala.find(_.getId == sectionId) match
                  case None     => Some(NotFound("i18n_error_not_found"))
                  case Some(es) =>
                    // Reorder by sequenceNumber
                    val questions =
                      es.getSectionQuestions.asScala.toSeq.sortBy(_.getSequenceNumber).toBuffer
                    val prev = questions(from)
                    questions.remove(from)
                    questions.insert(to, prev)
                    questions.zipWithIndex.foreach { case (question, i) =>
                      question.setSequenceNumber(i)
                    }
                    None
          case _ => Some(BadRequest("Missing from/to parameters"))

      update(request, examId, updater, _ => None)
    }

  def addQuestion(examId: Long, sectionId: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      val seq               = (request.body \ "sequenceNumber").as[Int]
      val sectionQuestionId = CollaborativeExamProcessingService.newId()

      val updater = (exam: Exam, user: User) =>
        exam.getExamSections.asScala.find(_.getId == sectionId) match
          case None => Some(NotFound("i18n_error_not_found"))
          case Some(es) =>
            val questionBody = (request.body \ "question").get
            val question =
              JsonDeserializer.deserialize(classOf[Question], toJacksonJson(questionBody))
            question.getQuestionOwners.asScala.foreach(CollaborativeExamProcessingService.cleanUser)

            // Validate question
            question.getValidationResult(toJacksonJson(questionBody)).toScala.map(_.asScala) match
              case Some(error) => Some(error)
              case None =>
                val esq = new ExamSectionQuestion()
                question.setId(CollaborativeExamProcessingService.newId())

                if question.getType == Question.Type.ClaimChoiceQuestion then
                  // Naturally order generated ids before saving them to question options
                  val options = question.getOptions.asScala.toSeq
                  val generatedIds =
                    options.indices.map(_ => CollaborativeExamProcessingService.newId()).sorted
                  options.zip(generatedIds).foreach { case (opt, id) => opt.setId(id) }
                else
                  question.getOptions.asScala.foreach(o =>
                    o.setId(CollaborativeExamProcessingService.newId())
                  )

                esq.setId(sectionQuestionId)
                esq.setQuestion(question)

                // Assert that the sequence number provided is within limits
                val sequence = Math.min(Math.max(0, seq), es.getSectionQuestions.size())
                updateSequences(es.getSectionQuestions.asScala.toList, sequence)
                esq.setSequenceNumber(sequence)

                if es.getSectionQuestions.contains(esq) || es.hasQuestion(question) then
                  Some(BadRequest("i18n_question_already_in_section"))
                else
                  if question.getType == Question.Type.EssayQuestion then
                    // disable auto evaluation for this exam
                    Option(exam.getAutoEvaluationConfig).foreach(_.delete())

                  // Insert a new section question
                  esq.setCreator(user)
                  esq.setCreated(DateTime.now())
                  updateExamQuestion(esq, question)
                  esq.getOptions.asScala.foreach(o =>
                    o.setId(CollaborativeExamProcessingService.newId())
                  )
                  CollaborativeExamProcessingService.cleanUser(user)
                  es.setModifierWithDate(user)
                  es.getSectionQuestions.add(esq)
                  None

      update(
        request,
        examId,
        updater,
        exam =>
          exam.getExamSections.asScala
            .flatMap(_.getSectionQuestions.asScala)
            .find(_.getId == sectionQuestionId)
      )
    }

  def removeQuestion(examId: Long, sectionId: Long, questionId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))).async { request =>
      val updater = (exam: Exam, _: User) =>
        exam.getExamSections.asScala.find(_.getId == sectionId) match
          case None => Some(NotFound("i18n_error_not_found"))
          case Some(es) =>
            es.getSectionQuestions.asScala.find(_.getQuestion.getId == questionId) match
              case None => Some(NotFound("i18n_error_not_found"))
              case Some(esq) =>
                es.getSectionQuestions.remove(esq)

                // Decrease sequences for the entries above the removed one
                val seq = esq.getSequenceNumber
                es.getSectionQuestions.asScala.foreach { sibling =>
                  val num = sibling.getSequenceNumber
                  if num >= seq then sibling.setSequenceNumber(num - 1)
                }

                // Update the lottery item count if needed
                if es.isLotteryOn && es.getLotteryItemCount > es.getSectionQuestions.size() then
                  es.setLotteryItemCount(es.getSectionQuestions.size())

                None

      update(
        request,
        examId,
        updater,
        exam => exam.getExamSections.asScala.find(_.getId == sectionId)
      )
    }

  def clearQuestions(examId: Long, sectionId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))).async { request =>
      val updater = (exam: Exam, _: User) =>
        exam.getExamSections.asScala.find(_.getId == sectionId) match
          case None => Some(NotFound("i18n_error_not_found"))
          case Some(es) =>
            es.getSectionQuestions.clear()
            None

      update(
        request,
        examId,
        updater,
        exam => exam.getExamSections.asScala.find(_.getId == sectionId)
      )
    }

  def updateQuestion(examId: Long, sectionId: Long, questionId: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      collaborativeExamAuthorizationService.findCollaborativeExam(examId).flatMap {
        case Left(errorResult) => Future.successful(errorResult)
        case Right(ce) =>
          val user    = request.attrs(Auth.ATTR_USER)
          val homeOrg = configReader.getHomeOrganisationRef
          examLoader.downloadExam(ce).flatMap {
            case None => Future.successful(NotFound("i18n_error_exam_not_found"))
            case Some(exam)
                if !collaborativeExamAuthorizationService.isAuthorizedToView(exam, user, homeOrg) =>
              Future.successful(Forbidden("i18n_error_access_forbidden"))
            case Some(exam) =>
              exam.getExamSections.asScala.find(_.getId == sectionId) match
                case None => Future.successful(NotFound("i18n_error_not_found"))
                case Some(es) =>
                  es.getSectionQuestions.asScala.find(_.getId == questionId) match
                    case None => Future.successful(NotFound("i18n_error_not_found"))
                    case Some(esq) =>
                      val payload = (request.body \ "question").get
                      val questionBody =
                        JsonDeserializer.deserialize(classOf[Question], toJacksonJson(payload))

                      questionBody.getValidationResult(toJacksonJson(payload)).toScala.map(
                        _.asScala
                      ) match
                        case Some(error) => Future.successful(error)
                        case None =>
                          questionBody.getOptions.asScala
                            .filter(_.getId == null)
                            .foreach(o => o.setId(CollaborativeExamProcessingService.newId()))

                          updateExamQuestion(esq, questionBody)
                          esq.getOptions.asScala.foreach(o =>
                            o.setId(CollaborativeExamProcessingService.newId())
                          )

                          val pp = PathProperties.parse(
                            "(*, question(*, attachment(*), questionOwners(*), tags(*), options(*)), options(*, option(*)))"
                          )
                          examLoader.uploadExam(ce, exam, user, esq, pp)
          }
      }
    }

  private def createDraft(exam: Exam, user: User): ExamSection =
    val section = new ExamSection()
    section.setLotteryItemCount(1)
    section.setSectionQuestions(Set.empty[ExamSectionQuestion].asJava)
    section.setSequenceNumber(exam.getExamSections.size())
    section.setExpanded(true)
    section.setId(CollaborativeExamProcessingService.newId())
    CollaborativeExamProcessingService.cleanUser(user)
    section.setCreatorWithDate(user)
    section

  // Helper to convert Play JSON to Jackson JSON (for models that still use Jackson)
