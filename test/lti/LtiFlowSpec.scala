// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package lti

import base.BaseIntegrationSpec
import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.crypto.RSASSAVerifier
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jwt.{JWTClaimsSet, SignedJWT}
import io.ebean.DB
import models.exam.Exam
import models.questions.QuestionType
import models.sections.ExamSectionQuestion
import models.user.User
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
  private val ExamHash   = "lti-exam-hash"
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

  private def findExam(id: Long): Exam =
    Option(
      DB.find(classOf[Exam])
        .fetch("examSections")
        .fetch("examSections.sectionQuestions")
        .fetch("examSections.sectionQuestions.question")
        .where()
        .idEq(id)
        .findOne()
    ).getOrElse(fail(s"Test exam $id not found"))

  /** Turns the first question of test exam 1 into an LTI question in an exam created by `creator`.
    * Returns the section question id the UI would launch with.
    */
  private def setUpLtiQuestion(creator: User, parent: Option[Exam] = None): Long =
    val exam = findExam(1L)
    exam.hash = ExamHash
    exam.creator = creator
    exam.parent = parent.orNull
    exam.update()
    val esq = exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .headOption
      .getOrElse(fail("Test exam has no section questions"))
    esq.question.`type` = QuestionType.LtiQuestion
    esq.question.ltiId = ResourceId
    esq.question.update()
    esq.id

  /** Step 1: the user starts a launch. Returns the redirect the browser would follow and the
    * session it has to carry into the callback.
    */
  private def initiateLogin(
      userSession: Session,
      sectionQuestionId: Long,
      examHash: String = ExamHash
  ): (Result, Session) =
    val query  = s"sectionQuestionId=$sectionQuestionId&examHash=${encode(examHash)}"
    val result = runIO(get(s"/integration/lti/start-login?$query", session = userSession))
    (result, sessionOf(result))

  /** A teacher previewing their own exam, logged in and ready to launch its LTI question. */
  private def teacherReadyToLaunch(): (User, Session, Long) =
    val (teacher, session) = runIO(loginAsTeacher())
    (teacher, session, setUpLtiQuestion(teacher))

  private def ltiSessionOf(userSession: Session, sectionQuestionId: Long): Session =
    initiateLogin(userSession, sectionQuestionId)._2

  private def claimsOf(result: Result): JWTClaimsSet =
    statusOf(result) must be(Status.OK)
    verifyAsTool(formValue(contentAsStringOf(result), "id_token"))

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
    val (_, userSession, esqId) = teacherReadyToLaunch()
    val ltiSession              = ltiSessionOf(userSession, esqId)
    val loginHint               = ltiSession("lti_login_hint")
    val result                  = callback(ltiSession, toolParams(loginHint))
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
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val (result, _)             = initiateLogin(userSession, esqId)
      statusOf(result) must be(Status.SEE_OTHER)
      val location = headerOf(result, "Location").getOrElse(fail("No redirect"))
      location must startWith(setting("lti.tool.initiate-login-url").split("\\?").head)
      val params = queryOf(location)
      params("iss") must be(setting("lti.platform.issuer"))
      params("client_id") must be(clientId)
      params("target_link_uri") must be(setting("lti.tool.target-link-uri"))
      params("login_hint") must not be empty

    "keep query parameters already present in the configured tool URL" in:
      val configured              = queryOf(setting("lti.tool.initiate-login-url"))
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val (result, _)             = initiateLogin(userSession, esqId)
      val params = queryOf(headerOf(result, "Location").getOrElse(fail("No redirect")))
      configured.foreach((k, v) => params.get(k) must be(Some(v)))

    "bind the launch to this session" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val ltiSession              = ltiSessionOf(userSession, esqId)
      ltiSession.get("lti_login_hint") must not be empty
      ltiSession.get("lti_section_question_id") must be(Some(esqId.toString))
      ltiSession.get("lti_exam_hash") must be(Some(ExamHash))

    "issue a distinct login_hint per launch" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val first                   = ltiSessionOf(userSession, esqId)("lti_login_hint")
      val second                  = ltiSessionOf(userSession, esqId)("lti_login_hint")
      first must not be second

    "reject a launch without a section question and exam" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      Seq(
        "",
        s"?sectionQuestionId=$esqId",
        s"?examHash=$ExamHash",
        s"?sectionQuestionId=not-a-number&examHash=$ExamHash"
      ).foreach { query =>
        withClue(s"query '$query': ")(
          statusOf(runIO(get(s"/integration/lti/start-login$query", session = userSession))) must
            be(Status.BAD_REQUEST)
        )
      }

    // The id_token asserts the exam context, so the pair has to match an exam the user can open.
    "reject a question that is not in the given exam" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      statusOf(initiateLogin(userSession, esqId, "some-other-exam")._1) must be(Status.NOT_FOUND)

    "reject a question that is not an LTI question" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val question                = DB.find(classOf[ExamSectionQuestion], esqId).question
      question.`type` = QuestionType.EssayQuestion
      question.update()
      statusOf(initiateLogin(userSession, esqId)._1) must be(Status.NOT_FOUND)

    "reject a student launching from someone else's exam" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val (_, studentSession)     = runIO(loginAsStudent())
      statusOf(initiateLogin(studentSession, esqId)._1) must be(Status.NOT_FOUND)

    "require an authenticated user" in:
      val (_, _, esqId) = teacherReadyToLaunch()
      val query         = s"sectionQuestionId=$esqId&examHash=$ExamHash"
      statusOf(runIO(get(s"/integration/lti/start-login?$query"))) must be(Status.UNAUTHORIZED)

  "A launch" should:
    "produce an id_token the tool can verify against the published JWKS" in:
      val (_, claims) = launch()
      claims.getIssuer must be(setting("lti.platform.issuer"))
      claims.getAudience.asScala must contain(clientId)

    "identify the logged-in user" in:
      val (user, userSession, esqId) = teacherReadyToLaunch()
      val ltiSession                 = ltiSessionOf(userSession, esqId)
      val claims = claimsOf(callback(ltiSession, toolParams(ltiSession("lti_login_hint"))))
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

    "describe the exam as the context when a teacher previews it" in:
      val (_, claims) = launch()
      val exam        = findExam(1L)
      val context = claims.getJSONObjectClaim("https://purl.imsglobal.org/spec/lti/claim/context")
      context.get("id") must be(s"exam-${exam.id}")
      context.get("title") must be(exam.name)
      context.get("label") must be(exam.course.code)

    // Every student takes their own copy of the exam; the context has to be the exam they share,
    // or the tool would see one course per student.
    "describe the original exam as the context for a student's copy" in:
      val (student, studentSession) = runIO(loginAsStudent())
      val prototype                 = findExam(2L)
      val esqId                     = setUpLtiQuestion(student, Some(prototype))
      val ltiSession                = ltiSessionOf(studentSession, esqId)
      val claims  = claimsOf(callback(ltiSession, toolParams(ltiSession("lti_login_hint"))))
      val context = claims.getJSONObjectClaim("https://purl.imsglobal.org/spec/lti/claim/context")
      context.get("id") must be(s"exam-${prototype.id}")
      context.get("title") must be(prototype.name)
      context.get("label") must be(prototype.course.code)

    "assert a student as a Learner" in:
      val (student, studentSession) = runIO(loginAsStudent())
      val esqId                     = setUpLtiQuestion(student, Some(findExam(2L)))
      val ltiSession                = ltiSessionOf(studentSession, esqId)
      val claims = claimsOf(callback(ltiSession, toolParams(ltiSession("lti_login_hint"))))
      claims.getStringListClaim("https://purl.imsglobal.org/spec/lti/claim/roles").asScala must
        be(Seq("http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"))

    "assert a teacher as an Instructor" in:
      val (_, claims) = launch()
      claims.getStringListClaim("https://purl.imsglobal.org/spec/lti/claim/roles").asScala must
        be(Seq("http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"))

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
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val ltiSession              = ltiSessionOf(userSession, esqId)
      val result                  = callback(ltiSession, toolParams(ltiSession("lti_login_hint")))
      val csp    = headerOf(result, "Content-Security-Policy").getOrElse(fail("No CSP header"))
      val tool   = URI(launchUri)
      val origin = s"${tool.getScheme}://${tool.getAuthority}"
      csp must include(s"form-action $origin")

    // The controller sets its own no-store, but SystemFilter overwrites Cache-Control on every
    // /integration response - so assert the property, not the exact value the controller asked for.
    "not be cached" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val ltiSession              = ltiSessionOf(userSession, esqId)
      val result                  = callback(ltiSession, toolParams(ltiSession("lti_login_hint")))
      headerOf(result, "Cache-Control").getOrElse(fail("No Cache-Control")) must include("no-store")

  "A tampered callback" should:
    "be rejected when the client_id is not ours" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val ltiSession              = ltiSessionOf(userSession, esqId)
      val params = toolParams(ltiSession("lti_login_hint")) + ("client_id" -> "someone-else")
      statusOf(callback(ltiSession, params)) must be(Status.BAD_REQUEST)

    "not hand the token to an unregistered redirect_uri" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val ltiSession              = ltiSessionOf(userSession, esqId)
      val params =
        toolParams(ltiSession("lti_login_hint")) + ("redirect_uri" -> "https://attacker.test/steal")
      val result = callback(ltiSession, params)
      statusOf(result) must be(Status.BAD_REQUEST)
      contentAsStringOf(result) must not include "id_token"

    "be rejected when a required parameter is missing" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val ltiSession              = ltiSessionOf(userSession, esqId)
      val full                    = toolParams(ltiSession("lti_login_hint"))
      Seq("redirect_uri", "state", "nonce").foreach { missing =>
        withClue(s"missing $missing: ")(
          statusOf(callback(ltiSession, full - missing)) must be(Status.BAD_REQUEST)
        )
      }

    "be rejected when the login_hint is missing" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val ltiSession              = ltiSessionOf(userSession, esqId)
      val params                  = toolParams(ltiSession("lti_login_hint")) - "login_hint"
      statusOf(callback(ltiSession, params)) must be(Status.BAD_REQUEST)

    // The guard that keeps a launch started in one session from being completed in another.
    "be rejected when the login_hint belongs to a different session" in:
      val (_, teacherSession, esqId) = teacherReadyToLaunch()
      val teacherHint                = ltiSessionOf(teacherSession, esqId)("lti_login_hint")
      val (student, studentSession)  = runIO(loginAsStudent())
      // The student needs a launch of their own to have a session to complete it in
      val studentLti = ltiSessionOf(studentSession, setUpLtiQuestion(student, Some(findExam(2L))))
      val result     = callback(studentLti, toolParams(teacherHint))
      statusOf(result) must be(Status.BAD_REQUEST)
      contentAsStringOf(result) must not include "id_token"

    "be rejected when the session has no launch target" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val ltiSession              = ltiSessionOf(userSession, esqId)
      val stripped = Session(ltiSession.data - "lti_section_question_id" - "lti_exam_hash")
      statusOf(callback(stripped, toolParams(ltiSession("lti_login_hint")))) must be(
        Status.BAD_REQUEST
      )

    "require an authenticated user" in:
      statusOf(callback(Session(), toolParams("some-hint"))) must be(Status.UNAUTHORIZED)
