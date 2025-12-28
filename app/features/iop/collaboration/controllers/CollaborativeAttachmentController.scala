// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.controllers

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.iop.collaboration.services.{
  CollaborativeExamLoaderService,
  CollaborativeExamService
}
import models.attachment.{Attachment, AttachmentContainer}
import models.exam.Exam
import models.iop.CollaborativeExam
import models.questions.EssayAnswer
import models.sections.ExamSectionQuestion
import models.user.{Role, User}
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{FileIO, Source}
import org.apache.pekko.util.ByteString
import play.api.Logging
import play.api.libs.Files.TemporaryFile
import play.api.libs.json.*
import play.api.libs.ws.WSClient
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import services.config.ConfigReader
import services.file.ChunkMaker
import system.AuditedAction

import java.net.{URI, URL, URLEncoder}
import java.nio.charset.StandardCharsets
import java.util.Base64
import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.Try

class CollaborativeAttachmentController @Inject() (
    wsClient: WSClient,
    examLoader: CollaborativeExamLoaderService,
    configReader: ConfigReader,
    collaborativeExamService: CollaborativeExamService,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: BlockingIOExecutionContext, mat: Materializer)
    extends BaseController
    with EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  private val SafeNumber = Math.pow(2, 53).toLong - 1

  private def parseUrl(format: String, args: String*): Option[URL] =
    val url = s"${configReader.getIopHost}${format.format(args*)}"
    Try(URI.create(url).toURL).toOption match
      case None =>
        logger.error(s"Malformed URL: $url")
        None
      case some => some

  private def getExternalExam(eid: Long): Future[Option[CollaborativeExam]] =
    collaborativeExamService.findById(eid)

  private def getExternalId(assessment: JsValue): String =
    (assessment \ "exam" \ "examFeedback" \ "attachment" \ "externalId").asOpt[String].getOrElse("")

  private def createMultipartSource(
      filePart: MultipartFormData.FilePart[play.api.libs.Files.TemporaryFile]
  ): Source[MultipartFormData.Part[Source[ByteString, ?]], ?] =
    val source = FileIO.fromPath(filePart.ref.path)
    val part = MultipartFormData.FilePart(
      filePart.key,
      filePart.filename,
      filePart.contentType,
      source
    )
    Source.single(part)

  private def uploadAssessmentAttachment(
      filePart: MultipartFormData.FilePart[play.api.libs.Files.TemporaryFile],
      assessment: JsValue
  ): Future[Option[JsValue]] =
    val externalId = getExternalId(assessment)
    parseUrl("/api/attachments/%s", externalId) match
      case None => Future.successful(None)
      case Some(url) =>
        val request = wsClient.url(url.toString)
        val source  = createMultipartSource(filePart)

        val responseFuture =
          if externalId.isBlank then request.post(source) else request.put(source)

        responseFuture.flatMap { response =>
          if response.status != CREATED && response.status != OK then Future.successful(None)
          else
            val root        = response.json
            val newId       = (root \ "id").as[String]
            val mimeType    = (root \ "mimeType").as[String]
            val displayName = (root \ "displayName").as[String]

            val feedbackPath = assessment \ "exam" \ "examFeedback"
            feedbackPath.asOpt[JsObject] match
              case Some(feedback) =>
                val attachment = Json.obj(
                  "externalId" -> newId,
                  "mimeType"   -> mimeType,
                  "fileName"   -> displayName
                )
                val updatedFeedback = feedback + ("attachment" -> attachment)
                val updatedExam =
                  (assessment \ "exam").as[JsObject] + ("examFeedback" -> updatedFeedback)
                val updatedAssessment = assessment.as[JsObject] + ("exam" -> updatedExam)
                Future.successful(Some(updatedAssessment))
              case None =>
                Future.successful(None)
        }

  private def removeAssessmentAttachment(assessment: JsValue): Future[Result] =
    val externalId = getExternalId(assessment)
    parseUrl("/api/attachments/%s", externalId) match
      case None => Future.successful(InternalServerError)
      case Some(url) =>
        val request = wsClient.url(url.toString)
        request.delete().map { response =>
          if response.status == OK then Ok else InternalServerError
        }

  private def downloadExternalAttachment(attachment: Attachment): Future[Result] =
    Option(attachment) match
      case None => Future.successful(NotFound)
      case Some(att) =>
        Option(att.getExternalId).filter(_.nonEmpty) match
          case None =>
            logger.warn(s"External id can not be found for attachment [id=${att.getId}]")
            Future.successful(NotFound)
          case Some(externalId) =>
            downloadAttachment(externalId, att.getMimeType, att.getFileName)

  private def downloadAttachment(id: String, mimeType: String, fileName: String): Future[Result] =
    parseUrl("/api/attachments/%s/download", id) match
      case None => Future.successful(InternalServerError)
      case Some(url) =>
        wsClient.url(url.toString).stream().map { response =>
          if response.status != OK then Status(response.status)
          else
            // Use RFC 5987 format for Content-Disposition header with UTF-8 encoding
            val escapedName        = URLEncoder.encode(fileName, StandardCharsets.UTF_8)
            val contentDisposition = s"""attachment; filename*=UTF-8''"$escapedName""""

            // Chunk the stream into 3KB chunks and encode each chunk as base64
            val chunkSize = 3 * 1024
            val base64Stream = response.bodyAsSource
              .via(new ChunkMaker(chunkSize))
              .map { byteString =>
                val encoded = Base64.getEncoder.encode(byteString.toArray)
                ByteString.fromArray(encoded)
              }

            Ok.chunked(base64Stream)
              .as(mimeType)
              .withHeaders("Content-Disposition" -> contentDisposition)
        }

  def downloadExamAttachment(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))).async { _ =>
      getExternalExam(id).flatMap {
        case None => Future.successful(NotFound)
        case Some(ce) =>
          examLoader.downloadExam(ce).flatMap {
            case None => Future.successful(NotFound)
            case Some(exam) =>
              val attachment = exam.getAttachment
              downloadExternalAttachment(attachment)
          }
      }
    }

  private def updateExternalAssessment(
      examId: Long,
      assessmentRef: String
  ): Action[MultipartFormData[play.api.libs.Files.TemporaryFile]] = Action
    .andThen(audited)
    .async(parse.multipartFormData) { request =>
      getExternalExam(examId).flatMap {
        case None => Future.successful(NotFound)
        case Some(exam) =>
          examLoader.downloadAssessment(exam.getExternalRef, assessmentRef).flatMap {
            case None => Future.successful(NotFound)
            case Some(assessment) =>
              request.body.file("file") match
                case None => Future.successful(BadRequest("Missing file"))
                case Some(filePart) =>
                  uploadAssessmentAttachment(filePart, assessment).flatMap {
                    case None => Future.successful(InternalServerError)
                    case Some(updatedAssessment) =>
                      val attachmentJson =
                        updatedAssessment \ "exam" \ "examFeedback" \ "attachment"

                      examLoader.uploadAssessment(exam, assessmentRef, updatedAssessment).map {
                        case Some(revision) =>
                          val result = attachmentJson.as[JsObject] + ("rev" -> JsString(revision))
                          Ok(result)
                        case None =>
                          InternalServerError
                      }
                  }
          }
      }
    }

  private def deleteExternalAssessment(examId: Long, assessmentRef: String): Action[AnyContent] =
    Action.async { _ =>
      getExternalExam(examId).flatMap {
        case None => Future.successful(NotFound)
        case Some(exam) =>
          examLoader.downloadAssessment(exam.getExternalRef, assessmentRef).flatMap {
            case None => Future.successful(NotFound)
            case Some(assessment) =>
              removeAssessmentAttachment(assessment).flatMap { result =>
                if result.header.status != OK then Future.successful(InternalServerError)
                else
                  // Remove attachment field from feedback
                  val feedbackPath = assessment \ "exam" \ "examFeedback"
                  feedbackPath.asOpt[JsObject] match
                    case Some(feedback) =>
                      val updatedFeedback = feedback - "attachment"
                      val updatedExam =
                        (assessment \ "exam").as[JsObject] + ("examFeedback" -> updatedFeedback)
                      val updatedAssessment = assessment.as[JsObject] + ("exam" -> updatedExam)

                      examLoader.uploadAssessment(exam, assessmentRef, updatedAssessment).map {
                        case Some(revision) => Ok(Json.obj("rev" -> revision))
                        case None           => InternalServerError
                      }
                    case None =>
                      Future.successful(InternalServerError)
              }
          }
      }
    }

  // Assessment attachment methods - these call updateExternalAssessment/deleteExternalAssessment
  def addAssessmentAttachment(
      id: Long,
      ref: String
  ): Action[MultipartFormData[play.api.libs.Files.TemporaryFile]] =
    updateExternalAssessment(id, ref)

  def deleteAssessmentAttachment(id: Long, ref: String): Action[AnyContent] =
    deleteExternalAssessment(id, ref)

  // Helper methods for question and answer attachments
  private def findSectionQuestion(qid: Long, exam: Exam): Option[ExamSectionQuestion] =
    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .find(_.getId == qid)

  private def findEssayAnswerWithAttachment(esq: ExamSectionQuestion): Option[EssayAnswer] =
    Option(esq.getEssayAnswer) match
      case Some(ea)
          if Option(ea.getAttachment).flatMap(a => Option(a.getExternalId)).exists(_.nonEmpty) =>
        Some(ea)
      case _ => None

  private def uploadAttachment(
      filePart: MultipartFormData.FilePart[play.api.libs.Files.TemporaryFile],
      ce: CollaborativeExam,
      exam: Exam,
      container: AttachmentContainer,
      user: User
  ): Future[Result] =
    val externalId = Option(container.getAttachment).map(_.getExternalId).orNull
    parseUrl("/api/attachments/%s", Option(externalId).getOrElse("")) match
      case None => Future.successful(InternalServerError)
      case Some(url) =>
        val request = wsClient.url(url.toString)
        val source  = createMultipartSource(filePart)

        val responseFuture =
          if externalId == null || externalId.isBlank then request.post(source)
          else request.put(source)

        responseFuture.flatMap { response =>
          if response.status != CREATED && response.status != OK then
            logger.error("Could not create external attachment to XM server!")
            Future.successful(Status(response.status))
          else
            val json        = response.json
            val id          = (json \ "id").as[String]
            val mimeType    = (json \ "mimeType").as[String]
            val displayName = (json \ "displayName").as[String]

            val attachment = new Attachment()
            attachment.setExternalId(id)
            attachment.setMimeType(mimeType)
            attachment.setFileName(displayName)
            container.setAttachment(attachment)

            // Update exam using examLoader
            examLoader.uploadExam(ce, exam, user).map { result =>
              if result.header.status == OK then Created(attachment.asJson).as("application/json")
              else InternalServerError
            }
        }

  private def deleteExternalAttachment(
      container: AttachmentContainer,
      ce: CollaborativeExam,
      exam: Exam,
      user: User
  ): Future[Result] =
    Option(container.getAttachment) match
      case None => Future.successful(NotFound)
      case Some(attachment) =>
        val externalId = attachment.getExternalId
        if externalId == null || externalId.isBlank then
          logger.warn(
            s"External id can not be found for attachment [id=${attachment.getExternalId}]"
          )
          Future.successful(NotFound)
        else
          parseUrl("/api/attachments/%s", externalId) match
            case None => Future.successful(InternalServerError)
            case Some(url) =>
              wsClient.url(url.toString).delete().flatMap { response =>
                if response.status != OK && response.status != NOT_FOUND then
                  Future.successful(Status(response.status))
                else
                  container.setAttachment(null)
                  examLoader.uploadExam(ce, exam, user).map { result =>
                    if result.header.status == OK then Ok
                    else InternalServerError
                  }
              }

  // Stub methods for routes that aren't fully implemented for collaborative exams
  def downloadExternalAttachment(id: String): Action[AnyContent] =
    Action { _ => Results.NotImplemented }

  def addAttachmentToQuestion(): Action[MultipartFormData[play.api.libs.Files.TemporaryFile]] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
      .async(parse.multipartFormData) { request =>
        val formData      = request.body.asFormUrlEncoded
        val examIdOpt     = formData.get("examId").flatMap(_.headOption)
        val questionIdOpt = formData.get("questionId").flatMap(_.headOption)

        (examIdOpt, questionIdOpt) match
          case (Some(examIdStr), Some(questionIdStr)) =>
            val examId     = examIdStr.toLong
            val questionId = questionIdStr.toLong

            getExternalExam(examId).flatMap {
              case None => Future.successful(NotFound)
              case Some(ce) =>
                examLoader.downloadExam(ce).flatMap {
                  case None => Future.successful(NotFound)
                  case Some(exam) =>
                    findSectionQuestion(questionId, exam) match
                      case None => Future.successful(NotFound)
                      case Some(sq) =>
                        request.body.file("file") match
                          case None => Future.successful(BadRequest("Missing file"))
                          case Some(filePart) =>
                            val user = request.attrs(Auth.ATTR_USER)
                            uploadAttachment(filePart, ce, exam, sq.getQuestion, user)
                }
            }
          case _ => Future.successful(BadRequest("Missing examId or questionId"))
      }

  def deleteQuestionAttachment(eid: Long, qid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))).async { request =>
      getExternalExam(eid).flatMap {
        case None => Future.successful(NotFound)
        case Some(ce) =>
          examLoader.downloadExam(ce).flatMap {
            case None => Future.successful(NotFound)
            case Some(exam) =>
              findSectionQuestion(qid, exam) match
                case None => Future.successful(NotFound)
                case Some(sq) =>
                  val user = request.attrs(Auth.ATTR_USER)
                  deleteExternalAttachment(sq.getQuestion, ce, exam, user)
          }
      }
    }

  def downloadQuestionAttachment(eid: Long, qid: Long): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.STUDENT))
    ).async { _ =>
      getExternalExam(eid).flatMap {
        case None => Future.successful(NotFound)
        case Some(ce) =>
          examLoader.downloadExam(ce).flatMap {
            case None => Future.successful(NotFound)
            case Some(exam) =>
              findSectionQuestion(qid, exam) match
                case None => Future.successful(NotFound)
                case Some(sq) =>
                  val attachment = sq.getQuestion.getAttachment
                  downloadExternalAttachment(attachment)
          }
      }
    }

  def addAttachmentToQuestionAnswer()
      : Action[MultipartFormData[play.api.libs.Files.TemporaryFile]] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))).async(
      parse.multipartFormData
    ) {
      request =>
        val formData      = request.body.asFormUrlEncoded
        val examIdOpt     = formData.get("examId").flatMap(_.headOption)
        val questionIdOpt = formData.get("questionId").flatMap(_.headOption)

        (examIdOpt, questionIdOpt) match
          case (Some(examIdStr), Some(questionIdStr)) =>
            val examId     = examIdStr.toLong
            val questionId = questionIdStr.toLong

            getExternalExam(examId).flatMap {
              case None => Future.successful(NotFound)
              case Some(ce) =>
                examLoader.downloadExam(ce).flatMap {
                  case None => Future.successful(NotFound)
                  case Some(exam) =>
                    findSectionQuestion(questionId, exam) match
                      case None => Future.successful(NotFound)
                      case Some(sq) =>
                        if sq.getEssayAnswer == null then sq.setEssayAnswer(new EssayAnswer())
                        request.body.file("file") match
                          case None => Future.successful(BadRequest("Missing file"))
                          case Some(filePart) =>
                            val user = request.attrs(Auth.ATTR_USER)
                            uploadAttachment(filePart, ce, exam, sq.getEssayAnswer, user)
                }
            }
          case _ => Future.successful(BadRequest("Missing examId or questionId"))
    }

  def deleteQuestionAnswerAttachment(qid: Long, eid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))).async { request =>
      getExternalExam(eid).flatMap {
        case None => Future.successful(NotFound)
        case Some(ce) =>
          examLoader.downloadExam(ce).flatMap {
            case None => Future.successful(NotFound)
            case Some(exam) =>
              findSectionQuestion(qid, exam) match
                case None => Future.successful(NotFound)
                case Some(sq) =>
                  findEssayAnswerWithAttachment(sq) match
                    case None => Future.successful(NotFound)
                    case Some(ea) =>
                      val user = request.attrs(Auth.ATTR_USER)
                      deleteExternalAttachment(ea, ce, exam, user)
          }
      }
    }

  def downloadQuestionAnswerAttachment(qid: Long, eid: Long): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.STUDENT))
    ).async { _ =>
      getExternalExam(eid).flatMap {
        case None => Future.successful(NotFound)
        case Some(ce) =>
          examLoader.downloadExam(ce).flatMap {
            case None => Future.successful(NotFound)
            case Some(exam) =>
              findSectionQuestion(qid, exam) match
                case None => Future.successful(NotFound)
                case Some(sq) =>
                  findEssayAnswerWithAttachment(sq) match
                    case None => Future.successful(NotFound)
                    case Some(ea) =>
                      val attachment = ea.getAttachment
                      downloadExternalAttachment(attachment)
          }
      }
    }

  def addAttachmentToExam(): Action[MultipartFormData[TemporaryFile]] =
    Action.andThen(audited)(parse.multipartFormData) { _ => Results.NotImplemented }

  def deleteExamAttachment(id: Long): Action[AnyContent] =
    Action { _ => Results.NotImplemented }

  def addStatementAttachment(id: Long): Action[MultipartFormData[TemporaryFile]] =
    Action.andThen(audited)(parse.multipartFormData) { _ => Results.NotImplemented }

  def deleteStatementAttachment(id: Long): Action[AnyContent] =
    Action { _ => Results.NotImplemented }

  def downloadStatementAttachment(id: Long): Action[AnyContent] =
    Action { _ => Results.NotImplemented }
