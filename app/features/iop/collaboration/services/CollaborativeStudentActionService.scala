// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.exam.Exam
import models.user.User
import play.api.Logging
import play.api.libs.json.JsArray
import play.api.libs.ws.WSClient
import services.config.ConfigReader
import services.exam.ExamUpdater
import services.json.JsonDeserializer

import java.net.{URI, URL}
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.util.Try

class CollaborativeStudentActionService @Inject() (
    wsClient: WSClient,
    examUpdater: ExamUpdater,
    configReader: ConfigReader
)(implicit ec: ExecutionContext)
    extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  def getFinishedExams(user: User): Future[Either[CollaborativeStudentActionError, JsArray]] =
    parseAssessmentUrl() match
      case None => Future.successful(Left(CollaborativeStudentActionError.InvalidUrl))
      case Some(url) =>
        val wsRequest = wsClient.url(url.toString + user.getEppn)
        wsRequest.get().map { response =>
          if response.status != play.api.http.Status.OK then
            Left(
              CollaborativeStudentActionError.ConnectionError(
                s"HTTP ${response.status}: ${(response.json \ "message").asOpt[String].getOrElse("Connection refused")}"
              )
            )
          else
            val root = response.json.as[JsArray]
            calculateScores(root)
            Right(root)
        }

  private def parseAssessmentUrl(): Option[URL] =
    val url = s"${configReader.getIopHost}/api/assessments/user?eppn="
    Try(URI.create(url).toURL).toOption match
      case None =>
        logger.error(s"Malformed URL: $url")
        None
      case some => some

  private def calculateScores(root: JsArray): Unit =
    root.value
      .collect { case obj: play.api.libs.json.JsObject => obj }
      .foreach { ep =>
        // Convert to Jackson for deserializer
        val examJson    = (ep \ "exam").get
        val jacksonNode = play.libs.Json.parse(play.api.libs.json.Json.stringify(examJson))
        val exam        = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)
        exam.setMaxScore()
        exam.setApprovedAnswerCount()
        exam.setRejectedAnswerCount()
        exam.setTotalScore()
        // This would need to update the JsObject, but since we're mutating in place,
        // we skip the serialize step
      }
