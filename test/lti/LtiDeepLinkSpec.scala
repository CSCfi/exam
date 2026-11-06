// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package lti

import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator
import com.nimbusds.jose.{JWSAlgorithm, JWSHeader}
import com.nimbusds.jwt.{JWTClaimsSet, SignedJWT}
import features.lti.services.{LtiError, LtiToolKeys}
import play.api.http.Status
import play.api.inject.bind
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*
import play.api.mvc.{Result, Session}
import play.api.test.FakeRequest
import play.api.test.Helpers.*

import java.util.Date
import scala.concurrent.Await
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

/** LTI Deep Linking against the `moodle` tool of conf/integrationtest.conf, with this spec standing
  * in for Moodle: it signs its deep linking responses the way Moodle's `enrol/lti/configure.php`
  * does (MOODLE_501_STABLE), with its own key, served to the platform through [[LtiToolKeys]].
  */
class LtiDeepLinkSpec extends LtiIntegrationSpec:

  private val Dl              = "https://purl.imsglobal.org/spec/lti-dl/claim"
  private val Lti             = "https://purl.imsglobal.org/spec/lti/claim"
  private val ResourceUuid    = "0a8c3e39-1b8f-4a52-9d0f-8f6f5f4f7c11"
  private lazy val toolKey    = RSAKeyGenerator(2048).keyID("moodle-key").generate()
  private lazy val strangeKey = RSAKeyGenerator(2048).keyID("moodle-key").generate()

  private object StubToolKeys extends LtiToolKeys:
    override def key(jwksUrl: String, keyId: Option[String]): Either[LtiError, RSAKey] =
      Either.cond(
        jwksUrl == setting("lti.tools.moodle.jwks-url") && keyId.contains(toolKey.getKeyID),
        toolKey.toPublicJWK,
        LtiError.InvalidDeepLinkResponse("unknown key")
      )

  override protected def customise(builder: GuiceApplicationBuilder): GuiceApplicationBuilder =
    builder.overrides(bind[LtiToolKeys].toInstance(StubToolKeys))

  private def deepLinkingUrl = setting("lti.tools.moodle.deep-linking-url")

  private def create(session: Session, tool: String = "moodle"): Result =
    runIO(makeRequest(
      POST,
      "/app/lti/deep-link",
      Some(Json.obj("tool" -> tool)),
      session = session
    ))

  /** A teacher who has started a deep linking request; the request id and the URL to open. */
  private def created(): (Session, String, String) =
    val (_, session) = runIO(loginAsTeacher())
    val json         = contentAsJsonOf(create(session))
    (session, (json \ "id").as[String], (json \ "url").as[String])

  private def start(session: Session, id: String): (Result, Session) =
    val result = runIO(get(s"/integration/lti/deep-link/$id/start", session = session))
    (result, sessionOf(result))

  /** What Moodle answers once the teacher has picked a resource. */
  private def response(
      id: String,
      items: Seq[Map[String, Any]] = Seq(item()),
      edit: JWTClaimsSet.Builder => JWTClaimsSet.Builder = identity,
      key: RSAKey = toolKey
  ): String =
    val now = System.currentTimeMillis
    val claims = JWTClaimsSet
      .Builder()
      .issuer(setting("lti.tools.moodle.client-id"))
      .audience(List(setting("lti.platform.issuer")).asJava)
      .expirationTime(Date(now + 600_000))
      .issueTime(Date(now))
      .claim("nonce", "nonce-moodle")
      .claim(s"$Lti/deployment_id", setting("lti.tools.moodle.deployment-id"))
      .claim(s"$Lti/message_type", "LtiDeepLinkingResponse")
      .claim(s"$Lti/version", "1.3.0")
      .claim(s"$Dl/content_items", items.map(toJava).asJava)
      .claim(s"$Dl/data", id)
    val jwt = SignedJWT(
      JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID).build(),
      edit(claims).build()
    )
    jwt.sign(RSASSASigner(key))
    jwt.serialize

  private def item(custom: Map[String, String] = Map("id" -> ResourceUuid)): Map[String, Any] =
    Map(
      "type"   -> "ltiResourceLink",
      "url"    -> launchUri(),
      "title"  -> "Week 1 quiz",
      "custom" -> custom
    )

  private def toJava(value: Any): Any = value match
    case m: Map[?, ?] => m.map((k, v) => k.toString -> toJava(v)).asJava
    case s: Seq[?]    => s.map(toJava).asJava
    case other        => other

  /** The tool posts the response from a form on its own page, as a browser does: from the tool's
    * origin (which CORS does not allow), with no session and no CSRF token.
    */
  private def complete(jwt: String): Result =
    val request = FakeRequest(POST, "/integration/lti/deep-link/return")
      .withHeaders("Origin" -> setting("lti.tools.moodle.origin"))
      .withFormUrlEncodedBody("JWT" -> jwt)
    Await.result(route(app, request).getOrElse(fail("No route")), 30.seconds)

  private def resultOf(session: Session, id: String): Result =
    runIO(get(s"/app/lti/deep-link/$id", session = session))

  "The tools endpoint" should:
    "tell which tools let teachers pick content in the tool" in:
      val (_, session) = runIO(loginAsTeacher())
      val tools = contentAsJsonOf(runIO(get("/app/lti/tools", session = session)))
        .as[Seq[JsObject]]
      tools.map(t => (t \ "key").as[String] -> (t \ "deepLinking").as[Boolean]).toMap must be(
        Map("moodle" -> true, "aplus" -> false)
      )

  "Starting a deep linking request" should:
    "answer the URL of the popup to open it in" in:
      val (_, id, url) = created()
      url must be(
        s"${setting("lti.platform.issuer").stripSuffix("/")}/integration/lti/deep-link/$id/start"
      )

    "be refused for a tool without deep linking, or no tool" in:
      val (_, session) = runIO(loginAsTeacher())
      statusOf(create(session, "aplus")) must be(Status.BAD_REQUEST)
      statusOf(create(session, "removed-tool")) must be(Status.BAD_REQUEST)

    "not be available to students" in:
      val (_, session) = runIO(loginAsStudent())
      statusOf(create(session)) must be(Status.FORBIDDEN)

  "The popup" should:
    "log in to the tool for its deep linking URL" in:
      val (session, id, _)     = created()
      val (result, ltiSession) = start(session, id)
      statusOf(result) must be(Status.SEE_OTHER)
      val params = queryOf(headerOf(result, "Location").getOrElse(fail("No redirect")))
      params("target_link_uri") must be(deepLinkingUrl)
      params("client_id") must be(clientId())
      ltiSession.get("lti_deep_link_id") must be(Some(id))
      ltiSession.get("lti_login_hint") must be(params.get("login_hint"))
      ltiSession.get("lti_section_question_id") must be(None)

    "not open another user's request" in:
      val (_, id, _) = created()
      val (_, admin) = runIO(loginAsAdmin())
      statusOf(start(admin, id)._1) must be(Status.NOT_FOUND)

  "The deep linking request" should:
    def requestClaims(): (String, JWTClaimsSet, String) =
      val (session, id, _) = created()
      val ltiSession       = start(session, id)._2
      val params = toolParams(ltiSession("lti_login_hint")) + ("redirect_uri" -> deepLinkingUrl)
      val result = callback(ltiSession, params)
      statusOf(result) must be(Status.OK)
      val html = contentAsStringOf(result)
      (id, verifyAsTool(formValue(html, "id_token")), formAction(html))

    // What Moodle's lti1p3 DeepLinkMessageValidator requires, plus our data and return URL.
    "carry the deep linking settings Moodle requires" in:
      val (id, claims, _) = requestClaims()
      claims.getStringClaim(s"$Lti/message_type") must be("LtiDeepLinkingRequest")
      claims.getStringClaim(s"$Lti/version") must be("1.3.0")
      claims.getSubject must not be empty
      claims.getStringListClaim(s"$Lti/roles").asScala must not be empty
      val settings = claims.getJSONObjectClaim(s"$Dl/deep_linking_settings").asScala
      settings("deep_link_return_url") must be(
        s"${setting("lti.platform.issuer").stripSuffix("/")}/integration/lti/deep-link/return"
      )
      settings("accept_types").asInstanceOf[java.util.List[?]].asScala must contain(
        "ltiResourceLink"
      )
      settings("accept_presentation_document_targets").asInstanceOf[java.util.List[?]].asScala must
        not be empty
      settings("data") must be(id)

    "be addressed to the tool and posted to its deep linking URL" in:
      val (_, claims, action) = requestClaims()
      claims.getAudience.asScala must be(Seq(clientId()))
      claims.getStringClaim(s"$Lti/target_link_uri") must be(deepLinkingUrl)
      claims.getClaim(s"$Lti/resource_link") must be(null)
      action must be(deepLinkingUrl)

    // The session holds one login in progress; a launch started later replaces the request.
    "not turn a later launch into a deep linking request" in:
      val (teacher, session) = runIO(loginAsTeacher())
      val id                 = (contentAsJsonOf(create(session)) \ "id").as[String]
      val afterDeepLink      = start(session, id)._2
      val (_, claims)        = launchAs(afterDeepLink, setUpLtiQuestion(teacher))
      claims.getStringClaim(s"$Lti/message_type") must be("LtiResourceLinkRequest")

  // Everything else coming from the tool's origin is still refused by CORS.
  "CORS" should:
    "still refuse script requests from the tool's origin to EXAM's API" in:
      val (_, session) = runIO(loginAsTeacher())
      val request = FakeRequest(GET, "/app/lti/tools")
        .withHeaders("Origin" -> setting("lti.tools.moodle.origin"))
        .withSession(session.data.toSeq*)
      statusOf(Await.result(route(app, request).getOrElse(fail("No route")), 30.seconds)) must be(
        Status.FORBIDDEN
      )

  "The tool's answer" should:
    "be kept for the teacher, who gets it once" in:
      val (session, id, _) = created()
      val page             = complete(response(id))
      statusOf(page) must be(Status.OK)
      val html = contentAsStringOf(page)
      html must include(s""""id":"$id"""")
      html must include(s""""${setting("exam.application.hostname").stripSuffix("/")}"""")

      val result = resultOf(session, id)
      statusOf(result) must be(Status.OK)
      val json = contentAsJsonOf(result)
      (json \ "status").as[String] must be("done")
      (json \ "title").as[String] must be("Week 1 quiz")
      (json \ "custom").as[Map[String, String]] must be(Map("id" -> ResourceUuid))
      statusOf(resultOf(session, id)) must be(Status.NOT_FOUND)

    "be pending until the tool has answered" in:
      val (session, id, _) = created()
      (contentAsJsonOf(resultOf(session, id)) \ "status").as[String] must be("pending")

    "not be given to another user" in:
      val (_, id, _) = created()
      complete(response(id))
      val (_, admin) = runIO(loginAsAdmin())
      statusOf(resultOf(admin, id)) must be(Status.NOT_FOUND)

    "tell when the teacher picked nothing" in:
      val (session, id, _) = created()
      statusOf(complete(response(id, items = Nil))) must be(Status.OK)
      (contentAsJsonOf(resultOf(session, id)) \ "status").as[String] must be("cancelled")

    "keep only the parameters the tool declares" in:
      val (session, id, _) = created()
      complete(response(id, Seq(item(Map("id" -> ResourceUuid, "other" -> "x")))))
      (contentAsJsonOf(resultOf(session, id)) \ "custom").as[Map[String, String]] must be(
        Map("id" -> ResourceUuid)
      )

    // Moodle's picker lets the teacher tick several, though the request asks for one.
    "be refused, with a page saying so, when more than one resource was picked" in:
      val (session, id, _) = created()
      val page             = complete(response(id, Seq(item(), item(Map("id" -> "other-uuid")))))
      statusOf(page) must be(Status.BAD_REQUEST)
      contentAsStringOf(page) must include("Pick only one")
      (contentAsJsonOf(resultOf(session, id)) \ "status").as[String] must be("pending")

    "be accepted only once" in:
      val (_, id, _) = created()
      val jwt        = response(id)
      statusOf(complete(jwt)) must be(Status.OK)
      statusOf(complete(jwt)) must be(Status.BAD_REQUEST)

    "be refused when it does not hold up" in:
      val cases: Seq[(String, String => String)] = Seq(
        "signed with another key" -> (id => response(id, key = strangeKey)),
        "issued by someone else"  -> (id => response(id, edit = _.issuer("someone-else"))),
        "addressed elsewhere" -> (id => response(id, edit = _.audience("https://other.example"))),
        "for another deployment" -> (id =>
          response(id, edit = _.claim(s"$Lti/deployment_id", "x"))
        ),
        "expired" -> (id => response(id, edit = _.expirationTime(Date(0)))),
        "not a deep link response" -> (id =>
          response(id, edit = _.claim(s"$Lti/message_type", "X"))
        ),
        "for an unknown request"   -> (_ => response("no-such-request")),
        "missing a required param" -> (id => response(id, Seq(item(Map.empty)))),
        "not a resource link" -> (id => response(id, Seq(Map("type" -> "html", "html" -> "x")))),
        "not a JWT"           -> (_ => "garbage")
      )
      cases.foreach { (name, jwt) =>
        val (session, id, _) = created()
        withClue(s"$name: ")(statusOf(complete(jwt(id))) must be(Status.BAD_REQUEST))
        withClue(s"$name, request left open: ")(
          (contentAsJsonOf(resultOf(session, id)) \ "status").as[String] must be("pending")
        )
      }
