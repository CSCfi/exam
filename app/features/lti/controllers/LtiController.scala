// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.lti.controllers

import features.lti.services.*
import io.ebean.DB
import models.user.{Role, User}
import play.api.libs.json.{JsValue, Json}
import play.api.mvc.*
import play.api.mvc.request.RequestAttrKey
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import security.BlockingIOExecutionContext

import javax.inject.Inject

class LtiController @Inject() (
    private val ltiService: LtiService,
    private val deepLinks: LtiDeepLinkService,
    private val logins: LtiLogins,
    ltiActive: LtiActive,
    authenticatedAction: AuthenticatedAction,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController:

  // Every LTI endpoint is checked for lti.active first, before authentication.
  private val authenticated = Action.andThen(ltiActive).andThen(authenticatedAction)

  /** Whether LTI is active, for the UI to offer LTI questions. Answers when it is not, too. */
  def isActive: Action[AnyContent] = Action { _ =>
    Ok(Json.obj("ltiActive" -> ltiService.active))
  }

  private def toResult(error: LtiError): Result =
    error match
      case LtiError.KeyUnavailable      => InternalServerError(error.message)
      case LtiError.CspNonceUnavailable => InternalServerError(error.message)
      case LtiError.LaunchNotFound      => NotFound(error.message)
      case LtiError.DeepLinkNotFound    => NotFound(error.message)
      case LtiError.ToolKeysUnavailable => BadGateway(error.message)
      case _                            => BadRequest(error.message)

  /** Hands the UI the absolute URL its LTI iframe should point at. */
  def getStartLoginUrl: Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.STUDENT))
    ) { _ =>
      Ok(Json.obj("url" -> ltiService.startLoginUrl))
    }

  /** The configured tools and the parameters a question has to give each, for the editor. */
  def getTools: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { _ =>
      Ok(Json.toJson(ltiService.tools.values.toSeq.sortBy(_.name).map { tool =>
        Json.obj(
          "key"         -> tool.key,
          "name"        -> tool.name,
          "deepLinking" -> tool.supportsDeepLinking,
          "parameters" -> tool.parameters.map(p =>
            Json.obj("name" -> p.name, "required" -> p.required, "requires" -> p.requires)
          )
        )
      }))
    }

  /** Starts the OIDC third-party-initiated login against the question's tool. */
  def startLogin: Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.STUDENT))
    ) { request =>
      val target =
        for
          sectionQuestionId <- request.getQueryString("sectionQuestionId").flatMap(_.toLongOption)
          examHash          <- request.getQueryString("examHash").map(_.trim).filter(_.nonEmpty)
        yield (sectionQuestionId, examHash)
      // A launch runs in EXAM's frame unless opened in a window of its own. The window is the way
      // out when the tool cannot work in the frame, such as a login page that refuses framing.
      val documentTarget =
        if request.getQueryString("target").contains("window") then LtiDocumentTarget.Window
        else LtiDocumentTarget.Iframe
      // Fail before redirecting to the tool rather than in the callback, the user sees it sooner.
      // state and nonce here are spurious: the tool generates its own for the authorization
      // request. They are sent for parity with the original implementation; login_hint is
      // what actually ties the callback back to this login, see LtiLogins.
      val user = request.attrs(Auth.ATTR_USER)
      val result =
        for
          (sectionQuestionId, examHash) <- target.toRight(LtiError.MissingLaunchTarget)
          launch                        <- ltiService.findLaunch(sectionQuestionId, examHash, user)
          url <- ltiService.buildLoginRedirect(
            launch.tool,
            logins.start(
              user,
              LtiLoginTarget.Launch(sectionQuestionId, examHash, documentTarget)
            ),
            ltiService.generateNonce,
            java.util.UUID.randomUUID.toString
          )
        yield Redirect(url)
      result.fold(toResult, identity)
    }

  /** Starts a deep linking request, for the question editor to pick content in the tool. Answers
    * the URL of the popup window to open it in.
    */
  def createDeepLink: Action[JsValue] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))(parse.json) {
      request =>
        (request.body \ "tool").asOpt[String].toRight(LtiError.ToolNotConfigured)
          .flatMap(tool => deepLinks.create(request.attrs(Auth.ATTR_USER), tool))
          .fold(
            toResult,
            id =>
              Ok(Json.obj(
                "id" -> id,
                "url" -> s"${ltiService.issuer.stripSuffix("/")}/integration/lti/deep-link/$id/start"
              ))
          )
    }

  /** Starts the OIDC login of a deep linking request, in the popup window. */
  def startDeepLink(id: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val result =
        for
          tool <- deepLinks.pending(id, user)
          url <- ltiService.buildLoginRedirect(
            tool,
            logins.start(user, LtiLoginTarget.DeepLink(id)),
            ltiService.generateNonce,
            java.util.UUID.randomUUID.toString,
            tool.deepLinkingUrl
          )
        yield Redirect(url)
      result.fold(toResult, identity)
    }

  /** The tool posts the picked content here. Not bound to the session, see LtiDeepLinkService. The
    * page tells the editor that opened the popup to fetch the result, and closes the popup.
    */
  def completeDeepLink: Action[Map[String, Seq[String]]] =
    Action.andThen(ltiActive)(parse.formUrlEncoded) { request =>
      val result =
        for
          jwt <- request.body.get("JWT").flatMap(_.headOption).toRight(LtiError.MissingParameters)
          id  <- deepLinks.complete(jwt)
          cspNonce <- request.attrs.get(RequestAttrKey.CSPNonce)
            .toRight(LtiError.CspNonceUnavailable)
        yield ltiService.buildDeepLinkDoneHtml(id, cspNonce)
      result match
        case Left(error) =>
          // The teacher sees this in the popup, so a page rather than the bare message.
          Status(toResult(error).header.status)(ltiService.buildDeepLinkFailedHtml(error))
            .as("text/html")
        case Right(html) => Ok(html).as("text/html").withHeaders("Cache-Control" -> "no-store")
    }

  /** The state of a deep linking request the user started; a finished one is answered once. */
  def getDeepLink(id: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { request =>
      deepLinks.result(id, request.attrs(Auth.ATTR_USER)) match
        case Left(error)                           => toResult(error)
        case Right(DeepLinkState.Pending(_, _))    => Ok(Json.obj("status" -> "pending"))
        case Right(DeepLinkState.Done(_, _, None)) => Ok(Json.obj("status" -> "cancelled"))
        case Right(DeepLinkState.Done(_, _, Some(selection))) =>
          Ok(Json.obj(
            "status" -> "done",
            "title"  -> selection.title,
            "custom" -> selection.custom
          ))
    }

  /** Tool calls back here; responds with a self-submitting form carrying the signed id_token.
    *
    * Not bound to the session: the browser leaves the session cookie out when the tool is on
    * another site. The login_hint finds the login instead, see LtiLogins.
    */
  def handleOidcLogin: Action[AnyContent] =
    Action.andThen(ltiActive) { request =>
      val redirectUri = request.getQueryString("redirect_uri")
      val state       = request.getQueryString("state")
      val nonce       = request.getQueryString("nonce")

      val result =
        for
          params <- (redirectUri, state, nonce) match
            case (Some(uri), Some(s), Some(n)) => Right((uri, s, n))
            case _                             => Left(LtiError.MissingParameters)
          (uri, toolState, toolNonce) = params
          // The tool must return the login_hint we issued: it finds the login, and with it the
          // user, and can be used once.
          login <- request.getQueryString("login_hint").toRight(LtiError.UnknownLoginHint)
            .flatMap(logins.take)
          user <- loginUser(login)
          // Resolved again rather than trusted from the login: the launch, or the deep linking
          // request, decides the tool, and the callback has to come from that tool and go back to
          // one of its redirect URIs.
          message <- login.target match
            case LtiLoginTarget.DeepLink(id) =>
              deepLinks.pending(id, user).map { tool =>
                (
                  tool,
                  (to: String) => ltiService.buildDeepLinkingToken(user, tool, toolNonce, to, id)
                )
              }
            case LtiLoginTarget.Launch(sectionQuestionId, examHash, documentTarget) =>
              ltiService.findLaunch(sectionQuestionId, examHash, user).map { launch =>
                (
                  launch.tool,
                  (to: String) =>
                    ltiService.buildIdToken(user, launch, toolNonce, to, documentTarget)
                )
              }
          (tool, signFor) = message
          _ <- Either.cond(
            request.getQueryString("client_id").contains(tool.clientId),
            (),
            LtiError.InvalidClientId
          )
          validatedUri <- tool.validateRedirectUri(uri)
          // Set by the CSP filter; the auto-submit script is inline, so it needs the nonce to run.
          cspNonce <- request.attrs
            .get(RequestAttrKey.CSPNonce)
            .toRight(LtiError.CspNonceUnavailable)
          idToken <- signFor(validatedUri)
        yield ltiService.buildAutoPostHtml(validatedUri, idToken, toolState, cspNonce)

      result match
        case Left(error) => toResult(error)
        case Right(html) =>
          Ok(html)
            .as("text/html")
            .withHeaders("Cache-Control" -> "no-store", "Pragma" -> "no-cache")
    }

  /** The user who started the login, in the role they started it in. */
  private def loginUser(login: LtiLogin): Either[LtiError, User] =
    Option(DB.find(classOf[User], login.userId)).toRight(LtiError.UnknownLoginHint).map { user =>
      user.loginRole = login.role
      user
    }
