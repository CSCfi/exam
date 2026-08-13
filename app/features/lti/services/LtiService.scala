// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.lti.services

import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jose.jwk.{JWKSet, RSAKey}
import com.nimbusds.jose.{JOSEObjectType, JWSAlgorithm, JWSHeader}
import com.nimbusds.jwt.{JWTClaimsSet, SignedJWT}
import com.typesafe.config.Config
import models.user.User
import play.api.Logging

import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}
import java.security.interfaces.{RSAPrivateKey, RSAPublicKey}
import java.security.spec.{PKCS8EncodedKeySpec, X509EncodedKeySpec}
import java.security.{KeyFactory, SecureRandom}
import java.util.{Base64, Date, UUID}
import javax.inject.{Inject, Singleton}
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** LTI 1.3 platform-side support.
  *
  * EXAM acts as the *platform* here: it initiates an OIDC login against the tool (Moodle) and signs
  * the id_token that the tool validates against the JWKS endpoint below.
  *
  * Note on `state` and `nonce`: in third-party initiated login the *tool* generates both for its
  * authorization request. The values arriving at the callback are therefore Moodle's, not ours —
  * the platform's job is to echo the nonce into the id_token and hand the state back untouched, so
  * there is nothing here to compare against. The callback is instead bound to the session that
  * started it via `login_hint`, which the tool must return verbatim.
  */
