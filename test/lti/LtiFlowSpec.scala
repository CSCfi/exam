// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package lti

import base.BaseIntegrationSpec
import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.crypto.RSASSAVerifier
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jwt.{JWTClaimsSet, SignedJWT}
import play.api.Application
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.mvc.{Result, Session}

import java.net.{URI, URLDecoder, URLEncoder}
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path}
import java.security.KeyPairGenerator
import java.util.Base64
import scala.jdk.CollectionConverters.*

/** End-to-end test of the LTI 1.3 platform side, with this spec standing in for the tool.
  *
  * No Moodle needed: everything the tool does in a launch is done here — echo back the issued
  * `login_hint`, supply its own `state`/`nonce`, then verify the returned `id_token` against the
  * JWK set the platform publishes. That last step is the point of doing this as an integration test
  * rather than a unit test: it is the only thing that catches a mismatch between the key
  * [[features.lti.services.LtiService.buildIdToken]] signs with and the key
  * [[features.lti.controllers.JwksController]] hands out.
  *
  * All LTI settings other than the key paths come from `conf/application.conf`, so a change there
  * that breaks the flow (an unregistered redirect URI, a CSP that blocks the launch POST) fails
  * here rather than at a real tool.
  */
class LtiFlowSpec extends BaseIntegrationSpec:

  private val ResourceId = "resource-42"
  private val ToolState  = "tool-state-abc"
  private val ToolNonce  = "tool-nonce-xyz"

  /** Throwaway RSA key pair; the shipped config points at placeholder paths. Generated once for the
    * suite, written as PEM the way [[features.lti.services.LtiService]] expects to read it.
    */
  private lazy val keyPaths: (String, String) =
    val generator = KeyPairGenerator.getInstance("RSA")
    generator.initialize(2048)
    val pair   = generator.generateKeyPair()
    val dir    = Files.createTempDirectory("lti-test-keys")
    val base64 = Base64.getMimeEncoder(64, Array('\n'.toByte))

    def writePem(name: String, label: String, encoded: Array[Byte]): String =
      val pem = s"-----BEGIN $label-----\n${base64.encodeToString(encoded)}\n-----END $label-----\n"
      val path: Path = Files.write(dir.resolve(name), pem.getBytes(StandardCharsets.UTF_8))
      path.toFile.deleteOnExit()
      path.toAbsolutePath.toString

    dir.toFile.deleteOnExit()
    (
      writePem("private.pem", "PRIVATE KEY", pair.getPrivate.getEncoded),
      writePem("public.pem", "PUBLIC KEY", pair.getPublic.getEncoded)
    )

  override def fakeApplication(): Application =
    val (privateKey, publicKey) = keyPaths
    new GuiceApplicationBuilder()
      .configure(
        "lti.platform.private-key" -> privateKey,
        "lti.platform.public-key"  -> publicKey
      )
      .build()

  private def setting(key: String): String = app.configuration.get[String](key)
  private def clientId: String             = setting("lti.platform.client-id")
  private def launchUri: String =
    app.configuration.get[Seq[String]]("lti.tool.redirect-uris").head

  private def encode(s: String): String = URLEncoder.encode(s, StandardCharsets.UTF_8)

  private def queryOf(url: String): Map[String, String] =
    url
      .split("\\?", 2)
      .drop(1)
      .headOption
      .getOrElse("")
      .split("&")
      .filter(_.nonEmpty)
      .map(_.split("=", 2))
      .map(kv =>
        URLDecoder.decode(kv(0), StandardCharsets.UTF_8) ->
          (if kv.length > 1 then URLDecoder.decode(kv(1), StandardCharsets.UTF_8) else "")
      )
      .toMap

  /** Step 1: the user starts a launch. Returns the redirect the browser would follow and the
    * session it has to carry into the callback.
    */
  private def initiateLogin(
      userSession: Session,
      resourceId: String = ResourceId
  ): (Result, Session) =
    val result = runIO(
      get(s"/integration/lti/start-login?resourceId=${encode(resourceId)}", session = userSession)
    )
    (result, sessionOf(result))

  /** Step 2: what the tool sends back to the platform's OIDC endpoint. `state` and `nonce` are the
    * tool's own — the platform never issued them and has nothing to compare them against.
    */
  private def toolParams(loginHint: String): Map[String, String] = Map(
    "client_id"    -> clientId,
    "redirect_uri" -> launchUri,
    "login_hint"   -> loginHint,
    "state"        -> ToolState,
    "nonce"        -> ToolNonce
  )

  private def callback(session: Session, params: Map[String, String]): Result =
    val query = params.map((k, v) => s"$k=${encode(v)}").mkString("&")
    runIO(get(s"/integration/lti/oidc/login?$query", session = session))

  private def formValue(html: String, name: String): String =
    val pattern = ("name=\"" + name + "\" value=\"([^\"]*)\"").r
    pattern.findFirstMatchIn(html).map(_.group(1)).getOrElse(fail(s"No $name in the launch form"))

  private def formAction(html: String): String =
    "action=\"([^\"]*)\"".r
      .findFirstMatchIn(html)
      .map(_.group(1))
      .getOrElse(fail("No action in the launch form"))

  /** Step 3: verify the token exactly as the tool would — fetch the JWK set, pick the key by the
    * `kid` in the header, check the signature.
    */
  private def verifyAsTool(idToken: String): JWTClaimsSet =
    val jwks = JWKSet.parse(contentAsStringOf(runIO(get("/integration/lti/oidc/jwks"))))
    val jwt  = SignedJWT.parse(idToken)
    jwt.getHeader.getAlgorithm must be(JWSAlgorithm.RS256)
    val key = Option(jwks.getKeyByKeyId(jwt.getHeader.getKeyID))
      .getOrElse(fail(s"JWK set has no key for kid '${jwt.getHeader.getKeyID}'"))
    jwt.verify(RSASSAVerifier(key.toRSAKey)) must be(true)
    jwt.getJWTClaimsSet

  /** The whole happy path, ending in a verified token. */
  private def launch(): (String, JWTClaimsSet) =
    val (_, userSession) = runIO(loginAsTeacher())
    val (_, ltiSession)  = initiateLogin(userSession)
    val loginHint        = ltiSession("lti_login_hint")
    val result           = callback(ltiSession, toolParams(loginHint))
    statusOf(result) must be(Status.OK)
    val html = contentAsStringOf(result)
    (html, verifyAsTool(formValue(html, "id_token")))

  "The JWKS endpoint" should:
    "publish the public key without authentication" in:
      val result = runIO(get("/integration/lti/oidc/jwks"))
      statusOf(result) must be(Status.OK)
      val keys = JWKSet.parse(contentAsStringOf(result)).getKeys.asScala
      keys must have size 1
      keys.head.getKeyID must be(setting("lti.platform.key-id"))

    "never leak private key material" in:
      val keys = JWKSet.parse(contentAsStringOf(runIO(get("/integration/lti/oidc/jwks")))).getKeys
      keys.asScala.foreach(_.isPrivate must be(false))

  "Login initiation" should:
    "redirect to the tool with the parameters it needs to call back" in:
      val (_, userSession) = runIO(loginAsTeacher())
      val (result, _)      = initiateLogin(userSession)
      statusOf(result) must be(Status.SEE_OTHER)
      val location = headerOf(result, "Location").getOrElse(fail("No redirect"))
      location must startWith(setting("lti.tool.initiate-login-url").split("\\?").head)
      val params = queryOf(location)
      params("iss") must be(setting("lti.platform.issuer"))
      params("client_id") must be(clientId)
      params("target_link_uri") must be(setting("lti.platform.target-link-uri"))
      params("login_hint") must not be empty

    "keep query parameters already present in the configured tool URL" in:
      val configured       = queryOf(setting("lti.tool.initiate-login-url"))
      val (_, userSession) = runIO(loginAsTeacher())
      val (result, _)      = initiateLogin(userSession)
      val params           = queryOf(headerOf(result, "Location").getOrElse(fail("No redirect")))
      configured.foreach((k, v) => params.get(k) must be(Some(v)))

    "bind the launch to this session" in:
      val (_, userSession) = runIO(loginAsTeacher())
      val (_, ltiSession)  = initiateLogin(userSession)
      ltiSession.get("lti_login_hint") must not be empty
      ltiSession.get("lti_resource_id") must be(Some(ResourceId))

    "issue a distinct login_hint per launch" in:
      val (_, userSession) = runIO(loginAsTeacher())
      val first            = initiateLogin(userSession)._2("lti_login_hint")
      val second           = initiateLogin(userSession)._2("lti_login_hint")
      first must not be second

    "reject a launch without a resource id" in:
      val (_, userSession) = runIO(loginAsTeacher())
      val result           = runIO(get("/integration/lti/start-login", session = userSession))
      statusOf(result) must be(Status.BAD_REQUEST)

    "require an authenticated user" in:
      statusOf(runIO(get(s"/integration/lti/start-login?resourceId=$ResourceId"))) must be(
        Status.UNAUTHORIZED
      )

  "A launch" should:
    "produce an id_token the tool can verify against the published JWKS" in:
      val (_, claims) = launch()
      claims.getIssuer must be(setting("lti.platform.issuer"))
      claims.getAudience.asScala must contain(clientId)

    "identify the logged-in user" in:
      val (user, userSession) = runIO(loginAsTeacher())
      val (_, ltiSession)     = initiateLogin(userSession)
      val result              = callback(ltiSession, toolParams(ltiSession("lti_login_hint")))
      val claims              = verifyAsTool(formValue(contentAsStringOf(result), "id_token"))
      claims.getSubject must be(user.eppn)
      claims.getStringClaim("email") must be(user.email)
      claims.getStringClaim("given_name") must be(user.firstName)
      claims.getStringClaim("family_name") must be(user.lastName)

    "echo the tool's nonce and hand back its state untouched" in:
      val (html, claims) = launch()
      claims.getStringClaim("nonce") must be(ToolNonce)
      formValue(html, "state") must be(ToolState)

    "carry the required LTI 1.3 resource link claims" in:
      val (_, claims) = launch()
      val lti         = "https://purl.imsglobal.org/spec/lti/claim"
      claims.getStringClaim(s"$lti/message_type") must be("LtiResourceLinkRequest")
      claims.getStringClaim(s"$lti/version") must be("1.3.0")
      claims.getStringClaim(s"$lti/deployment_id") must be(setting("lti.platform.deployment-id"))
      claims.getStringClaim(s"$lti/target_link_uri") must be(launchUri)
      claims.getJSONObjectClaim(s"$lti/resource_link").get("id") must be(ResourceId)
      claims.getJSONObjectClaim(s"$lti/custom").get("id") must be(ResourceId)
      claims.getJWTID must not be empty

    // Pinning current behaviour, not endorsing it: LtiService asserts every launch as Learner
    // regardless of the user's EXAM role (see the FIXME on the roles claim). This test is meant
    // to fail when that is fixed, so the change is deliberate.
    "assert the launching user as a Learner, even when they are a teacher" in:
      val (_, claims) = launch()
      val roles = claims
        .getStringListClaim("https://purl.imsglobal.org/spec/lti/claim/roles")
        .asScala
      roles must contain("http://purl.imsglobal.org/vocab/lis/v2/membership#Learner")

    "expire five minutes after issue" in:
      val (_, claims) = launch()
      val lifetime    = claims.getExpirationTime.getTime - claims.getIssueTime.getTime
      lifetime must be(5 * 60 * 1000)

    "post the token to the validated redirect URI" in:
      val (html, _) = launch()
      formAction(html) must be(launchUri)

    // The launch is a self-submitting cross-origin form POST, so form-action has to allow the
    // tool's origin or the browser blocks it. Fails if the LTI settings and the CSP drift apart.
    "be allowed to post cross-origin by the CSP" in:
      val (_, userSession) = runIO(loginAsTeacher())
      val (_, ltiSession)  = initiateLogin(userSession)
      val result           = callback(ltiSession, toolParams(ltiSession("lti_login_hint")))
      val csp    = headerOf(result, "Content-Security-Policy").getOrElse(fail("No CSP header"))
      val tool   = URI(launchUri)
      val origin = s"${tool.getScheme}://${tool.getAuthority}"
      csp must include(s"form-action $origin")

    // The controller sets its own no-store, but SystemFilter overwrites Cache-Control on every
    // /integration response - so assert the property, not the exact value the controller asked for.
    "not be cached" in:
      val (_, userSession) = runIO(loginAsTeacher())
      val (_, ltiSession)  = initiateLogin(userSession)
      val result           = callback(ltiSession, toolParams(ltiSession("lti_login_hint")))
      headerOf(result, "Cache-Control").getOrElse(fail("No Cache-Control")) must include("no-store")

  "A tampered callback" should:
    "be rejected when the client_id is not ours" in:
      val (_, userSession) = runIO(loginAsTeacher())
      val (_, ltiSession)  = initiateLogin(userSession)
      val params = toolParams(ltiSession("lti_login_hint")) + ("client_id" -> "someone-else")
      statusOf(callback(ltiSession, params)) must be(Status.BAD_REQUEST)

    "not hand the token to an unregistered redirect_uri" in:
      val (_, userSession) = runIO(loginAsTeacher())
      val (_, ltiSession)  = initiateLogin(userSession)
      val params =
        toolParams(ltiSession("lti_login_hint")) + ("redirect_uri" -> "https://attacker.test/steal")
      val result = callback(ltiSession, params)
      statusOf(result) must be(Status.BAD_REQUEST)
      contentAsStringOf(result) must not include "id_token"

    "be rejected when a required parameter is missing" in:
      val (_, userSession) = runIO(loginAsTeacher())
      val (_, ltiSession)  = initiateLogin(userSession)
      val full             = toolParams(ltiSession("lti_login_hint"))
      Seq("redirect_uri", "state", "nonce").foreach { missing =>
        withClue(s"missing $missing: ")(
          statusOf(callback(ltiSession, full - missing)) must be(Status.BAD_REQUEST)
        )
      }

    "be rejected when the login_hint is missing" in:
      val (_, userSession) = runIO(loginAsTeacher())
      val (_, ltiSession)  = initiateLogin(userSession)
      val params           = toolParams(ltiSession("lti_login_hint")) - "login_hint"
      statusOf(callback(ltiSession, params)) must be(Status.BAD_REQUEST)

    // The guard that keeps a launch started in one session from being completed in another.
    "be rejected when the login_hint belongs to a different session" in:
      val (_, teacherSession) = runIO(loginAsTeacher())
      val teacherHint         = initiateLogin(teacherSession)._2("lti_login_hint")
      val (_, studentSession) = runIO(loginAsStudent())
      val (_, studentLti)     = initiateLogin(studentSession)
      val result              = callback(studentLti, toolParams(teacherHint))
      statusOf(result) must be(Status.BAD_REQUEST)
      contentAsStringOf(result) must not include "id_token"

    "be rejected when the session has no resource id" in:
      val (_, userSession) = runIO(loginAsTeacher())
      val (_, ltiSession)  = initiateLogin(userSession)
      val stripped         = Session(ltiSession.data - "lti_resource_id")
      statusOf(callback(stripped, toolParams(ltiSession("lti_login_hint")))) must be(
        Status.BAD_REQUEST
      )

    "require an authenticated user" in:
      statusOf(callback(Session(), toolParams("some-hint"))) must be(Status.UNAUTHORIZED)
