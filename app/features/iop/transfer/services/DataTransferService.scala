// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

import io.ebean.DB
import io.ebean.text.PathProperties
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.questions.{Question, Tag}
import models.user.User
import org.apache.pekko.NotUsed
import org.apache.pekko.stream.scaladsl.{FileIO, Source => ScalaSource}
import org.apache.pekko.stream.{IOResult, Materializer}
import org.apache.pekko.util.ByteString
import play.api.Logging
import play.api.libs.Files.TemporaryFile
import play.api.libs.json._
import play.api.libs.ws.{BodyWritable, InMemoryBody, WSClient}
import play.api.mvc.MultipartFormData
import services.config.ConfigReader
import services.file.FileHandler
import services.json.JsonDeserializer

import java.io.File
import java.net.URI
import java.nio.file.Paths
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._
import scala.util.{Failure, Success, Try}

class DataTransferService @Inject() (
    wsClient: WSClient,
    configReader: ConfigReader,
    fileHandler: FileHandler
)(implicit ec: ExecutionContext, mat: Materializer)
    extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  private val SeventyMB = 70000 * 1024

  private case class QuestionEntry(srcId: Long, dstId: Long)

  def importQuestionAttachment(
      id: Long,
      filePart: Option[MultipartFormData.FilePart[TemporaryFile]]
  ): Either[DataTransferError, Unit] =
    Option(DB.find(classOf[Question], id)) match
      case None => Left(DataTransferError.QuestionNotFound)
      case Some(question) =>
        filePart match
          case None => Left(DataTransferError.FileNotFound)
          case Some(file) =>
            if file.fileSize > configReader.getMaxFileSize then Left(DataTransferError.FileTooLarge)
            else
              Try(copyFile(file.ref, "question", id.toString)) match
                case Failure(_) => Left(DataTransferError.ErrorCreatingAttachment)
                case Success(newFilePath) =>
                  fileHandler.removePrevious(question)
                  val attachment = fileHandler.createNew(
                    file.filename,
                    file.contentType.getOrElse("application/octet-stream"),
                    newFilePath
                  )
                  question.setAttachment(attachment)
                  question.save()
                  Right(())

  def importData(body: JsValue): Either[DataTransferError, JsValue] =
    (body \ "type").asOpt[String] match
      case Some("QUESTION") => importQuestions(body)
      case _                => Left(DataTransferError.ConnectionError("NotAcceptable"))

  def exportData(user: User, body: JsValue): Future[Either[DataTransferError, Unit]] =
    // Create implicit body writable for JsValue
    given BodyWritable[JsValue] = BodyWritable(
      jsValue => InMemoryBody(ByteString(Json.stringify(jsValue))),
      "application/json"
    )

    (body \ "type").asOpt[String] match
      case Some("QUESTION") if (body \ "ids").asOpt[JsArray].exists(_.value.nonEmpty) =>
        val ids    = (body \ "ids").as[Seq[Long]].toSet
        val orgRef = (body \ "orgRef").as[String]

        val pp    = PathProperties.parse("(*, options(*), tags(name))")
        val query = DB.find(classOf[Question])
        query.apply(pp)

        val questions = query
          .where()
          .idIn(ids.map(Long.box).asJava)
          .or()
          .eq("questionOwners", user)
          .eq("creator", user)
          .endOr()
          .distinct
          .toList

        val data = Json.obj(
          "type"      -> "QUESTION",
          "path"      -> "/integration/iop/import",
          "owner"     -> user.getEppn,
          "questions" -> JsArray(questions.map(q => serialize(q, pp)).toSeq),
          "ids"       -> (body \ "ids").get,
          "orgRef"    -> orgRef
        )

        for
          url       <- parseURL(orgRef)
          uploadUrl <- parseUploadURL(orgRef)
          response  <- wsClient.url(url.toString).post(data)
          result <-
            if response.status != play.api.http.Status.CREATED then
              Future.successful(
                Left(
                  DataTransferError.ConnectionError(
                    (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                  )
                )
              )
            else
              val entries = (response.json \ "ids")
                .as[Seq[JsValue]]
                .map(id => (id \ "src").as[Long] -> (id \ "dst").as[Long])
                .toMap

              val localAttachments = questions
                .filter(q => Option(q.getAttachment).exists(a => new File(a.getFilePath).exists()))
                .map(q => q.getId.longValue() -> q.getAttachment)
                .toMap

              val remoteAttachments = localAttachments
                .collect {
                  case (srcId, attachment) if entries.contains(srcId) =>
                    entries(srcId) -> attachment
                }

              val uploadFutures = remoteAttachments.map { case (dstId, attachment) =>
                val host = uploadUrl.replace("/id/", s"/$dstId/")
                wsClient
                  .url(host)
                  .post(createSource(attachment))
                  .recover { case ex =>
                    logger.error(s"Failed uploading attachment id $dstId", ex)
                    null
                  }
              }

              Future.sequence(uploadFutures).map(_ => Right(()))
        yield result

      case _ => Future.successful(Left(DataTransferError.ConnectionError("BadRequest")))

  private def copyFile(srcFile: TemporaryFile, pathParams: String*): String =
    val newFilePath = fileHandler.createFilePath(pathParams*)
    fileHandler.copyFile(srcFile, new File(newFilePath))
    newFilePath

  private def parseURL(orgRef: String): Future[java.net.URL] =
    Future.fromTry(Try {
      val url = s"${configReader.getIopHost}/api/organisations/$orgRef/export"
      URI.create(url).toURL
    })

  private def parseUploadURL(orgRef: String): Future[String] =
    Future.fromTry(Try {
      val url = s"${configReader.getIopHost}/api/organisations/$orgRef/export/id/attachment"
      URI.create(url).toURL.toString
    })

  private def createSource(
      attachment: models.attachment.Attachment
  ): ScalaSource[MultipartFormData.Part[ScalaSource[ByteString, Future[IOResult]]], NotUsed] =
    val source: ScalaSource[ByteString, Future[IOResult]] =
      FileIO.fromPath(Paths.get(attachment.getFilePath))
    val filePart = MultipartFormData.FilePart(
      "file",
      attachment.getFileName,
      Some(attachment.getMimeType),
      source
    )
    ScalaSource.single(filePart)

  private def isNewTag(tag: Tag, existing: Seq[Tag]): Boolean =
    !existing.exists(_.getName == tag.getName)

  private def importQuestions(body: JsValue): Either[DataTransferError, JsValue] =
    val eppn = (body \ "owner").as[String]
    DB.find(classOf[User]).where().eq("eppn", eppn).find match
      case None => Left(DataTransferError.UserNotRecognized)
      case Some(user) =>
        val questions = (body \ "questions").as[Seq[JsValue]]
        val entries = questions.map { questionNode =>
          val question =
            JsonDeserializer.deserialize(
              classOf[Question],
              play.libs.Json.parse(Json.stringify(questionNode))
            )
          val copy = question.copy()
          copy.setParent(null)
          copy.setCreatorWithDate(user)
          copy.setModifierWithDate(user)
          copy.save()

          val userTags     = DB.find(classOf[Tag]).where().eq("creator", user).list
          val questionTags = question.getTags.asScala.toList

          val newTags = questionTags.filter(t => isNewTag(t, userTags))
          newTags.foreach(_.setId(null))

          val existingTags = userTags.filter(t => !isNewTag(t, questionTags))

          DB.saveAll(newTags.asJava)
          copy.getTags.addAll(newTags.asJava)
          copy.getTags.addAll(existingTags.asJava)
          copy.getTags.forEach(t => t.setCreatorWithDate(user))
          copy.getTags.forEach(t => t.setModifierWithDate(user))
          copy.getQuestionOwners.clear()
          copy.getQuestionOwners.add(user)
          copy.update()
          DB.saveAll(copy.getOptions)

          QuestionEntry(question.getId, copy.getId)
        }

        val idsArray = JsArray(entries.map(e => Json.obj("src" -> e.srcId, "dst" -> e.dstId)))
        Right(Json.obj("ids" -> idsArray))

  private def serialize(question: Question, pp: PathProperties): JsValue =
    Json.parse(DB.json().toJson(question, pp))
