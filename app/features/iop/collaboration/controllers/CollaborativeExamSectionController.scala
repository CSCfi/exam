// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.controllers

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.iop.collaboration.services.*
import features.question.services.QuestionService
import io.ebean.Model
import io.ebean.text.PathProperties
import models.exam.Exam
import models.questions.Question
import models.questions.QuestionType
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

class CollaborativeExamSectionController @Inject() (
    wsClient: play.api.libs.ws.WSClient,
    examUpdater: ExamUpdater,
    examLoader: CollaborativeExamLoaderService,
    configReader: ConfigReader,
    questionService: QuestionService,
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
      collaborativeExamSectionService.addSection(examId, user.id).map {
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
        exam.examSections.asScala.find(_.id == sectionId) match
          case None => Some(NotFound("i18n_error_not_found"))
          case Some(es) =>
            exam.examSections.remove(es)
            // Decrease sequences for the entries above the removed one
            val seq = es.sequenceNumber
            exam.examSections.asScala.foreach { sibling =>
              val num = sibling.sequenceNumber
              if num >= seq then sibling.sequenceNumber = num - 1
            }
            None

      update(request, examId, updater, _ => None)
    }

  def updateSection(examId: Long, sectionId: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      val updater = (exam: Exam, _: User) =>
        exam.examSections.asScala.find(_.id == sectionId) match
          case None => Some(NotFound("i18n_error_not_found"))
          case Some(es) =>
            val body = request.body
            (body \ "name").asOpt[String].foreach(v => es.name = v)
            (body \ "expanded").asOpt[Boolean].foreach(v => es.expanded = v)
            (body \ "lotteryOn").asOpt[Boolean].foreach(v => es.lotteryOn = v)
            (body \ "lotteryItemCount").asOpt[Int].foreach(v =>
              es.lotteryItemCount = Math.max(1, v)
            )
            (body \ "description").asOpt[String].foreach(v => es.description = v)
            None

      update(
        request,
        examId,
        updater,
        exam => exam.examSections.asScala.find(_.id == sectionId)
      )
    }

  def reorderSections(examId: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      val updater = (exam: Exam, _: User) =>
        ((request.body \ "from").asOpt[Int], (request.body \ "to").asOpt[Int]) match
          case (Some(from), Some(to)) =>
            checkBounds(from, to) match
              case Some(err) => Some(err)
              case None      =>
                // Reorder by sequenceNumber (TreeSet orders the collection based on it)
                val sections =
                  exam.examSections.asScala.toSeq.sortBy(_.sequenceNumber).toBuffer
                val prev = sections(from)
                sections.remove(from)
                sections.insert(to, prev)
                sections.zipWithIndex.foreach { case (section, i) =>
                  section.sequenceNumber = i
                }
                None
          case _ => Some(BadRequest("Missing from/to parameters"))

      update(request, examId, updater, _ => None)
    }

  def reorderSectionQuestions(examId: Long, sectionId: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      val updater = (exam: Exam, _: User) =>
        ((request.body \ "from").asOpt[Int], (request.body \ "to").asOpt[Int]) match
          case (Some(from), Some(to)) =>
            checkBounds(from, to) match
              case Some(err) => Some(err)
              case None =>
                exam.examSections.asScala.find(_.id == sectionId) match
                  case None     => Some(NotFound("i18n_error_not_found"))
                  case Some(es) =>
                    // Reorder by sequenceNumber
                    val questions =
                      es.sectionQuestions.asScala.toSeq.sortBy(_.sequenceNumber).toBuffer
                    val prev = questions(from)
                    questions.remove(from)
                    questions.insert(to, prev)
                    questions.zipWithIndex.foreach { case (question, i) =>
                      question.sequenceNumber = i
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
        exam.examSections.asScala.find(_.id == sectionId) match
          case None => Some(NotFound("i18n_error_not_found"))
          case Some(es) =>
            val questionBody = (request.body \ "question").get
            val question =
              JsonDeserializer.deserialize(classOf[Question], toJacksonJson(questionBody))
            question.questionOwners.asScala.foreach(CollaborativeExamProcessingService.cleanUser)

            // Validate question
            questionService.validate(question, questionBody) match
              case Some(error) => Some(error)
              case None =>
                val esq = new ExamSectionQuestion()
                question.id = CollaborativeExamProcessingService.newId()

                if question.`type` == QuestionType.ClaimChoiceQuestion then
                  // Naturally order generated ids before saving them to question options
                  val options = question.options.asScala.toSeq
                  val generatedIds =
                    options.indices.map(_ => CollaborativeExamProcessingService.newId()).sorted
                  options.zip(generatedIds).foreach { case (opt, id) => opt.id = id }
                else
                  question.options.asScala.foreach(o =>
                    o.id = CollaborativeExamProcessingService.newId()
                  )

                esq.id = sectionQuestionId
                esq.question = question

                // Assert that the sequence number provided is within limits
                val sequence = Math.min(Math.max(0, seq), es.sectionQuestions.size())
                updateSequences(es.sectionQuestions.asScala.toList, sequence)
                esq.sequenceNumber = sequence

                if es.sectionQuestions.contains(esq) || es.hasQuestion(question) then
                  Some(BadRequest("i18n_question_already_in_section"))
                else
                  if question.`type` == QuestionType.EssayQuestion then
                    // disable auto evaluation for this exam
                    Option(exam.autoEvaluationConfig).foreach(_.delete())

                  // Insert a new section question
                  esq.creator = user
                  esq.created = DateTime.now()
                  updateExamQuestion(esq, question)
                  esq.options.asScala.foreach(o =>
                    o.id = CollaborativeExamProcessingService.newId()
                  )
                  CollaborativeExamProcessingService.cleanUser(user)
                  es.setModifierWithDate(user)
                  es.sectionQuestions.add(esq)
                  None

      update(
        request,
        examId,
        updater,
        exam =>
          exam.examSections.asScala
            .flatMap(_.sectionQuestions.asScala)
            .find(_.id == sectionQuestionId)
      )
    }

  def removeQuestion(examId: Long, sectionId: Long, questionId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))).async { request =>
      val updater = (exam: Exam, _: User) =>
        exam.examSections.asScala.find(_.id == sectionId) match
          case None => Some(NotFound("i18n_error_not_found"))
          case Some(es) =>
            es.sectionQuestions.asScala.find(_.question.id == questionId) match
              case None => Some(NotFound("i18n_error_not_found"))
              case Some(esq) =>
                es.sectionQuestions.remove(esq)

                // Decrease sequences for the entries above the removed one
                val seq = esq.sequenceNumber
                es.sectionQuestions.asScala.foreach { sibling =>
                  val num = sibling.sequenceNumber
                  if num >= seq then sibling.sequenceNumber = num - 1
                }

                // Update the lottery item count if needed
                if es.lotteryOn && es.lotteryItemCount > es.sectionQuestions.size() then
                  es.lotteryItemCount = es.sectionQuestions.size()

                None

      update(
        request,
        examId,
        updater,
        exam => exam.examSections.asScala.find(_.id == sectionId)
      )
    }

  def clearQuestions(examId: Long, sectionId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))).async { request =>
      val updater = (exam: Exam, _: User) =>
        exam.examSections.asScala.find(_.id == sectionId) match
          case None => Some(NotFound("i18n_error_not_found"))
          case Some(es) =>
            es.sectionQuestions.clear()
            None

      update(
        request,
        examId,
        updater,
        exam => exam.examSections.asScala.find(_.id == sectionId)
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
              exam.examSections.asScala.find(_.id == sectionId) match
                case None => Future.successful(NotFound("i18n_error_not_found"))
                case Some(es) =>
                  es.sectionQuestions.asScala.find(_.id == questionId) match
                    case None => Future.successful(NotFound("i18n_error_not_found"))
                    case Some(esq) =>
                      val payload = (request.body \ "question").get
                      val questionBody =
                        JsonDeserializer.deserialize(classOf[Question], toJacksonJson(payload))

                      questionService.validate(questionBody, payload) match
                        case Some(error) => Future.successful(error)
                        case None =>
                          questionBody.options.asScala
                            .filter(o => Option(o.id).forall(_ == 0))
                            .foreach(o => o.id = CollaborativeExamProcessingService.newId())

                          updateExamQuestion(esq, questionBody)
                          esq.options.asScala.foreach(o =>
                            o.id = CollaborativeExamProcessingService.newId()
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
    section.lotteryItemCount = 1
    section.sectionQuestions = Set.empty[ExamSectionQuestion].asJava
    section.sequenceNumber = exam.examSections.size()
    section.expanded = true
    section.id = CollaborativeExamProcessingService.newId()
    CollaborativeExamProcessingService.cleanUser(user)
    section.setCreatorWithDate(user)
    section

  // Helper to convert Play JSON to Jackson JSON (for models that still use Jackson)
