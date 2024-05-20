// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import io.ebean.DB
import models.iop.ExternalExam
import org.apache.pekko.actor.AbstractActor
import play.api.Logging
import play.api.libs.ws.WSClient
import miscellaneous.config.ConfigReader
import miscellaneous.scala.DbApiHelper
import models.attachment.Attachment

import java.net.MalformedURLException
import java.net.URI
import java.net.URL
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._
import scala.util.control.Exception.catching
import scala.util.{Failure, Success, Try}

object ExternalExamExpirationActor:
  private val MONTHS_UNTIL_EXPIRATION = 4
class ExternalExamExpirationActor @Inject (
    private val configReader: ConfigReader,
    private val wsClient: WSClient,
    implicit val ec: ExecutionContext
) extends AbstractActor
    with DbApiHelper
    with Logging:

  private def parseUrl(id: String) =
    val url = configReader.getIopHost + "/api/attachments/" + id
    catching(classOf[MalformedURLException]).either(URI.create(url).toURL) match
      case Left(_)  => None
      case Right(u) => Some(u)

  private def allOf[T](futures: Iterable[Future[T]]): Future[Seq[Try[T]]] =
    def wrapWithTry(future: Future[T]): Future[Try[T]] =
      future.map(Success(_)).recover { case x => Failure(x) }

    Future.sequence(futures.map(wrapWithTry).toSeq)

  private def deleteAttachment(attachment: Attachment) =
    val url = parseUrl(attachment.getExternalId).map(_.toString).getOrElse("")
    wsClient.url(url).delete()

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (_: String) =>
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
            allOf(attachments.map(deleteAttachment)).onComplete {
              case Success(_) =>
                if ee.getSent.plusMonths(ExternalExamExpirationActor.MONTHS_UNTIL_EXPIRATION).isBeforeNow then
                  ee.setContent(Map.empty.asJava)
                  ee.update()
                  logger.info(s"Marked external exam ${ee.getId} as expired")
              case Failure(e) => logger.error(s"Failed in deleting attachments for ${ee.getId}", e)
            }
          )
        logger.debug("<- done")
    )
    .build
