// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.scala.DbApiHelper
import models.attachment.Attachment
import models.iop.ExternalExam
import org.apache.pekko.actor.AbstractActor
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{Sink, Source}
import play.api.Logging
import play.api.libs.ws.WSClient

import java.net.{MalformedURLException, URI}
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.util.control.Exception.catching
import scala.util.{Failure, Success}

object ExternalExamExpirationActor:
  private val MONTHS_UNTIL_EXPIRATION = 4
class ExternalExamExpirationActor @Inject (
    private val configReader: ConfigReader,
    private val wsClient: WSClient,
    implicit val ec: ExecutionContext,
    implicit val mat: Materializer
) extends AbstractActor
    with DbApiHelper
    with Logging:

  // Maximum number of concurrent HTTP requests
  private val maxConcurrency = 10

  private def parseUrl(id: String) =
    val url = s"${configReader.getIopHost}/api/attachments/$id"
    catching(classOf[MalformedURLException]).either(URI.create(url).toURL) match
      case Left(_)  => None
      case Right(u) => Some(u)

  private def deleteAttachment(attachment: Attachment): Future[Unit] =
    val url = parseUrl(attachment.getExternalId).map(_.toString).getOrElse("")
    if url.nonEmpty then
      wsClient
        .url(url)
        .delete()
        .map(_ => ())
        .recover { case e: Exception =>
          logger.error(s"Failed to delete attachment ${attachment.getExternalId}", e)
        }
    else Future.successful(())

  private def processExternalExam(ee: ExternalExam): Future[Unit] =
    val attachments =
      try
        ee.deserialize.getExamSections.asScala
          .flatMap(_.getSectionQuestions.asScala)
          .map(_.getEssayAnswer)
          .filter(ea => Option(ea).nonEmpty && Option(ea.getAttachment).nonEmpty)
          .map(_.getAttachment)
          .toList
      catch
        case e: Exception =>
          logger.error(s"Failed to deserialize external exam ${ee.getId}", e)
          List.empty[Attachment]

    if attachments.nonEmpty then
      val count = attachments.size
      logger.info(
        s"Processing $count attachments for external exam ${ee.getId} with max concurrency of $maxConcurrency"
      )
      Source(attachments)
        .mapAsync(maxConcurrency)(deleteAttachment)
        .runWith(Sink.ignore)
        .map(_ =>
          if ee.getSent.plusMonths(ExternalExamExpirationActor.MONTHS_UNTIL_EXPIRATION).isBeforeNow then
            ee.setContent(Map.empty[String, Object].asJava)
            ee.update()
            logger.info(s"Marked external exam ${ee.getId} as expired")
        )
        .recover { case e: Exception =>
          logger.error(s"Failed in deleting attachments for external exam ${ee.getId}", e)
        }
    else
      if ee.getSent.plusMonths(ExternalExamExpirationActor.MONTHS_UNTIL_EXPIRATION).isBeforeNow then
        ee.setContent(Map.empty[String, Object].asJava)
        ee.update()
        logger.info(s"Marked external exam ${ee.getId} as expired")
      Future.successful(())

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (_: String) =>
        logger.info("Starting external exam expiration check ->")
        val externalExams = DB
          .find(classOf[ExternalExam])
          .where
          .isNotNull("sent")
          .jsonExists("content", "id")
          .distinct
          .filter(ee => Option(ee.getSent).nonEmpty)
          .toList

        val count = externalExams.size
        if count > 0 then
          logger.info(s"Processing $count external exams with max concurrency of $maxConcurrency")
          Source(externalExams)
            .mapAsync(maxConcurrency)(processExternalExam)
            .runWith(Sink.ignore)
            .onComplete {
              case Success(_) =>
                logger.info("<- External exam expiration check completed successfully")
              case Failure(e) =>
                logger.error("Error processing external exam expiration", e)
            }
        else
          logger.info("No external exams to process")
          logger.info("<- done")
    )
    .build
