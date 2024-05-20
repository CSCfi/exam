// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import com.fasterxml.jackson.databind.ObjectMapper
import io.ebean.DB
import io.ebean.text.PathProperties
import org.apache.pekko.actor.AbstractActor
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json.JsonParserSettings
import play.api.libs.json.jackson.PlayJsonMapperModule
import play.api.libs.ws.WSClient
import play.api.libs.ws.writeableOf_String
import play.mvc.Http
import miscellaneous.config.ConfigReader
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.ExamEnrolment

import java.io.IOException
import java.net.URI
import javax.inject.Inject
import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.util.control.Exception.catching

class AssessmentTransferActor @Inject (private val wsClient: WSClient, private val configReader: ConfigReader)
    extends AbstractActor
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
          .foreach(e =>
            catching(classOf[IOException]).either(send(e)) match
              case Left(ex) =>
                logger.error("I/O failure while sending assessment to proxy server", ex)
              case _ => // Nothing to do here
          )
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
    Await.result(request.addHttpHeaders("Content-Type" -> "application/json").post(node.toString), Duration.Inf) match
      case resp if resp.status != Http.Status.CREATED =>
        logger.error("Failed in transferring assessment for reservation $ref")
      case _ =>
        ee.setSent(DateTime.now)
        ee.update()
        logger.info("Assessment transfer for reservation $ref processed successfully")

  private def parseUrl(reservationRef: String) =
    URI.create(s"${configReader.getIopHost}/api/enrolments/$reservationRef/assessment").toURL
