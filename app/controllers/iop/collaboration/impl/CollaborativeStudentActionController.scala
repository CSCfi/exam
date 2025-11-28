// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.collaboration.impl

import controllers.iop.collaboration.api.CollaborativeExamLoader
import impl.ExamUpdater
import miscellaneous.config.ConfigReader
import models.user.Role
import play.api.Logging
import play.api.http.Status.*
import play.api.libs.json.JsArray
import play.api.libs.ws.WSClient
import play.api.mvc.{Action, AnyContent, ControllerComponents, Results}
import play.api.mvc.Results.*
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}

import java.net.URI
import java.net.URL
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.util.Try

class CollaborativeStudentActionController @Inject() (
    wsClient: WSClient,
    examUpdater: ExamUpdater,
    examLoader: CollaborativeExamLoader,
    configReader: ConfigReader,
    authenticated: AuthenticatedAction,
    override val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends CollaborationController(wsClient, examUpdater, examLoader, configReader, controllerComponents)
    with Logging:

  def getFinishedExams(): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      parseAssessmentUrl() match
        case None => Future.successful(InternalServerError)
        case Some(url) =>
          val wsRequest = wsClient.url(url.toString + user.getEppn)
          wsRequest.get().map { response =>
            if response.status != OK then Status(response.status)
            else
              val root = response.json.as[JsArray]
              calculateScores(root)
              Ok(root)
          }
    }

  private def parseAssessmentUrl(): Option[URL] =
    val url = s"${configReader.getIopHost}/api/assessments/user?eppn="
    Try(URI.create(url).toURL).toOption match
      case None =>
        logger.error(s"Malformed URL: $url")
        None
      case some => some
