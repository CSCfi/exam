// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.syntax.all.concurrentParTraverseOps
import cats.effect.{IO, Resource}
import cats.syntax.all.*
import database.EbeanQueryExtensions
import io.ebean.DB
import models.attachment.Attachment
import models.iop.ExternalExam
import play.api.Logging
import play.api.libs.ws.WSClient
import security.BlockingIOExecutionContext
import services.config.ConfigReader

import java.net.{MalformedURLException, URI}
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.control.Exception.catching

object ExternalExamExpirationService:
  private val MONTHS_UNTIL_EXPIRATION = 4

class ExternalExamExpirationService @Inject() (
    private val configReader: ConfigReader,
    private val wsClient: WSClient,
    implicit val ec: BlockingIOExecutionContext
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  // Maximum number of concurrent HTTP requests
  private val maxConcurrency = 10

  private def parseUrl(id: String) =
    val url = s"${configReader.getIopHost}/api/attachments/$id"
    catching(classOf[MalformedURLException]).either(URI.create(url).toURL) match
      case Left(_)  => None
      case Right(u) => Some(u)

  private def deleteAttachment(attachment: Attachment): IO[Unit] =
    val url = parseUrl(attachment.getExternalId).map(_.toString).getOrElse("")
    if url.nonEmpty then
      IO.fromFuture(IO(wsClient.url(url).delete()))
        .void
        .handleErrorWith(e =>
          IO(logger.error(s"Failed to delete attachment ${attachment.getExternalId}", e))
        )
    else IO.unit

  private def processExternalExam(ee: ExternalExam): IO[Unit] =
    val attachments =
      try
        ee.deserialize.getExamSections.asScala
          .flatMap(_.getSectionQuestions.asScala)
          .map(_.getEssayAnswer)
          .flatMap(ea => Option(ea).flatMap(e => Option(e.getAttachment)))
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
      attachments
        .parTraverseN(maxConcurrency)(deleteAttachment)
        .handleErrorWith(e =>
          IO(logger.error(s"Failed in deleting attachments for external exam ${ee.getId}", e))
        )
        .flatMap(_ =>
          if ee.getSent.plusMonths(
              ExternalExamExpirationService.MONTHS_UNTIL_EXPIRATION
            ).isBeforeNow
          then
            IO.blocking {
              ee.setContent(Map.empty[String, Object].asJava)
              ee.update()
              logger.info(s"Marked external exam ${ee.getId} as expired")
            }
          else IO.unit
        )
    else if ee.getSent.plusMonths(ExternalExamExpirationService.MONTHS_UNTIL_EXPIRATION).isBeforeNow
    then
      IO.blocking {
        ee.setContent(Map.empty[String, Object].asJava)
        ee.update()
        logger.info(s"Marked external exam ${ee.getId} as expired")
      }
    else IO.unit

  private def runCheck(): IO[Unit] =
    IO.blocking {
      logger.info("Starting external exam expiration check ->")
      DB
        .find(classOf[ExternalExam])
        .where
        .isNotNull("sent")
        .jsonExists("content", "id")
        .list
        .filter(ee => Option(ee.getSent).nonEmpty)
        .distinct
    }.flatMap(exams =>
      val count = exams.size
      if count > 0 then
        logger.info(s"Processing $count external exams with max concurrency of $maxConcurrency")
        exams
          .parTraverseN(maxConcurrency)(processExternalExam)
          .handleErrorWith(e => IO(logger.error("Error processing external exam expiration", e)))
      else IO(logger.info("No external exams to process"))
    ) *> IO(logger.info("<- done"))

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (100.seconds, (60 * 24).minutes)
    val job: IO[Unit] =
      runCheck().handleErrorWith(e => IO(logger.error("Error in external exam expiration", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
