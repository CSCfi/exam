// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

import io.ebean.DB
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.attachment.Attachment
import models.exam.Exam
import models.iop.ExternalExam
import models.questions.EssayAnswer
import models.sections.ExamSectionQuestion
import models.user.{Role, User}
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{FileIO, Source}
import org.apache.pekko.util.ByteString
import play.api.Logging
import play.api.libs.Files.TemporaryFile
import play.api.libs.json.JsValue
import play.api.libs.ws.{WSBodyWritables, WSClient}
import play.api.mvc.MultipartFormData
import services.config.ConfigReader
import services.file.ChunkMaker

import java.net.{URI, URL, URLEncoder}
import java.nio.charset.StandardCharsets
import java.util.Base64
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._
import scala.util.Try

class ExternalAttachmentService @Inject() (
    wsClient: WSClient,
    configReader: ConfigReader
)(implicit ec: ExecutionContext, mat: Materializer)
    extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with WSBodyWritables
    with Logging:

  def getExternalExam(id: String, user: User): Option[ExternalExam] =
    val query      = DB.find(classOf[ExternalExam]).where().eq("hash", id)
    val finalQuery = if user.hasRole(Role.Name.STUDENT) then query.eq("creator", user) else query
    finalQuery.find

  def getExam(externalExam: ExternalExam): Either[ExternalAttachmentError, Exam] =
    Try(externalExam.deserialize()).toOption match
      case Some(exam) => Right(exam)
      case None =>
        logger.error("Can not deserialize external exam!")
        Left(ExternalAttachmentError.CouldNotDeserializeExam)

  def downloadExamAttachment(
      hash: String,
      user: User
  ): Future[Either[ExternalAttachmentError, DownloadResponse]] =
    getExternalExam(hash, user) match
      case None => Future.successful(Left(ExternalAttachmentError.ExternalExamNotFound))
      case Some(externalExam) =>
        getExam(externalExam) match
          case Left(error) => Future.successful(Left(error))
          case Right(exam) =>
            Option(exam.getAttachment) match
              case None => Future.successful(Left(ExternalAttachmentError.AttachmentNotFound))
              case Some(attachment) =>
                downloadExternalAttachment(attachment).map(Right.apply)

  def downloadQuestionAttachment(
      hash: String,
      qid: Long,
      user: User
  ): Future[Either[ExternalAttachmentError, DownloadResponse]] =
    getExternalExam(hash, user) match
      case None => Future.successful(Left(ExternalAttachmentError.ExternalExamNotFound))
      case Some(externalExam) =>
        getExam(externalExam) match
          case Left(error) => Future.successful(Left(error))
          case Right(exam) =>
            exam.getExamSections.asScala
              .flatMap(_.getSectionQuestions.asScala)
              .find(_.getId == qid) match
              case None => Future.successful(Left(ExternalAttachmentError.SectionQuestionNotFound))
              case Some(sq) =>
                Option(sq.getQuestion.getAttachment) match
                  case None => Future.successful(Left(ExternalAttachmentError.AttachmentNotFound))
                  case Some(attachment) =>
                    downloadExternalAttachment(attachment).map(Right.apply)

  def addAttachmentToQuestionAnswer(
      hash: String,
      questionId: Long,
      filePart: Option[MultipartFormData.FilePart[TemporaryFile]],
      user: User
  ): Future[Either[ExternalAttachmentError, (JsValue, ExternalExam)]] =
    filePart match
      case None => Future.successful(Left(ExternalAttachmentError.MissingFile))
      case Some(file) =>
        getExternalExam(hash, user) match
          case None => Future.successful(Left(ExternalAttachmentError.ExternalExamNotFound))
          case Some(externalExam) =>
            getExam(externalExam) match
              case Left(error) => Future.successful(Left(error))
              case Right(exam) =>
                findSectionQuestion(questionId, exam) match
                  case None =>
                    Future.successful(Left(ExternalAttachmentError.SectionQuestionNotFound))
                  case Some(sq) =>
                    if Option(sq.getEssayAnswer).isEmpty then sq.setEssayAnswer(new EssayAnswer())
                    val existingExternalId =
                      Option(sq.getEssayAnswer.getAttachment).map(_.getExternalId)
                    uploadAttachmentToExternalService(file, existingExternalId).flatMap {
                      case None =>
                        Future.successful(Left(ExternalAttachmentError.ExternalIdNotFound))
                      case Some(attachment) =>
                        sq.getEssayAnswer.setAttachment(attachment)
                        Try(externalExam.serialize(exam)) match
                          case scala.util.Failure(e) =>
                            logger.error("Failed to serialize exam", e)
                            Future.successful(Left(ExternalAttachmentError.CouldNotDeserializeExam))
                          case scala.util.Success(_) =>
                            Future.successful(Right((attachment.asJson, externalExam)))
                    }

  def deleteQuestionAnswerAttachment(
      hash: String,
      qid: Long,
      user: User
  ): Future[Either[ExternalAttachmentError, ExternalExam]] =
    getExternalExam(hash, user) match
      case None => Future.successful(Left(ExternalAttachmentError.ExternalExamNotFound))
      case Some(externalExam) =>
        getExam(externalExam) match
          case Left(error) => Future.successful(Left(error))
          case Right(exam) =>
            findSectionQuestion(qid, exam) match
              case None => Future.successful(Left(ExternalAttachmentError.SectionQuestionNotFound))
              case Some(sq) =>
                findEssayAnswerWithAttachment(sq) match
                  case None =>
                    Future.successful(Left(ExternalAttachmentError.QuestionAnswerNotFound))
                  case Some(ea) =>
                    val attachment = ea.getAttachment
                    Option(attachment.getExternalId).filter(_.nonEmpty) match
                      case None =>
                        logger.warn(
                          s"External id can not be found for attachment [id=${attachment.getId}]"
                        )
                        Future.successful(Left(ExternalAttachmentError.ExternalIdNotFound))
                      case Some(externalId) =>
                        parseAttachmentUrl("/api/attachments/%s", externalId) match
                          case None =>
                            Future.successful(Left(ExternalAttachmentError.ExternalIdNotFound))
                          case Some(url) =>
                            wsClient.url(url.toString).delete().flatMap { response =>
                              if response.status != play.api.http.Status.OK && response.status != play.api.http.Status.NOT_FOUND
                              then
                                Future.successful(Left(ExternalAttachmentError.ExternalIdNotFound))
                              else
                                ea.setAttachment(null)
                                Try(externalExam.serialize(exam)) match
                                  case scala.util.Failure(e) =>
                                    logger.error("Failed to serialize exam", e)
                                    Future.successful(
                                      Left(ExternalAttachmentError.CouldNotDeserializeExam)
                                    )
                                  case scala.util.Success(_) =>
                                    Future.successful(Right(externalExam))
                            }

  private def downloadExternalAttachment(attachment: Attachment): Future[DownloadResponse] =
    Option(attachment) match
      case None => Future.successful(DownloadResponse.NotFound)
      case Some(att) =>
        Option(att.getExternalId).filter(_.nonEmpty) match
          case None =>
            logger.warn(s"External id can not be found for attachment [id=${att.getId}]")
            Future.successful(DownloadResponse.NotFound)
          case Some(externalId) =>
            downloadAttachment(externalId, att.getMimeType, att.getFileName)

  private def downloadAttachment(
      id: String,
      mimeType: String,
      fileName: String
  ): Future[DownloadResponse] =
    parseAttachmentUrl("/api/attachments/%s/download", id) match
      case None => Future.successful(DownloadResponse.InternalServerError)
      case Some(attachmentUrl) =>
        wsClient.url(attachmentUrl.toString).stream().map { response =>
          if response.status != play.api.http.Status.OK then DownloadResponse.Error(response.status)
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

            DownloadResponse.Success(
              base64Stream,
              mimeType,
              Map("Content-Disposition" -> contentDisposition)
            )
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
      case Some(ea)
          if Option(ea.getAttachment).flatMap(a => Option(a.getExternalId)).exists(_.nonEmpty) =>
        Some(ea)
      case _ => None

  private def createMultipartSource(
      filePart: MultipartFormData.FilePart[TemporaryFile]
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
      filePart: MultipartFormData.FilePart[TemporaryFile],
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
              if response.status != play.api.http.Status.OK then
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
              if response.status != play.api.http.Status.CREATED && response.status != play.api.http.Status.OK
              then
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
