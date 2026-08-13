// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.lti.controllers

import features.lti.services.{LtiError, LtiService}
import models.user.Role
import play.api.mvc.*
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import security.BlockingIOExecutionContext

import javax.inject.Inject

class LtiController @Inject() (
    private val ltiService: LtiService,
    authenticated: AuthenticatedAction,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController:

  private def toResult(error: LtiError): Result =
    error match
      case LtiError.KeyUnavailable => InternalServerError(error.message)
      case _                       => BadRequest(error.message)

  /** Starts the OIDC third-party-initiated login against the tool. */
  def startLogin: Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.STUDENT))
    ) { request =>
      request.getQueryString("resourceId").map(_.trim).filter(_.nonEmpty) match
        case None             => toResult(LtiError.MissingResourceId)
        case Some(resourceId) =>
          // state and nonce here are spurious: the tool generates its own for the authorization
          // request. They are sent for parity with the original implementation; login_hint is
          // what actually ties the callback back to this session.
          val loginHint = ltiService.generateLoginHint
          val state     = java.util.UUID.randomUUID.toString
          val nonce     = ltiService.generateNonce
          ltiService.buildLoginRedirect(loginHint, nonce, state) match
            case Left(error) => toResult(error)
            case Right(url) =>
              Redirect(url).addingToSession(
                "lti_login_hint"  -> loginHint,
                "lti_resource_id" -> resourceId
              )(using request)
    }

  /** Tool calls back here; responds with a self-submitting form carrying the signed id_token. */
  def handleOidcLogin: Action[AnyContent] =
    authenticated { request =>
      val redirectUri = request.getQueryString("redirect_uri")
      val state       = request.getQueryString("state")
      val nonce       = request.getQueryString("nonce")

      val result =
        for
          _ <- Either.cond(
            request.getQueryString("client_id").contains(ltiService.clientId),
            (),
            LtiError.InvalidClientId
          )
          params <- (redirectUri, state, nonce) match
            case (Some(uri), Some(s), Some(n)) => Right((uri, s, n))
            case _                             => Left(LtiError.MissingParameters)
          (uri, toolState, toolNonce) = params
          // The tool must return the login_hint we issued, which is what binds this callback
          // to the session that started the login.
          _ <- Either.cond(
            request
              .getQueryString("login_hint")
              .exists(hint => request.session.get("lti_login_hint").contains(hint)),
            (),
            LtiError.LoginHintMismatch
          )
          validatedUri <- ltiService.validateRedirectUri(uri)
          resourceId <- request.session
            .get("lti_resource_id")
            .map(_.trim)
            .filter(_.nonEmpty)
            .toRight(LtiError.NoResourceIdInSession)
          idToken <- ltiService.buildIdToken(
            request.attrs(Auth.ATTR_USER),
            resourceId,
            toolNonce,
            validatedUri
          )
        yield ltiService.buildAutoPostHtml(validatedUri, idToken, toolState)

      result match
        case Left(error) => toResult(error)
        case Right(html) =>
          Ok(html)
            .as("text/html")
            .withHeaders("Cache-Control" -> "no-store", "Pragma" -> "no-cache")
    }
