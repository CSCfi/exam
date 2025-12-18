// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import com.fasterxml.jackson.databind.ObjectMapper
import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.config.ConfigReader
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.ExamEnrolment
import org.apache.pekko.actor.AbstractActor
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{Sink, Source}
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json.JsonParserSettings
import play.api.libs.json.jackson.PlayJsonMapperModule
import play.api.libs.ws.{WSClient, writeableOf_String}
import play.mvc.Http

import java.net.URI
import javax.inject.Inject
import scala.concurrent.ExecutionContext

class AssessmentTransferActor @Inject (
    private val wsClient: WSClient,
    private val configReader: ConfigReader,
    implicit val ec: ExecutionContext,
    implicit val mat: Materializer
) extends AbstractActor
    with Logging
    with DbApiHelper
    with JavaApiHelper:

  // Maximum number of concurrent HTTP requests
  private val maxConcurrency = 10

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (_: String) =>
        logger.info("Assessment transfer check started ->")
        val enrolments = DB
          .find(classOf[ExamEnrolment])
          .where
          .isNotNull("externalExam")
          .isNull("externalExam.sent")
          .isNotNull("externalExam.started")
          .isNotNull("externalExam.finished")
          .isNotNull("reservation.externalRef")
          .list

        val count = enrolments.size
        if count > 0 then
          logger.info(s"Processing $count assessment transfers with max concurrency of $maxConcurrency")
          Source(enrolments)
            .mapAsync(maxConcurrency)(send)
            .runWith(Sink.ignore)
            .onComplete {
              case scala.util.Success(_) =>
                logger.info("<- Assessment transfer check completed successfully")
              case scala.util.Failure(e) =>
                logger.error("Error processing assessment transfers", e)
            }
        else
          logger.info("No assessment transfers to process")
          logger.info("<- done")
    )
    .build

  private def send(enrolment: ExamEnrolment): scala.concurrent.Future[Unit] =
    val ref = enrolment.getReservation.getExternalRef
    logger.info(s"Transferring back assessment for reservation $ref")
    val url     = parseUrl(ref)
    val request = wsClient.url(url.toString)
    val ee      = enrolment.getExternalExam
    val json    = DB.json.toJson(ee, PathProperties.parse("(*, creator(id))"))
    val om      = new ObjectMapper().registerModule(new PlayJsonMapperModule(JsonParserSettings.settings))
    val node    = om.readTree(json)
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
      .map(_ => ())

  private def parseUrl(reservationRef: String) =
    URI.create(s"${configReader.getIopHost}/api/enrolments/$reservationRef/assessment").toURL
