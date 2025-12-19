// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.effect.syntax.all.concurrentParTraverseOps
import cats.syntax.all._
import com.fasterxml.jackson.databind.ObjectMapper
import io.ebean.DB
import io.ebean.text.PathProperties
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.enrolment.ExamEnrolment
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json.JsonParserSettings
import play.api.libs.json.jackson.PlayJsonMapperModule
import play.api.libs.ws.{WSClient, writeableOf_String}
import play.mvc.Http
import services.config.ConfigReader

import java.net.URI
import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.concurrent.duration._

// This service sends participations to external exams back to the proxy server.
class AssessmentTransferService @Inject() (
    private val wsClient: WSClient,
    private val configReader: ConfigReader,
    implicit val ec: ExecutionContext
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions
    with EbeanJsonExtensions:

  // Maximum number of concurrent HTTP requests
  private val maxConcurrency = 10
  private val objectMapper =
    new ObjectMapper().registerModule(new PlayJsonMapperModule(JsonParserSettings.settings))

  private def parseUrl(reservationRef: String) =
    URI.create(s"${configReader.getIopHost}/api/enrolments/$reservationRef/assessment").toURL

  private def send(enrolment: ExamEnrolment): IO[Unit] =
    val ref = enrolment.getReservation.getExternalRef
    logger.info(s"Transferring back assessment for reservation $ref")
    val url     = parseUrl(ref)
    val request = wsClient.url(url.toString)
    val ee      = enrolment.getExternalExam
    val json    = DB.json.toJson(ee, PathProperties.parse("(*, creator(id))"))
    val node    = objectMapper.readTree(json)
    IO.fromFuture(
      IO(
        request
          .addHttpHeaders("Content-Type" -> "application/json")
          .post(node.toString)
          .map(resp =>
            resp.status match
              case Http.Status.CREATED =>
                ee.setSent(DateTime.now)
                ee.update()
                logger.info(s"Assessment transfer for reservation $ref processed successfully")
              case _ =>
                logger.error(s"Failed in transferring assessment for reservation $ref")
          )
          .recover { case e: Exception =>
            logger.error("I/O failure while sending assessment to proxy server", e)
          }
      )
    ).void

  private def runCheck(): IO[Unit] =
    IO.blocking {
      logger.info("Assessment transfer check started ->")
      DB
        .find(classOf[ExamEnrolment])
        .where
        .isNotNull("externalExam")
        .isNull("externalExam.sent")
        .isNotNull("externalExam.started")
        .isNotNull("externalExam.finished")
        .isNotNull("reservation.externalRef")
        .list
    }.flatMap(enrolments =>
      val count = enrolments.size
      if count > 0 then
        logger.info(
          s"Processing $count assessment transfers with max concurrency of $maxConcurrency"
        )
        enrolments
          .parTraverseN(maxConcurrency)(send)
          .handleErrorWith(e => IO(logger.error("Error processing assessment transfers", e)))
      else IO(logger.info("No assessment transfers to process"))
    ) *> IO(logger.info("<- done"))

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (70.seconds, 60.minutes)
    val job: IO[Unit] =
      runCheck().handleErrorWith(e => IO(logger.error("Error in assessment transfer", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
