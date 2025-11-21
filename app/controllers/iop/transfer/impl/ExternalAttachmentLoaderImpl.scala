// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl

import controllers.iop.transfer.api.ExternalAttachmentLoader
import miscellaneous.config.ConfigReader
import miscellaneous.file.FileHandler
import models.attachment.Attachment
import models.exam.Exam
import org.apache.pekko.actor.ActorSystem
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{FileIO, Source}
import org.apache.pekko.util.ByteString
import play.api.Logging
import play.api.libs.ws.{WSBodyWritables, WSClient}
import play.api.mvc.MultipartFormData

import java.io.File
import java.net.{URI, URL}
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.util.Try

class ExternalAttachmentLoaderImpl @Inject() (
    actorSystem: ActorSystem,
    wsClient: WSClient,
    fileHandler: FileHandler,
    configReader: ConfigReader
)(implicit ec: ExecutionContext, mat: Materializer)
    extends ExternalAttachmentLoader
    with WSBodyWritables
    with Logging:

  override def fetchExternalAttachmentsAsLocal(exam: Exam): Future[Unit] =
    val futures = scala.collection.mutable.ListBuffer[Future[Unit]]()

    // Add exam attachment if present
    Option(exam.getAttachment).foreach { attachment =>
      futures += createFromExternalAttachment(attachment, "exam", exam.getId.toString)
    }

    // Process section questions
    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .foreach { sectionQuestion =>
        // Add essay answer attachment if present
        Option(sectionQuestion.getEssayAnswer)
          .flatMap(ea => Option(ea.getAttachment))
          .foreach { attachment =>
            futures += createFromExternalAttachment(
              attachment,
              "question",
              sectionQuestion.getId.toString,
              "answer",
              sectionQuestion.getEssayAnswer.getId.toString
            )
          }
      }

    // Process distinct questions with attachments
    val distinctQuestions = exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .map(_.getQuestion)
      .filter(q => q.getAttachment != null)
      .toSeq
      .distinct

    distinctQuestions.foreach { question =>
      futures += createFromExternalAttachment(question.getAttachment, "question", question.getId.toString)
    }

    // Wait for all futures to complete
    Future.sequence(futures.toSeq).map(_ => ())

  override def createExternalAttachment(attachment: Attachment): Future[Unit] =
    Option(attachment).flatMap(a => Option(a.getFilePath).filter(_.nonEmpty)) match
      case None => Future.successful(())
      case Some(_) =>
      parseUrl("/api/attachments/") match
        case None =>
          Future.failed(new RuntimeException("Invalid URL"))
        case Some(attachmentUrl) =>
          val request = wsClient.url(attachmentUrl.toString)
          request.post("").flatMap { response =>
            val json = response.json
            val externalId = (json \ "id").as[String]
            attachment.setExternalId(externalId)

            val file = new File(attachment.getFilePath)
            if !file.exists() then
              logger.warn(
                s"Could not find file ${file.getAbsoluteFile} for attachment id ${attachment.getId}."
              )
              Future.successful(())
            else
              parseUrl("/api/attachments/%s", externalId) match
                case None =>
                  logger.error("Invalid URL!")
                  Future.successful(())
                case Some(updateUrl) =>
                  val updateRequest = wsClient.url(updateUrl.toString)
                  val source = FileIO.fromPath(file.toPath)
                  val filePart = MultipartFormData.FilePart[Source[ByteString, ?]](
                    "file",
                    attachment.getFileName,
                    Option(attachment.getMimeType),
                    source
                  )
                  // Create Source with FilePart (DataPart not needed for Scala WSClient)
                  val partsSource = Source.single(filePart)

                  updateRequest.put(partsSource).map { wsResponse =>
                    if wsResponse.status != play.api.http.Status.OK then
                      logger.warn(s"File upload ${file.getAbsoluteFile} failed!")
                    else
                      logger.info(s"Uploaded file ${file.getAbsoluteFile} for external exam.")
                  }
          }

  override def uploadAssessmentAttachments(exam: Exam): Future[Unit] =
    val futures = scala.collection.mutable.ListBuffer[Future[Unit]]()

    // Create external attachments
    Option(exam.getAttachment).foreach { attachment =>
      futures += createExternalAttachment(attachment)
    }

    // Process section questions
    val attachmentFutures = exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .flatMap { sq =>
        val attachments = scala.collection.mutable.ListBuffer[Attachment]()

        Option(sq.getEssayAnswer)
          .flatMap(ea => Option(ea.getAttachment))
          .foreach(attachments += _)

        Option(sq.getQuestion.getAttachment).foreach(attachments += _)

        attachments
      }
      .map(createExternalAttachment)

    futures ++= attachmentFutures

    // Wait for all futures to complete
    Future.sequence(futures.toSeq).map(_ => ())

  private def createFromExternalAttachment(attachment: Attachment, pathParams: String*): Future[Unit] =
    Option(attachment.getExternalId).filter(_.nonEmpty) match
      case None =>
        logger.error("Could not find external ID for an attachment")
        Future.failed(new RuntimeException("Could not find external ID for an attachment"))
      case Some(externalId) =>
        parseUrl("/api/attachments/%s/download", externalId) match
        case None =>
          Future.failed(new RuntimeException("Invalid URL!"))
        case Some(attachmentUrl) =>
          val request = wsClient.url(attachmentUrl.toString)
          request.stream().flatMap { response =>
            val filePath = fileHandler.createFilePath(pathParams*)
            val sink = FileIO.toPath(java.nio.file.Paths.get(filePath))

            response.bodyAsSource.runWith(sink).map { _ =>
              attachment.setFilePath(filePath)
              attachment.save()
              logger.info(
                s"Saved attachment ${attachment.getExternalId} locally as # ${attachment.getId}"
              )
            }
          }

  private def parseUrl(format: String, args: String*): Option[URL] =
    val path = if args.isEmpty then format else format.format(args*)
    Try(URI.create(configReader.getIopHost + path).toURL).toOption

