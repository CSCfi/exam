// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl

import controllers.base.scala.ExamBaseController
import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.config.ConfigReader
import miscellaneous.file.FileHandler
import miscellaneous.json.JsonDeserializer
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.questions.{Question, Tag}
import models.user.{Role, User}
import org.apache.pekko.stream.{IOResult, Materializer}
import org.apache.pekko.stream.scaladsl.{FileIO, Source as ScalaSource}
import org.apache.pekko.util.ByteString
import play.api.Logging
import play.api.libs.Files.TemporaryFile
import play.api.libs.json.*
import play.api.libs.ws.{BodyWritable, InMemoryBody, WSClient}
import play.api.mvc.*
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction

import java.io.File
import java.net.URI
import java.nio.file.Paths
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try}

class DataTransferController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    wsClient: WSClient,
    configReader: ConfigReader,
    fileHandler: FileHandler
)(implicit ec: ExecutionContext, mat: Materializer)
    extends BaseController
    with DbApiHelper
    with JavaApiHelper
    with Logging:

  private val SeventyMB = 70000 * 1024

  enum DataType:
    case QUESTION

  private case class QuestionEntry(srcId: Long, dstId: Long)

  def importQuestionAttachment(id: Long): Action[MultipartFormData[TemporaryFile]] =
    Action(parse.multipartFormData).andThen(audited) { request =>
      Option(DB.find(classOf[Question], id)) match
        case None => NotFound
        case Some(question) =>
          request.body.file("file") match
            case None => BadRequest("file not found")
            case Some(filePart) =>
              if filePart.fileSize > configReader.getMaxFileSize then BadRequest("i18n_file_too_large")
              else
                Try(copyFile(filePart.ref, "question", id.toString)) match
                  case Failure(_) => InternalServerError("i18n_error_creating_attachment")
                  case Success(newFilePath) =>
                    fileHandler.removePrevious(question)
                    val attachment = fileHandler.createNew(
                      filePart.filename,
                      filePart.contentType.getOrElse("application/octet-stream"),
                      newFilePath
                    )
                    question.setAttachment(attachment)
                    question.save()
                    Created
    }

  def importData(): Action[JsValue] = Action(parse.json(maxLength = SeventyMB)).andThen(audited) { request =>
    (request.body \ "type").asOpt[String] match
      case Some("QUESTION") => importQuestions(request.body)
      case _                => NotAcceptable
  }

  def exportData(): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
      .andThen(audited)
      .async(parse.json) { request =>
        // Create implicit body writable for JsValue
        given BodyWritable[JsValue] = BodyWritable(
          jsValue => InMemoryBody(ByteString(Json.stringify(jsValue))),
          "application/json"
        )

        val user = request.attrs(Auth.ATTR_USER)
        val body = request.body

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
              .findSet()
              .asScala
              .toSet

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
                if response.status != CREATED then
                  Future.successful(
                    InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
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

                  Future.sequence(uploadFutures).map(_ => Created)
            yield result

          case _ => Future.successful(BadRequest)
      }

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
  ): ScalaSource[MultipartFormData.Part[ScalaSource[ByteString, ?]], ?] =
    val source: ScalaSource[ByteString, Future[IOResult]] = FileIO.fromPath(Paths.get(attachment.getFilePath))
    val filePart = MultipartFormData.FilePart(
      "file",
      attachment.getFileName,
      Some(attachment.getMimeType),
      source
    )
    ScalaSource.single(filePart)

  private def isNewTag(tag: Tag, existing: Seq[Tag]): Boolean =
    !existing.exists(_.getName == tag.getName)

  private def importQuestions(body: JsValue): Result =
    val eppn = (body \ "owner").as[String]
    DB.find(classOf[User]).where().eq("eppn", eppn).find match
      case None => BadRequest("User not recognized")
      case Some(user) =>
        val questions = (body \ "questions").as[Seq[JsValue]]
        val entries = questions.map { questionNode =>
          val question =
            JsonDeserializer.deserialize(classOf[Question], play.libs.Json.parse(Json.stringify(questionNode)))
          val copy = question.copy()
          copy.setParent(null)
          copy.setCreatorWithDate(user)
          copy.setModifierWithDate(user)
          copy.save()

          val userTags     = DB.find(classOf[Tag]).where().eq("creator", user).findList().asScala.toList
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
        Created(Json.obj("ids" -> idsArray))

  private def serialize(question: Question, pp: PathProperties): JsValue =
    Json.parse(DB.json().toJson(question, pp))
