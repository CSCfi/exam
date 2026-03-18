// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.DB
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
import security.BlockingIOExecutionContext
import services.config.ConfigReader

import java.net.{URI, URL, URLEncoder}
import java.nio.charset.StandardCharsets
import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.Try

class ExternalAttachmentService @Inject() (
    wsClient: WSClient,
    configReader: ConfigReader
)(implicit ec: BlockingIOExecutionContext, mat: Materializer)
    extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with WSBodyWritables
    with Logging:

  def getExternalExam(id: String, user: User): Option[ExternalExam] =
    val query      = DB.find(classOf[ExternalExam]).where().eq("hash", id)
    val finalQuery = if user.hasRole(Role.Name.STUDENT) then query.eq("creator", user) else query
    finalQuery.find

  def getExam(externalExam: ExternalExam): Either[ExternalAttachmentError, Exam] =
    Try(externalExam.deserialize).toOption match
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
            Option(exam.attachment) match
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
            exam.examSections.asScala
              .flatMap(_.sectionQuestions.asScala)
              .find(_.id == qid) match
              case None => Future.successful(Left(ExternalAttachmentError.SectionQuestionNotFound))
              case Some(sq) =>
                Option(sq.question.attachment) match
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
                    if Option(sq.essayAnswer).isEmpty then sq.essayAnswer = new EssayAnswer()
                    val existingExternalId =
                      Option(sq.essayAnswer.attachment).map(_.externalId)
                    uploadAttachmentToExternalService(file, existingExternalId).flatMap {
                      case None =>
                        Future.successful(Left(ExternalAttachmentError.ExternalIdNotFound))
                      case Some(attachment) =>
                        sq.essayAnswer.attachment = attachment
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
                    val attachment = ea.attachment
                    Option(attachment.externalId).filter(_.nonEmpty) match
                      case None =>
                        logger.warn(
                          s"External id can not be found for attachment [id=${attachment.id}]"
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
                                ea.attachment = null
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
        Option(att.externalId).filter(_.nonEmpty) match
          case None =>
            logger.warn(s"External id can not be found for attachment [id=${att.id}]")
            Future.successful(DownloadResponse.NotFound)
          case Some(externalId) =>
            downloadAttachment(externalId, att.mimeType, att.fileName)

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
            val escapedName        = URLEncoder.encode(fileName, StandardCharsets.UTF_8)
            val contentDisposition = s"""attachment; filename*=UTF-8''"$escapedName""""
            DownloadResponse.Success(
              response.bodyAsSource,
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
    exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .find(_.id == qid)

  private def findEssayAnswerWithAttachment(sq: ExamSectionQuestion): Option[EssayAnswer] =
    Option(sq.essayAnswer) match
      case Some(ea)
          if Option(ea.attachment).flatMap(a => Option(a.externalId)).exists(_.nonEmpty) =>
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
                attachment.externalId = attachmentId
                attachment.mimeType = mimeType
                attachment.fileName = displayName
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
                attachment.externalId = id
                attachment.mimeType = mimeType
                attachment.fileName = displayName
                Some(attachment)
            }
