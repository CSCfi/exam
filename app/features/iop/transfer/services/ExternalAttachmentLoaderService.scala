// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

import models.attachment.Attachment
import models.exam.Exam
import org.apache.pekko.actor.ActorSystem
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{FileIO, Source}
import org.apache.pekko.util.ByteString
import play.api.Logging
import play.api.libs.ws.{WSBodyWritables, WSClient}
import play.api.mvc.MultipartFormData
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.file.FileHandler

import java.io.File
import java.net.{URI, URL}
import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** Service for loading and uploading external attachments
  *
  * Handles communication with external systems for attachment management.
  */
class ExternalAttachmentLoaderService @Inject() (
    actorSystem: ActorSystem,
    wsClient: WSClient,
    fileHandler: FileHandler,
    configReader: ConfigReader
)(implicit ec: BlockingIOExecutionContext, mat: Materializer)
    extends WSBodyWritables
    with Logging:

  /** Attachments that cannot be fetched are logged and left out. */
  def fetchExternalAttachmentsAsLocal(exam: Exam): Future[Unit] =
    val futures = scala.collection.mutable.ListBuffer[Future[Either[String, Unit]]]()

    // Add exam attachment if present
    Option(exam.attachment).foreach { attachment =>
      futures += createFromExternalAttachment(attachment, "exam", exam.id.toString)
    }

    // Process section questions
    exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .foreach { sectionQuestion =>
        // Add essay answer attachment if present
        Option(sectionQuestion.essayAnswer)
          .flatMap(ea => Option(ea.attachment))
          .foreach { attachment =>
            futures += createFromExternalAttachment(
              attachment,
              "question",
              sectionQuestion.id.toString,
              "answer",
              sectionQuestion.essayAnswer.id.toString
            )
          }
      }

    // Process distinct questions with attachments
    val distinctQuestions = exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .map(_.question)
      .filter(q => q.attachment != null)
      .toSeq
      .distinct

    distinctQuestions.foreach { question =>
      futures += createFromExternalAttachment(
        question.attachment,
        "question",
        question.id.toString
      )
    }

    // Wait for all futures to complete
    Future.sequence(futures.toSeq).map { results =>
      results.collect { case Left(reason) => reason }.foreach { reason =>
        logger.error(s"Could not fetch external attachment of exam ${exam.id}: $reason")
      }
    }

  /** Left if the request cannot be built. A missing local file is logged and skipped. */
  def createExternalAttachment(attachment: Attachment): Future[Either[String, Unit]] =
    Option(attachment).flatMap(a => Option(a.filePath).filter(_.nonEmpty)) match
      case None => Future.successful(Right(()))
      case Some(_) =>
        parseUrl("/api/attachments/") match
          case None =>
            Future.successful(Left(s"invalid URL for creating attachment ${attachment.id}"))
          case Some(attachmentUrl) =>
            val request = wsClient.url(attachmentUrl.toString)
            request.post("").flatMap { response =>
              val json       = response.json
              val externalId = (json \ "id").as[String]
              attachment.externalId = externalId

              val file = new File(attachment.filePath)
              if !file.exists() then
                logger.warn(
                  s"Could not find file ${file.getAbsoluteFile} for attachment id ${attachment.id}."
                )
                Future.successful(Right(()))
              else
                parseUrl("/api/attachments/%s", externalId) match
                  case None =>
                    logger.error("Invalid URL!")
                    Future.successful(Right(()))
                  case Some(updateUrl) =>
                    val updateRequest = wsClient.url(updateUrl.toString)
                    val source        = FileIO.fromPath(file.toPath)
                    val filePart = MultipartFormData.FilePart[Source[ByteString, ?]](
                      "file",
                      attachment.fileName,
                      Option(attachment.mimeType),
                      source
                    )
                    // Create Source with FilePart (DataPart not needed for Scala WSClient)
                    val partsSource = Source.single(filePart)

                    updateRequest.put(partsSource).map { wsResponse =>
                      if wsResponse.status != play.api.http.Status.OK then
                        logger.warn(s"File upload ${file.getAbsoluteFile} failed!")
                      else logger.info(s"Uploaded file ${file.getAbsoluteFile} for external exam.")
                      Right(())
                    }
            }

  /** Left if an attachment upload request cannot be built. */
  def uploadAssessmentAttachments(exam: Exam): Future[Either[String, Unit]] =
    val futures = scala.collection.mutable.ListBuffer[Future[Either[String, Unit]]]()

    // Create external attachments
    Option(exam.attachment).foreach { attachment =>
      futures += createExternalAttachment(attachment)
    }

    // Process section questions
    val attachmentFutures = exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .flatMap { sq =>
        val attachments = scala.collection.mutable.ListBuffer[Attachment]()

        Option(sq.essayAnswer)
          .flatMap(ea => Option(ea.attachment))
          .foreach(attachments += _)

        Option(sq.question.attachment).foreach(attachments += _)

        attachments
      }
      .map(createExternalAttachment)

    futures ++= attachmentFutures

    // Wait for all futures to complete
    Future.sequence(futures.toSeq).map(_.collectFirst { case Left(reason) => reason }.toLeft(()))

  private def createFromExternalAttachment(
      attachment: Attachment,
      pathParams: String*
  ): Future[Either[String, Unit]] =
    Option(attachment.externalId).filter(_.nonEmpty) match
      case None => Future.successful(Left(s"attachment ${attachment.id} has no external ID"))
      case Some(externalId) =>
        parseUrl("/api/attachments/%s/download", externalId) match
          case None =>
            Future.successful(Left(s"invalid URL for downloading attachment $externalId"))
          case Some(attachmentUrl) =>
            val request = wsClient.url(attachmentUrl.toString)
            request.stream().flatMap { response =>
              val filePath = fileHandler.createFilePath(pathParams*)
              val sink     = FileIO.toPath(java.nio.file.Paths.get(filePath))

              response.bodyAsSource.runWith(sink).map { _ =>
                attachment.filePath = filePath
                attachment.save()
                logger.info(
                  s"Saved attachment ${attachment.externalId} locally as # ${attachment.id}"
                )
                Right(())
              }
            }

  private def parseUrl(format: String, args: String*): Option[URL] =
    val path = if args.isEmpty then format else format.format(args*)
    Try(URI.create(configReader.getIopHost + path).toURL).toOption
