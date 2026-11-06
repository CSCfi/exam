// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.lti.services

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.crypto.RSASSAVerifier
import com.nimbusds.jwt.{JWTClaimsSet, SignedJWT}
import models.user.User
import play.api.Logging
import play.api.cache.SyncCacheApi

import java.time.Clock
import javax.inject.{Inject, Singleton}
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** The content a teacher picked in a tool: the custom parameters that open it, and its title. */
final case class DeepLinkSelection(title: Option[String], custom: Map[String, String])

/** Where a deep linking request is. Kept in the cache under its id for [[LtiDeepLinkService.Ttl]].
  */
enum DeepLinkState:
  case Pending(userId: Long, toolKey: String)

  /** `selection` is None when the teacher closed the picker without picking anything. */
  case Done(userId: Long, toolKey: String, selection: Option[DeepLinkSelection])

/** LTI Deep Linking: a teacher picks the content of an LTI question in the tool itself.
  *
  * The editor starts a request ([[create]]) and opens it in a popup window, which goes through the
  * same OIDC login as a launch, ending in the tool's picker. The tool posts the selection, signed
  * with its own key, to the platform's return URL. That post comes from the tool's page, so the
  * browser may leave the session cookie out; nothing here relies on the session. Instead the
  * request's id travels through the tool as `data`, ties the selection to the teacher who started
  * it, and can be completed only once. The editor then fetches the selection ([[result]]).
  */
