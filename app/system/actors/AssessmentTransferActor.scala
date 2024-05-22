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
    implicit val ec: ExecutionContext
) extends AbstractActor
    with Logging
    with DbApiHelper
    with JavaApiHelper:

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (_: String) =>
        logger.debug("Assessment transfer check started ->")
        DB
          .find(classOf[ExamEnrolment])
          .where
          .isNotNull("externalExam")
          .isNull("externalExam.sent")
          .isNotNull("externalExam.started")
          .isNotNull("externalExam.finished")
          .isNotNull("reservation.externalRef")
          .list
          .foreach(send)
        logger.debug("<- done")
    )
    .build

  private def send(enrolment: ExamEnrolment): Unit =
    val ref = enrolment.getReservation.getExternalRef
    logger.debug(s"Transferring back assessment for reservation $ref")
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
            logger.info("Assessment transfer for reservation $ref processed successfully")
          case _ =>
            logger.error(s"Failed in transferring assessment for reservation $ref")
      )
      .recover { case e: Exception =>
        logger.error("I/O failure while sending assessment to proxy server", e)
      }

  private def parseUrl(reservationRef: String) =
    URI.create(s"${configReader.getIopHost}/api/enrolments/$reservationRef/assessment").toURL
