// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all._
import io.ebean.DB
import database.EbeanQueryExtensions
import models.attachment.Attachment
import models.iop.ExternalExam
import play.api.Logging
import play.api.libs.ws.WSClient
import services.config.ConfigReader

import java.net.MalformedURLException
import java.net.URI
import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.concurrent.duration._
import scala.jdk.CollectionConverters._
import scala.util.control.Exception.catching

object ExternalExamExpirationService:
  private val MONTHS_UNTIL_EXPIRATION = 4

class ExternalExamExpirationService @Inject() (
    private val configReader: ConfigReader,
    private val wsClient: WSClient,
    implicit val ec: ExecutionContext
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  private def parseUrl(id: String) =
    val url = s"${configReader.getIopHost}/api/attachments/$id"
    catching(classOf[MalformedURLException]).either(URI.create(url).toURL) match
      case Left(_)  => None
      case Right(u) => Some(u)

  private def deleteAttachment(attachment: Attachment): IO[Unit] =
    val url = parseUrl(attachment.getExternalId).map(_.toString).getOrElse("")
    IO.fromFuture(IO(wsClient.url(url).delete())).void

  private def processExternalExam(ee: ExternalExam): IO[Unit] =
    val attachments = ee.deserialize.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .map(_.getEssayAnswer)
      .flatMap(ea => Option(ea).flatMap(e => Option(e.getAttachment)))
    attachments.toList
      .traverse_(deleteAttachment)
      .handleErrorWith(e => IO(logger.error(s"Failed in deleting attachments for ${ee.getId}", e)))
      .flatMap(_ =>
        if ee.getSent.plusMonths(ExternalExamExpirationService.MONTHS_UNTIL_EXPIRATION).isBeforeNow then
          IO.blocking {
            ee.setContent(Map.empty[String, Object].asJava)
            ee.update()
            logger.info(s"Marked external exam ${ee.getId} as expired")
          }
        else IO.unit
      )

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
      exams
        .traverse_(processExternalExam)
        .handleErrorWith(e => IO(logger.error("Error processing external exam expiration", e)))
    ) *> IO(logger.info("<- done"))

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (100.seconds, (60 * 24).minutes)
    val job: IO[Unit]     = runCheck().handleErrorWith(e => IO(logger.error("Error in external exam expiration", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