@Singleton
class LtiDeepLinkService @Inject() (
    ltiService: LtiService,
    toolKeys: LtiToolKeys,
    cache: SyncCacheApi
) extends Logging:

  import LtiDeepLinkService.*

  private val clock = Clock.systemUTC()

  /** Starts a request to pick content in the tool. Returns its id. */
  def create(user: User, toolKey: String): Either[LtiError, String] =
    for
      tool <- ltiService.tool(toolKey)
      _    <- Either.cond(tool.supportsDeepLinking, (), LtiError.DeepLinkingNotSupported)
    yield
      val id = ltiService.generateNonce
      cache.set(cacheKey(id), DeepLinkState.Pending(user.id, tool.key), Ttl)
      id

  /** The tool of a request the user started and that is still waiting for the tool's answer. */
  def pending(id: String, user: User): Either[LtiError, LtiTool] =
    state(id) match
      case Some(DeepLinkState.Pending(userId, toolKey)) if userId == user.id =>
        ltiService.tool(toolKey)
      case _ => Left(LtiError.DeepLinkNotFound)

  /** Checks the selection a tool posted back and keeps it for the editor. Returns the request id.
    *
    * The message must be signed by the tool the request was made to, be addressed to this platform
    * and deployment, still be valid, and carry the request's id; a request is completed once.
    */
  def complete(jwt: String): Either[LtiError, String] =
    def invalid(reason: String) = LtiError.InvalidDeepLinkResponse(reason)
    for
      signed <- Try(SignedJWT.parse(jwt)).toEither.left.map(_ => invalid("not a signed JWT"))
      // Read before the signature is checked only to find the request, and with it the tool
      // whose key has to have signed it. Nothing is trusted until then.
      unverified <- Try(signed.getJWTClaimsSet).toEither.left.map(_ => invalid("no claims"))
      id         <- stringClaim(unverified, DataClaim).toRight(invalid("no data"))
      pending <- state(id) match
        case Some(p: DeepLinkState.Pending) => Right(p)
        case _                              => Left(invalid("no such request, or already done"))
      tool <- ltiService.tool(pending.toolKey)
      jwksUrl <- tool.jwksUrl.filter(_ => tool.supportsDeepLinking)
        .toRight(LtiError.DeepLinkingNotSupported)
      _ <- Either.cond(
        signed.getHeader.getAlgorithm == JWSAlgorithm.RS256,
        (),
        invalid("not signed with RS256")
      )
      key <- toolKeys.key(jwksUrl, Option(signed.getHeader.getKeyID))
      _ <- Try(signed.verify(RSASSAVerifier(key))).toOption.filter(identity)
        .toRight(invalid("bad signature"))
      claims = signed.getJWTClaimsSet
      _         <- checkClaims(claims, tool, id)
      selection <- selectionOf(claims, tool)
    yield
      cache.set(cacheKey(id), DeepLinkState.Done(pending.userId, tool.key, selection), Ttl)
      id

  /** The state of the user's own request. A finished one is handed out once, then forgotten. */
  def result(id: String, user: User): Either[LtiError, DeepLinkState] =
    state(id).filter {
      case DeepLinkState.Pending(userId, _) => userId == user.id
      case DeepLinkState.Done(userId, _, _) => userId == user.id
    }.toRight(LtiError.DeepLinkNotFound).map { s =>
      if s.isInstanceOf[DeepLinkState.Done] then cache.remove(cacheKey(id))
      s
    }

  private def state(id: String): Option[DeepLinkState] = cache.get[DeepLinkState](cacheKey(id))

  private def checkClaims(claims: JWTClaimsSet, tool: LtiTool, id: String): Either[LtiError, Unit] =
    def check(ok: Boolean, reason: String) =
      Either.cond(ok, (), LtiError.InvalidDeepLinkResponse(reason))
    val now = clock.instant
    for
      _ <- check(claims.getIssuer == tool.clientId, "not issued by the tool")
      _ <- check(
        Option(claims.getAudience).exists(_.asScala.exists(_.stripSuffix("/") == issuer)),
        "not addressed to this platform"
      )
      _ <- check(
        Option(claims.getExpirationTime).exists(_.toInstant.plus(ClockSkew).isAfter(now)),
        "expired"
      )
      _ <- check(
        Option(claims.getIssueTime).forall(_.toInstant.minus(ClockSkew).isBefore(now)),
        "issued in the future"
      )
      _ <- check(
        stringClaim(claims, s"$LtiClaim/message_type").contains("LtiDeepLinkingResponse"),
        "not a deep linking response"
      )
      _ <- check(stringClaim(claims, s"$LtiClaim/version").contains("1.3.0"), "not LTI 1.3")
      _ <- check(
        stringClaim(claims, s"$LtiClaim/deployment_id").contains(tool.deploymentId),
        "for another deployment"
      )
      _ <- check(stringClaim(claims, DataClaim).contains(id), "for another request")
    yield ()

  /** The picked resource link. None when nothing was picked. */
  private def selectionOf(
      claims: JWTClaimsSet,
      tool: LtiTool
  ): Either[LtiError, Option[DeepLinkSelection]] =
    val items = Try(Option(claims.getListClaim(ContentItemsClaim)).map(_.asScala.toList))
      .toOption.flatten.getOrElse(Nil)
      .collect { case item: java.util.Map[?, ?] =>
        item.asScala.toMap.map((k, v) => k.toString -> v)
      }
    if items.isEmpty then Right(None)
    else
      // A question opens one resource. The request asks for one, but Moodle's picker lets the
      // teacher tick several, so taking the first one would be a silent guess.
      items.filter(_.get("type").contains("ltiResourceLink")) match
        case Nil         => Left(LtiError.InvalidDeepLinkResponse("no resource link was picked"))
        case _ :: _ :: _ => Left(LtiError.DeepLinkTooManyPicks)
        case item :: Nil =>
          val custom = item.get("custom").collect { case m: java.util.Map[?, ?] =>
            m.asScala.toMap.collect { case (k, v) if v != null => k.toString -> v.toString }
          }.getOrElse(Map.empty)
          tool.customParameters(custom).map { params =>
            Some(DeepLinkSelection(item.get("title").map(_.toString).filter(_.nonEmpty), params))
          }

  private def stringClaim(claims: JWTClaimsSet, name: String): Option[String] =
    Option(claims.getClaim(name)).collect { case s: String => s }

  private def issuer: String = ltiService.issuer.stripSuffix("/")

object LtiDeepLinkService:
  /** How long a teacher has to pick, and the editor to fetch the result. */
  val Ttl: FiniteDuration = 15.minutes

  private val ClockSkew = java.time.Duration.ofMinutes(1)

  private val LtiClaim          = "https://purl.imsglobal.org/spec/lti/claim"
  private val DataClaim         = "https://purl.imsglobal.org/spec/lti-dl/claim/data"
  private val ContentItemsClaim = "https://purl.imsglobal.org/spec/lti-dl/claim/content_items"

  private def cacheKey(id: String) = s"lti-deep-link:$id"
