// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package lti

import base.BaseIntegrationSpec
import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.crypto.RSASSAVerifier
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jwt.{JWTClaimsSet, SignedJWT}
import com.typesafe.config.ConfigFactory
import io.ebean.DB
import models.exam.Exam
import models.questions.QuestionType
import models.user.User
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.mvc.{Result, Session}
import play.api.{Application, Configuration}

import java.net.{URLDecoder, URLEncoder}
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path}
import java.security.KeyPairGenerator
import java.util.Base64
import scala.jdk.CollectionConverters.*

/** Shared setup for the LTI 1.3 platform specs, with the spec standing in for the tool.
  *
  * No tool needed: everything the tool does in a launch is done here — echo back the issued
  * `login_hint`, supply its own `state`/`nonce`, then verify the returned `id_token` against the
  * JWK set the platform publishes.
  *
  * Two tools are registered: the `moodle` tool of `conf/integrationtest.conf`, shaped like a Moodle
  * registration, and an `aplus` tool shaped like an A+ registration (see [[AplusContractSpec]]).
  */
abstract class LtiIntegrationSpec extends BaseIntegrationSpec:

  protected val ResourceId = "resource-42"
  protected val ExamHash   = "lti-exam-hash"
  protected val ToolState  = "tool-state-abc"
  protected val ToolNonce  = "tool-nonce-xyz"

  protected val AplusOrigin = "https://plus.example.org"
  protected val AplusLaunch = s"$AplusOrigin/lti/launch/"

  /** Throwaway RSA key pair; the shipped config points at placeholder paths. Generated once per
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
    val aplus = ConfigFactory.parseString(
      s"""lti.tools.aplus {
         |  name = "A+"
         |  origin = "$AplusOrigin"
         |  client-id = "aplus-client"
         |  deployment-id = "aplus-deployment"
         |  initiate-login-url = "$AplusOrigin/lti/login/"
         |  target-link-uri = "$AplusLaunch"
         |  parameters = [
         |    { name = "course_slug", required = true },
         |    { name = "instance_slug", required = true },
         |    { name = "module_slug" },
         |    { name = "exercise_path", requires = ["module_slug"] }
         |  ]
         |}
         |lti.platform.private-key = "$privateKey"
         |lti.platform.public-key = "$publicKey"
         |""".stripMargin
    )
    customise(new GuiceApplicationBuilder().configure(Configuration(aplus))).build()

  /** For a spec to add its own configuration or bindings. */
  protected def customise(builder: GuiceApplicationBuilder): GuiceApplicationBuilder = builder

  protected def setting(key: String): String = app.configuration.get[String](key)
  protected def clientId(tool: String = "moodle"): String =
    setting(s"lti.tools.$tool.client-id")
  protected def launchUri(tool: String = "moodle"): String =
    setting(s"lti.tools.$tool.target-link-uri")

  protected def encode(s: String): String = URLEncoder.encode(s, StandardCharsets.UTF_8)

  protected def queryOf(url: String): Map[String, String] =
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

  protected def findExam(id: Long): Exam =
    Option(
      DB.find(classOf[Exam])
        .fetch("examSections")
        .fetch("examSections.sectionQuestions")
        .fetch("examSections.sectionQuestions.question")
        .where()
        .idEq(id)
        .findOne()
    ).getOrElse(fail(s"Test exam $id not found"))

  /** Turns the first question of test exam 1 into an LTI question of `tool` in an exam created by
    * `creator`. Returns the section question id the UI would launch with.
    */
  protected def setUpLtiQuestion(
      creator: User,
      parent: Option[Exam] = None,
      tool: String = "moodle",
      custom: Map[String, String] = Map("id" -> "resource-42")
  ): Long =
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
    esq.question.ltiTool = tool
    esq.question.ltiCustom = new java.util.HashMap[String, Object](custom.asJava)
    esq.question.update()
    esq.id

  /** Step 1: the user starts a launch. Returns the redirect the browser would follow and the
    * session it has to carry into the callback.
    */
  protected def initiateLogin(
      userSession: Session,
      sectionQuestionId: Long,
      examHash: String = ExamHash
  ): (Result, Session) =
    val query  = s"sectionQuestionId=$sectionQuestionId&examHash=${encode(examHash)}"
    val result = runIO(get(s"/integration/lti/start-login?$query", session = userSession))
    (result, sessionOf(result))

  /** A teacher previewing their own exam, logged in and ready to launch its LTI question. */
  protected def teacherReadyToLaunch(): (User, Session, Long) =
    val (teacher, session) = runIO(loginAsTeacher())
    (teacher, session, setUpLtiQuestion(teacher))

  protected def ltiSessionOf(userSession: Session, sectionQuestionId: Long): Session =
    initiateLogin(userSession, sectionQuestionId)._2

  protected def claimsOf(result: Result): JWTClaimsSet =
    statusOf(result) must be(Status.OK)
    verifyAsTool(formValue(contentAsStringOf(result), "id_token"))

  /** Step 2: what the tool sends back to the platform's OIDC endpoint. `state` and `nonce` are the
    * tool's own — the platform never issued them and has nothing to compare them against.
    */
  protected def toolParams(loginHint: String, tool: String = "moodle"): Map[String, String] = Map(
    "client_id"    -> clientId(tool),
    "redirect_uri" -> launchUri(tool),
    "login_hint"   -> loginHint,
    "state"        -> ToolState,
    "nonce"        -> ToolNonce
  )

  protected def callback(session: Session, params: Map[String, String]): Result =
    val query = params.map((k, v) => s"$k=${encode(v)}").mkString("&")
    runIO(get(s"/integration/lti/oidc/login?$query", session = session))

  /** The whole launch of the question `esqId` as `userSession`, ending in a verified token. */
  protected def launchAs(
      userSession: Session,
      esqId: Long,
      tool: String = "moodle"
  ): (String, JWTClaimsSet) =
    val ltiSession = ltiSessionOf(userSession, esqId)
    val result     = callback(ltiSession, toolParams(ltiSession("lti_login_hint"), tool))
    statusOf(result) must be(Status.OK)
    val html = contentAsStringOf(result)
    (html, verifyAsTool(formValue(html, "id_token")))

  protected def formValue(html: String, name: String): String =
    val pattern = ("name=\"" + name + "\" value=\"([^\"]*)\"").r
    pattern.findFirstMatchIn(html).map(_.group(1)).getOrElse(fail(s"No $name in the launch form"))

  protected def formAction(html: String): String =
    "action=\"([^\"]*)\"".r
      .findFirstMatchIn(html)
      .map(_.group(1))
      .getOrElse(fail("No action in the launch form"))

  /** Step 3: verify the token exactly as the tool would — fetch the JWK set, pick the key by the
    * `kid` in the header, check the signature.
    */
  protected def verifyAsTool(idToken: String): JWTClaimsSet =
    val jwks = JWKSet.parse(contentAsStringOf(runIO(get("/integration/lti/oidc/jwks"))))
    val jwt  = SignedJWT.parse(idToken)
    jwt.getHeader.getAlgorithm must be(JWSAlgorithm.RS256)
    val key = Option(jwks.getKeyByKeyId(jwt.getHeader.getKeyID))
      .getOrElse(fail(s"JWK set has no key for kid '${jwt.getHeader.getKeyID}'"))
    jwt.verify(RSASSAVerifier(key.toRSAKey)) must be(true)
    jwt.getJWTClaimsSet

  /** The whole happy path for a teacher previewing a Moodle question. */
  protected def launch(): (String, JWTClaimsSet) =
    val (_, userSession, esqId) = teacherReadyToLaunch()
    launchAs(userSession, esqId)
