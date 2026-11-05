// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

import cats.data.EitherT
import database.EbeanPaths.path
import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.iop.transfer.services.ExternalAttachmentError.*
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
import play.api.http.Status
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
    val query = DB.find(classOf[ExternalExam]).where().eq(path[ExternalExam]("hash"), id)
    val finalQuery = if user.hasRole(Role.Name.STUDENT) then
      query.eq(path[ExternalExam]("creator"), user)
    else query
    finalQuery.find

  def getExam(externalExam: ExternalExam): Either[ExternalAttachmentError, Exam] =
    Try(externalExam.deserialize).toOption match
      case Some(exam) => Right(exam)
      case None =>
        logger.error("Can not deserialize external exam!")
        Left(CouldNotDeserializeExam)

  def downloadExamAttachment(
      hash: String,
      user: User
  ): Future[Either[ExternalAttachmentError, DownloadResponse]] =
    (for
      (_, exam)  <- EitherT.fromEither[Future](loadExam(hash, user))
      attachment <- EitherT.fromOption[Future](Option(exam.attachment), AttachmentNotFound)
      response   <- EitherT.liftF(downloadExternalAttachment(attachment))
    yield response).value

  def downloadQuestionAttachment(
      hash: String,
      qid: Long,
      user: User
  ): Future[Either[ExternalAttachmentError, DownloadResponse]] =
    (for
      (_, _, sq) <- EitherT.fromEither[Future](loadQuestion(hash, qid, user))
      attachment <- EitherT.fromOption[Future](Option(sq.question.attachment), AttachmentNotFound)
      response   <- EitherT.liftF(downloadExternalAttachment(attachment))
    yield response).value

  def addAttachmentToQuestionAnswer(
      hash: String,
      questionId: Long,
      filePart: Option[MultipartFormData.FilePart[TemporaryFile]],
      user: User
  ): Future[Either[ExternalAttachmentError, (JsValue, ExternalExam)]] =
    (for
      file                     <- EitherT.fromOption[Future](filePart, MissingFile)
      (externalExam, exam, sq) <- EitherT.fromEither[Future](loadQuestion(hash, questionId, user))
      _                  = if Option(sq.essayAnswer).isEmpty then sq.essayAnswer = new EssayAnswer()
      existingExternalId = Option(sq.essayAnswer.attachment).map(_.externalId)
      attachment <- EitherT.fromOptionF(
        uploadAttachmentToExternalService(file, existingExternalId),
        ExternalIdNotFound
      )
      _ = sq.essayAnswer.attachment = attachment
      _ <- EitherT.fromEither[Future](serialize(externalExam, exam))
    yield (attachment.asJson, externalExam)).value

  def deleteQuestionAnswerAttachment(
      hash: String,
      qid: Long,
      user: User
  ): Future[Either[ExternalAttachmentError, ExternalExam]] =
    (for
      (externalExam, exam, sq) <- EitherT.fromEither[Future](loadQuestion(hash, qid, user))
      ea <- EitherT.fromOption[Future](findEssayAnswerWithAttachment(sq), QuestionAnswerNotFound)
      url <- EitherT.fromOption[Future](
        parseAttachmentUrl("/api/attachments/%s", ea.attachment.externalId),
        ExternalIdNotFound
      )
      response <- EitherT.liftF(wsClient.url(url.toString).delete())
      _ <- EitherT.cond[Future](
        response.status == Status.OK || response.status == Status.NOT_FOUND,
        (),
        ExternalIdNotFound
      )
      _ = ea.attachment = null
      _ <- EitherT.fromEither[Future](serialize(externalExam, exam))
    yield externalExam).value

  private def loadExam(
      hash: String,
      user: User
  ): Either[ExternalAttachmentError, (ExternalExam, Exam)] =
    for
      externalExam <- getExternalExam(hash, user).toRight(ExternalExamNotFound)
      exam         <- getExam(externalExam)
    yield (externalExam, exam)

  private def loadQuestion(
      hash: String,
      qid: Long,
      user: User
  ): Either[ExternalAttachmentError, (ExternalExam, Exam, ExamSectionQuestion)] =
    for
      (externalExam, exam) <- loadExam(hash, user)
      sq                   <- findSectionQuestion(qid, exam).toRight(SectionQuestionNotFound)
    yield (externalExam, exam, sq)

  private def serialize(
      externalExam: ExternalExam,
      exam: Exam
  ): Either[ExternalAttachmentError, Unit] =
    Try(externalExam.serialize(exam)).toEither.left
      .map { e =>
        logger.error("Failed to serialize exam", e)
        CouldNotDeserializeExam
      }
      .map(_ => ())

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
          if response.status != Status.OK then DownloadResponse.Error(response.status)
          else
            val escapedName =
              URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20")
            val contentDisposition = s"attachment; filename*=UTF-8''$escapedName"
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
    val source = createMultipartSource(filePart)
    existingExternalId.filter(_.nonEmpty) match
      case Some(id) =>
        // Update existing attachment
        parseAttachmentUrl("/api/attachments/%s", id).fold(Future.successful(None)) { url =>
          wsClient.url(url.toString).put(source).map { response =>
            if response.status != Status.OK then
              logger.error("Could not update external attachment to XM server!")
              None
            else parseAttachment(response.json)
          }
        }
      case None =>
        // Create new attachment - POST directly with multipart data
        parseAttachmentUrl("/api/attachments/").fold(Future.successful(None)) { url =>
          wsClient.url(url.toString).post(source).map { response =>
            if response.status != Status.CREATED && response.status != Status.OK then
              logger.error("Could not create external attachment to XM server!")
              None
            else parseAttachment(response.json)
          }
        }

  private def parseAttachment(json: JsValue): Option[Attachment] =
    val attachment =
      for
        id          <- (json \ "id").asOpt[String]
        mimeType    <- (json \ "mimeType").asOpt[String]
        displayName <- (json \ "displayName").asOpt[String]
      yield
        val a = new Attachment()
        a.externalId = id
        a.mimeType = mimeType
        a.fileName = displayName
        a
    if attachment.isEmpty then logger.error(s"Unexpected attachment response from XM: $json")
    attachment
