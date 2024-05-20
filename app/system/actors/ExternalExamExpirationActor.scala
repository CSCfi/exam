/*
 *
 *  * Copyright (c) 2024 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *  *
 *  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  * versions of the EUPL (the "Licence");
 *  * You may not use this work except in compliance with the Licence.
 *  * You may obtain a copy of the Licence at:
 *  *
 *  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */

package system.actors

import io.ebean.DB

import java.net.MalformedURLException
import java.net.URI
import java.net.URL
import java.util.concurrent.CompletableFuture
import javax.inject.Inject
import models.Attachment
import models.json.ExternalExam
import org.apache.pekko.actor.AbstractActor
import play.api.Logging
import play.libs.ws.WSClient
import util.config.ConfigReader
import util.scala.DbApiHelper

import scala.jdk.CollectionConverters.*
import scala.util.control.Exception.catching

object ExternalExamExpirationActor:
  private val MONTHS_UNTIL_EXPIRATION = 4
class ExternalExamExpirationActor @Inject (private val configReader: ConfigReader, private val wsClient: WSClient)
    extends AbstractActor
    with DbApiHelper
    with Logging:

  private def parseUrl(id: String) =
    val url = configReader.getIopHost + "/api/attachments/" + id
    catching(classOf[MalformedURLException]).either(URI.create(url).toURL) match
      case Left(_)  => None
      case Right(u) => Some(u)

  private def deleteAttachment(attachment: Attachment) =
    val url = parseUrl(attachment.getExternalId)
    CompletableFuture.runAsync(() => url.map((value: URL) => wsClient.url(value.toString).delete))

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (s: String) =>
        logger.debug("Starting external exam expiration check ->")
        DB.find(classOf[ExternalExam])
          .where
          .isNotNull("sent")
          .jsonExists("content", "id")
          .distinct
          .filter(ee => Option(ee.getSent).nonEmpty)
          .foreach(ee =>
            val attachments = ee.deserialize.getExamSections.asScala
              .flatMap(_.getSectionQuestions.asScala)
              .map(_.getEssayAnswer)
              .filter(ea => Option(ea).nonEmpty && Option(ea.getAttachment).nonEmpty)
              .map(_.getAttachment)
            val promises = attachments.map(deleteAttachment).toArray
            CompletableFuture
              .allOf(promises: _*)
              .thenRunAsync(() =>
                if ee.getSent.plusMonths(ExternalExamExpirationActor.MONTHS_UNTIL_EXPIRATION).isBeforeNow then
                  ee.setContent(Map.empty.asJava)
                  ee.update()
                  logger.info(s"Marked external exam ${ee.getId} as expired")
              )
          )
        logger.debug("<- done")
    )
    .build
