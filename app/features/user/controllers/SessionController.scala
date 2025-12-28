// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.controllers

import database.EbeanJsonExtensions
import features.user.services.*
import play.api.libs.json.Json
import play.api.mvc.*
import play.api.{Environment, Logger}
import repository.EnrolmentRepository
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.Future
import scala.util.Try

class SessionController @Inject() (
    private val sessionService: SessionService,
    private val enrolmentRepository: EnrolmentRepository,
    audited: AuditedAction,
    environment: Environment,
    configReader: ConfigReader,
    val controllerComponents: ControllerComponents
)(implicit ec: BlockingIOExecutionContext)
    extends BaseController
    with EbeanJsonExtensions:

  private val logger = Logger(getClass)

  private def toResult(error: SessionError): Result =
    error match
      case SessionError.NoCredentials         => BadRequest(error.message)
      case SessionError.LoginTypeNotSupported => BadRequest(error.message)
      case SessionError.DisallowedLogin =>
        BadRequest(error.message).withHeaders("x-exam-delay-execution" -> "true")
      case SessionError.Unauthenticated                   => Unauthorized(error.message)
      case SessionError.LoginFailed                       => BadRequest(error.message)
      case SessionError.FailedToHandleExternalReservation => InternalServerError(error.message)
      case SessionError.NoSession                         => Unauthorized(error.message)
      case SessionError.InvalidUserId                     => BadRequest(error.message)
      case SessionError.UserNotFound                      => NotFound(error.message)
      case SessionError.RoleNotFound                      => NotFound(error.message)
      case SessionError.UserDoesNotHaveRole               => Forbidden(error.message)
      case SessionError.ValidationError(message)          => BadRequest(message)

  def login(): Action[AnyContent] = Action.andThen(audited).async { request =>
    val loginType = configReader.getLoginType
    sessionService
      .login(loginType, request.headers.toMap, request.body.asJson, request.remoteAddress)
      .map {
        case Left(error) => toResult(error)
        case Right(loginResponse) =>
          Ok(loginResponse.userData).withSession(play.api.mvc.Session(loginResponse.sessionData))
      }
  }

  def getAttributes: Action[AnyContent] = Action { request =>
    val node = request.headers.toMap.foldLeft(Json.obj()) { case (acc, (key, values)) =>
      acc + (key -> Json.toJson(values.mkString(", ")))
    }
    Ok(node)
  }

  def logout: Action[AnyContent] = Action { request =>
    val userId = request.session.get("id").flatMap(id => scala.util.Try(id.toLong).toOption)
    val result = sessionService.logout(userId) match
      case Left(error) => toResult(error)
      case Right(LogoutResponse(logoutUrl)) =>
        val response = logoutUrl match
          case Some(url) => Ok(Json.obj("logoutUrl" -> url))
          case None      => Ok
        response.withNewSession.discardingCookies(play.api.mvc.DiscardingCookie("PLAY_SESSION"))

    if environment.mode == play.api.Mode.Dev then result
    else result.discardingCookies(play.api.mvc.DiscardingCookie(configReader.getCsrfCookie))
  }

  def setLoginRole(roleName: String): Action[AnyContent] =
    Action.andThen(audited).async { request =>
      request.session.get("id") match
        case None => Future.successful(toResult(SessionError.NoSession))
        case Some(id) =>
          Try(id.toLong).toOption match
            case None => Future.successful(toResult(SessionError.InvalidUserId))
            case Some(userId) =>
              sessionService
                .setLoginRole(userId, roleName, request.headers.toMap, request.remoteAddress)
                .flatMap {
                  case Left(error) => Future.successful(toResult(error))
                  case Right(role) =>
                    // Update session with reservation headers if student
                    val newSessionData: SessionData = request.session.data + ("role" -> roleName)
                    if sessionService.isStudent(newSessionData) then
                      enrolmentRepository.getReservationHeaders(request, userId).map { headers =>
                        val updatedSessionData =
                          sessionService.updateSessionWithReservationHeaders(
                            newSessionData,
                            headers
                          )
                        Ok(role.asJson).withSession(play.api.mvc.Session(updatedSessionData))
                      }
                    else
                      Future.successful(
                        Ok(role.asJson).withSession(play.api.mvc.Session(newSessionData))
                      )
                }
    }

  def extendSession: Action[AnyContent] = Action { request =>
    val newSessionData: SessionData = sessionService.extendSession
    Ok.withSession(play.api.mvc.Session(request.session.data ++ newSessionData))
  }

  def checkSession: Action[AnyContent] = Action.async { request =>
    sessionService
      .checkSession(request.session.get("since"), request.headers.toMap, request.remoteAddress)
      .flatMap {
        case Left(error) => Future.successful(toResult(error))
        case Right(status) =>
          val responseText = status match
            case CheckSessionStatus.NoSession => "no_session"
            case CheckSessionStatus.Alarm     => "alarm"
            case CheckSessionStatus.Valid     => ""
          // Update session with reservation headers if student
          request.session.get("id") match
            case Some(id) if sessionService.isStudent(request.session.data) =>
              val userId = id.toLong
              enrolmentRepository.getReservationHeaders(request, userId).map { headers =>
                val updatedSessionData =
                  sessionService.updateSessionWithReservationHeaders(request.session.data, headers)
                Ok(responseText).withSession(play.api.mvc.Session(updatedSessionData))
              }
            case _ => Future.successful(Ok(responseText).withSession(request.session))
      }
  }
