// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl

import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.file.ChunkMaker
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.attachment.Attachment
import models.exam.Exam
import models.iop.ExternalExam
import models.questions.EssayAnswer
import models.sections.ExamSectionQuestion
import models.user.Role
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{FileIO, Source}
import org.apache.pekko.util.ByteString
import play.api.Logging
import play.api.libs.Files.TemporaryFile
import play.api.libs.ws.{WSBodyWritables, WSClient}
import play.api.mvc.*
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction

import java.net.{URI, URL, URLEncoder}
import java.nio.charset.StandardCharsets
import java.util.Base64
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.util.Try

class ExternalAttachmentController @Inject() (
    wsClient: WSClient,
    configReader: ConfigReader,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext, mat: Materializer)
    extends BaseController
    with JavaApiHelper
    with DbApiHelper
    with WSBodyWritables
    with Logging:

  // Helper methods
  private def getExternalExam(id: String, request: Request[?]): Option[ExternalExam] =
    val user       = request.attrs(Auth.ATTR_USER)
    val query      = DB.find(classOf[ExternalExam]).where().eq("hash", id)
    val finalQuery = if user.hasRole(Role.Name.STUDENT) then query.eq("creator", user) else query
    finalQuery.find

  private def getExam(externalExam: ExternalExam): Option[Exam] =
    Try(externalExam.deserialize()).toOption match
      case Some(exam) => Some(exam)
      case None =>
        logger.error("Can not deserialize external exam!")
        None

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
    parseAttachmentUrl("/api/attachments/%s/download", id) match
      case None => Future.successful(InternalServerError)
      case Some(attachmentUrl) =>
        wsClient.url(attachmentUrl.toString).stream().map { response =>
          if response.status != OK then Status(response.status)
          else
            // Use RFC 5987 format for Content-Disposition header with UTF-8 encoding
            val escapedName        = URLEncoder.encode(fileName, StandardCharsets.UTF_8)
            val contentDisposition = s"""attachment; filename*=UTF-8''"$escapedName""""

            // Chunk the stream into 3KB chunks and encode each chunk as base64
            val chunkSize = 3 * 1024 // 3KB
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

  private def parseAttachmentUrl(format: String, args: String*): Option[URL] =
    val path = if args.isEmpty then format else format.format(args*)
    Try(URI.create(configReader.getIopHost + path).toURL).toOption match
      case None =>
        logger.error(s"Malformed URL: ${configReader.getIopHost}$path")
        None
      case some => some

  private def findSectionQuestion(qid: Long, exam: Exam): Option[ExamSectionQuestion] =
    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .find(_.getId == qid)

  private def findEssayAnswerWithAttachment(sq: ExamSectionQuestion): Option[EssayAnswer] =
    Option(sq.getEssayAnswer) match
      case Some(ea) if Option(ea.getAttachment).flatMap(a => Option(a.getExternalId)).exists(_.nonEmpty) =>
        Some(ea)
      case _ => None

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

  private def uploadAttachmentToExternalService(
      filePart: MultipartFormData.FilePart[play.api.libs.Files.TemporaryFile],
      existingExternalId: Option[String]
  ): Future[Option[Attachment]] =
    existingExternalId match
      case Some(id) if id.nonEmpty =>
        // Update existing attachment
        parseAttachmentUrl("/api/attachments/%s", id) match
          case None => Future.successful(None)
          case Some(url) =>
            val request = wsClient.url(url.toString)
            val source  = createMultipartSource(filePart)
            request.put(source).map { response =>
              if response.status != OK then
                logger.error("Could not update external attachment to XM server!")
                None
              else
                val json         = response.json
                val attachmentId = (json \ "id").as[String]
                val mimeType     = (json \ "mimeType").as[String]
                val displayName  = (json \ "displayName").as[String]
                val attachment   = new Attachment()
                attachment.setExternalId(attachmentId)
                attachment.setMimeType(mimeType)
                attachment.setFileName(displayName)
                Some(attachment)
            }
      case _ =>
        // Create new attachment - POST directly with multipart data
        parseAttachmentUrl("/api/attachments/") match
          case None => Future.successful(None)
          case Some(url) =>
            val request = wsClient.url(url.toString)
            val source  = createMultipartSource(filePart)
            request.post(source).map { response =>
              if response.status != CREATED && response.status != OK then
                logger.error("Could not create external attachment to XM server!")
                None
              else
                val json        = response.json
                val id          = (json \ "id").as[String]
                val mimeType    = (json \ "mimeType").as[String]
                val displayName = (json \ "displayName").as[String]
                val attachment  = new Attachment()
                attachment.setExternalId(id)
                attachment.setMimeType(mimeType)
                attachment.setFileName(displayName)
                Some(attachment)
            }

  // Route methods
  def downloadExamAttachment(hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.STUDENT))).async { request =>
      getExternalExam(hash, request) match
        case None => Future.successful(NotFound)
        case Some(externalExam) =>
          getExam(externalExam) match
            case None => Future.successful(InternalServerError("Could not deserialize exam"))
            case Some(exam) =>
              Option(exam.getAttachment) match
                case None => Future.successful(NotFound)
                case Some(attachment) =>
                  downloadExternalAttachment(attachment)
    }

  def downloadQuestionAttachment(hash: String, qid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.STUDENT))).async { request =>
      getExternalExam(hash, request) match
        case None => Future.successful(NotFound)
        case Some(externalExam) =>
          getExam(externalExam) match
            case None       => Future.successful(InternalServerError("Could not deserialize exam"))
            case Some(exam) =>
              // Find the section question
              exam.getExamSections.asScala
                .flatMap(_.getSectionQuestions.asScala)
                .find(_.getId == qid) match
                case None => Future.successful(NotFound)
                case Some(sq) =>
                  Option(sq.getQuestion.getAttachment) match
                    case None => Future.successful(NotFound)
                    case Some(attachment) =>
                      downloadExternalAttachment(attachment)
    }

  def addAttachmentToQuestionAnswer(): Action[MultipartFormData[TemporaryFile]] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))).async(parse.multipartFormData) {
      request =>
        val formData      = request.body.asFormUrlEncoded
        val examHashOpt   = formData.get("examId").flatMap(_.headOption)
        val questionIdOpt = formData.get("questionId").flatMap(_.headOption)

        (examHashOpt, questionIdOpt) match
          case (Some(examHash), Some(questionIdStr)) =>
            val questionId = questionIdStr.toLong
            getExternalExam(examHash, request) match
              case None => Future.successful(NotFound)
              case Some(externalExam) =>
                getExam(externalExam) match
                  case None => Future.successful(InternalServerError("Could not deserialize exam"))
                  case Some(exam) =>
                    findSectionQuestion(questionId, exam) match
                      case None => Future.successful(NotFound)
                      case Some(sq) =>
                        if Option(sq.getEssayAnswer).isEmpty then sq.setEssayAnswer(new EssayAnswer())
                        request.body.file("file") match
                          case None => Future.successful(BadRequest("Missing file"))
                          case Some(filePart) =>
                            val existingExternalId = Option(sq.getEssayAnswer.getAttachment).map(_.getExternalId)
                            uploadAttachmentToExternalService(filePart, existingExternalId).flatMap {
                              case None => Future.successful(InternalServerError)
                              case Some(attachment) =>
                                sq.getEssayAnswer.setAttachment(attachment)
                                Try(externalExam.serialize(exam)) match
                                  case scala.util.Failure(e) =>
                                    logger.error("Failed to serialize exam", e)
                                    Future.successful(InternalServerError)
                                  case scala.util.Success(_) =>
                                    Future.successful(Created(attachment.asJson))
                            }
          case _ => Future.successful(BadRequest("Missing examId or questionId"))
    }

  def deleteQuestionAnswerAttachment(qid: Long, hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))).async { request =>
      getExternalExam(hash, request) match
        case None => Future.successful(NotFound)
        case Some(externalExam) =>
          getExam(externalExam) match
            case None => Future.successful(InternalServerError("Could not deserialize exam"))
            case Some(exam) =>
              findSectionQuestion(qid, exam) match
                case None => Future.successful(NotFound)
                case Some(sq) =>
                  findEssayAnswerWithAttachment(sq) match
                    case None => Future.successful(NotFound)
                    case Some(ea) =>
                      val attachment = ea.getAttachment
                      Option(attachment.getExternalId).filter(_.nonEmpty) match
                        case None =>
                          logger.warn(s"External id can not be found for attachment [id=${attachment.getId}]")
                          Future.successful(NotFound)
                        case Some(externalId) =>
                          parseAttachmentUrl("/api/attachments/%s", externalId) match
                          case None => Future.successful(InternalServerError)
                          case Some(url) =>
                            wsClient.url(url.toString).delete().flatMap { response =>
                              if response.status != OK && response.status != NOT_FOUND then
                                Future.successful(Status(response.status))
                              else
                                ea.setAttachment(null)
                                Try(externalExam.serialize(exam)) match
                                  case scala.util.Failure(e) =>
                                    logger.error("Failed to serialize exam", e)
                                    Future.successful(InternalServerError)
                                  case scala.util.Success(_) =>
                                    Future.successful(Ok)
                            }
    }

  def downloadQuestionAnswerAttachment(qid: Long, hash: String): Action[AnyContent] =
    Action { _ => NotAcceptable }