@Singleton
class LtiService @Inject() (private val config: Config) extends Logging:

  private val TokenLifetime = 5 * 60 * 1000

  def initiateLoginUrl: String = config.getString("lti.tool.initiate-login-url")
  def issuer: String           = config.getString("lti.platform.issuer")
  def targetLinkUri: String    = config.getString("lti.platform.target-link-uri")
  def clientId: String         = config.getString("lti.platform.client-id")
  def deploymentId: String     = config.getString("lti.platform.deployment-id")
  def keyId: String            = config.getString("lti.platform.key-id")
  def publicKeyPath: String    = config.getString("lti.platform.public-key")
  def privateKeyPath: String   = config.getString("lti.platform.private-key")

  /** Redirect URIs the tool is allowed to receive the id_token on. Defaults to the configured
    * target link URI when no explicit allow-list is given.
    */
  def redirectUris: List[String] =
    if config.hasPath("lti.tool.redirect-uris") then
      config.getStringList("lti.tool.redirect-uris").asScala.toList.filter(_.nonEmpty)
    else List(targetLinkUri).filter(_.nonEmpty)

  /** Builds the OIDC third-party-initiated login URL the browser is redirected to. */
  def buildLoginRedirect(
      loginHint: String,
      nonce: String,
      state: String
  ): Either[LtiError, String] =
    if initiateLoginUrl.isEmpty || issuer.isEmpty || targetLinkUri.isEmpty || clientId.isEmpty then
      Left(LtiError.IncompleteConfiguration)
    else
      val separator = if initiateLoginUrl.contains("?") then "&" else "?"
      val params = Seq(
        "iss"             -> issuer,
        "login_hint"      -> loginHint,
        "target_link_uri" -> targetLinkUri,
        "client_id"       -> clientId,
        "nonce"           -> nonce,
        "state"           -> state
      ).map((k, v) => s"$k=${urlEncode(v)}").mkString("&")
      Right(s"$initiateLoginUrl$separator$params")

  /** The tool must echo back a registered redirect URI; anything else would leak the id_token. */
  def validateRedirectUri(uri: String): Either[LtiError, String] =
    Either.cond(redirectUris.contains(uri), uri, LtiError.InvalidRedirectUri)

  /** Opaque per-login token, returned verbatim by the tool, tying the callback to the session. */
  def generateLoginHint: String = randomToken

  def generateNonce: String = randomToken

  private def randomToken: String =
    val bytes = new Array[Byte](16)
    SecureRandom().nextBytes(bytes)
    Base64.getUrlEncoder.withoutPadding.encodeToString(bytes)

  /** Signs the LTI 1.3 resource link id_token for the given user and resource. */
  def buildIdToken(
      user: User,
      resourceId: String,
      nonce: String,
      redirectUri: String
  ): Either[LtiError, String] =
    val now = new Date()
    val exp = new Date(now.getTime + TokenLifetime)

    val context = Map(
      "id"    -> "platorm-internal-id-12345678",
      "label" -> "Oma tehtavava label",
      "title" -> "Oma tehtava title",
      "type"  -> List("http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering").asJava
    ).asJava
    val resourceLink = Map("id" -> resourceId, "title" -> "Tehtava moodle toolissa").asJava
    val custom       = Map("id" -> resourceId).asJava

    val claims = JWTClaimsSet
      .Builder()
      .issuer(issuer)
      .subject(user.eppn)
      .audience(clientId)
      .expirationTime(exp)
      .issueTime(now)
      .jwtID(UUID.randomUUID.toString)
      .claim("nonce", nonce)
      .claim("given_name", user.firstName)
      .claim("family_name", user.lastName)
      .claim("name", s"${user.firstName} ${user.lastName}")
      .claim("email", user.email)
      .claim("https://purl.imsglobal.org/spec/lti/claim/message_type", "LtiResourceLinkRequest")
      .claim("https://purl.imsglobal.org/spec/lti/claim/version", "1.3.0")
      .claim("https://purl.imsglobal.org/spec/lti/claim/deployment_id", deploymentId)
      .claim("https://purl.imsglobal.org/spec/lti/claim/target_link_uri", redirectUri)
      // FIXME: every launch is asserted as Learner regardless of the user's actual EXAM role.
      .claim(
        "https://purl.imsglobal.org/spec/lti/claim/roles",
        List("http://purl.imsglobal.org/vocab/lis/v2/membership#Learner").asJava
      )
      .claim("https://purl.imsglobal.org/spec/lti/claim/context", context)
      .claim("https://purl.imsglobal.org/spec/lti/claim/resource_link", resourceLink)
      .claim("https://purl.imsglobal.org/spec/lti/claim/custom", custom)
      .build()

    loadPrivateKey.map { key =>
      val header = JWSHeader.Builder(JWSAlgorithm.RS256).keyID(keyId).`type`(JOSEObjectType.JWT)
        .build()
      val jwt = SignedJWT(header, claims)
      jwt.sign(RSASSASigner(key))
      jwt.serialize
    }

  /** JWK set the tool fetches to verify tokens signed by [[buildIdToken]]. */
  def jwkSet: Either[LtiError, String] =
    loadPublicKey.map { key =>
      val jwk = RSAKey.Builder(key).keyID(keyId).algorithm(JWSAlgorithm.RS256).build()
      // toString, not toJSONObject.toString - the latter is a java.util.Map rendering, which no
      // tool can parse as JSON.
      JWKSet(jwk).toString
    }

  /** Self-submitting form; the launch has to reach the tool as a POST inside the same frame. */
  def buildAutoPostHtml(postUrl: String, idToken: String, state: String): String =
    s"""<!DOCTYPE html>
       |<html>
       |<head>
       |  <meta charset="utf-8"/>
       |  <title>LTI Launch</title>
       |</head>
       |<body>
       |  <form id="ltiLaunch" action="${escapeHtml(postUrl)}" method="POST" target="_self">
       |    <input type="hidden" name="id_token" value="${escapeHtml(idToken)}"/>
       |    <input type="hidden" name="state" value="${escapeHtml(state)}"/>
       |  </form>
       |  <noscript>
       |    <p>JavaScript is required to continue. Click the button below to launch.</p>
       |    <button form="ltiLaunch" type="submit">Continue</button>
       |  </noscript>
       |  <script>document.getElementById('ltiLaunch').submit();</script>
       |</body>
       |</html>
       |""".stripMargin

  private def loadPrivateKey: Either[LtiError, RSAPrivateKey] =
    readPem(privateKeyPath, "PRIVATE KEY").flatMap { der =>
      Try(
        KeyFactory.getInstance("RSA").generatePrivate(PKCS8EncodedKeySpec(der))
          .asInstanceOf[RSAPrivateKey]
      ).toEither.left.map { e =>
        logger.error("Failed to parse LTI private key", e)
        LtiError.KeyUnavailable
      }
    }

  private def loadPublicKey: Either[LtiError, RSAPublicKey] =
    readPem(publicKeyPath, "PUBLIC KEY").flatMap { der =>
      Try(
        KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(der))
          .asInstanceOf[RSAPublicKey]
      ).toEither.left.map { e =>
        logger.error("Failed to parse LTI public key", e)
        LtiError.KeyUnavailable
      }
    }

  private def readPem(path: String, label: String): Either[LtiError, Array[Byte]] =
    Try {
      val pem = String(Files.readAllBytes(Paths.get(path)), StandardCharsets.UTF_8)
      val body = pem
        .replace(s"-----BEGIN $label-----", "")
        .replace(s"-----END $label-----", "")
        .replaceAll("\\s", "")
      Base64.getDecoder.decode(body)
    }.toEither.left.map { e =>
      logger.error(s"Failed to read LTI key from $path", e)
      LtiError.KeyUnavailable
    }

  private def escapeHtml(input: String): String =
    input.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;")

  private def urlEncode(s: String): String = URLEncoder.encode(s, StandardCharsets.UTF_8)
