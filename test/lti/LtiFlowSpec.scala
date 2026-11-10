// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package lti

import com.nimbusds.jose.jwk.JWKSet
import io.ebean.DB
import models.questions.QuestionType
import models.sections.ExamSectionQuestion
import play.api.http.Status
import play.api.mvc.Session

import java.net.URI
import scala.jdk.CollectionConverters.*

/** End-to-end test of the LTI 1.3 platform side, with this spec standing in for the tool.
  *
  * Verifying the returned `id_token` against the published JWK set is the point of doing this as an
  * integration test rather than a unit test: it is the only thing that catches a mismatch between
  * the key [[features.lti.services.LtiService.buildIdToken]] signs with and the key
  * [[features.lti.controllers.JwksController]] hands out.
  *
  * The platform settings and the CSP come from `conf/application.conf`, so a change there that
  * breaks the flow (a CSP that blocks the launch POST) fails here rather than at a real tool. The
  * tools are the test ones of [[LtiIntegrationSpec]].
  */
class LtiFlowSpec extends LtiIntegrationSpec:

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
      location must startWith(setting("lti.tools.moodle.initiate-login-url").split("\\?").head)
      val params = queryOf(location)
      params("iss") must be(setting("lti.platform.issuer"))
      params("client_id") must be(clientId())
      params("target_link_uri") must be(setting("lti.tools.moodle.target-link-uri"))
      params("login_hint") must not be empty

    "keep query parameters already present in the configured tool URL" in:
      val configured              = queryOf(setting("lti.tools.moodle.initiate-login-url"))
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val (result, _)             = initiateLogin(userSession, esqId)
      val params = queryOf(headerOf(result, "Location").getOrElse(fail("No redirect")))
      configured.foreach((k, v) => params.get(k) must be(Some(v)))

    // The callback finds the launch by its login_hint, see LtiLogins.
    "keep nothing of the launch in the session" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val (_, after)              = initiateLogin(userSession, esqId)
      after.data.keys.filter(_.startsWith("lti_")) must be(empty)

    "issue a distinct login_hint per launch" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val first                   = loginHintOf(userSession, esqId)
      val second                  = loginHintOf(userSession, esqId)
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
      claims.getAudience.asScala must contain(clientId())

    "identify the logged-in user" in:
      val (user, userSession, esqId) = teacherReadyToLaunch()
      val hint                       = loginHintOf(userSession, esqId)
      val claims                     = claimsOf(callback(toolParams(hint)))
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
      claims.getStringClaim(s"$lti/deployment_id") must be(
        setting("lti.tools.moodle.deployment-id")
      )
      claims.getStringClaim(s"$lti/target_link_uri") must be(launchUri())
      claims.getJSONObjectClaim(s"$lti/custom").get("id") must be(ResourceId)
      claims.getJWTID must not be empty

    // One published resource can be used in many exams and many times in one exam. Grades the
    // tool sends back are keyed by resource link, so it has to identify the placement.
    "identify the question's placement in the exam as the resource link" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val hint                    = loginHintOf(userSession, esqId)
      val claims                  = claimsOf(callback(toolParams(hint)))
      val question                = DB.find(classOf[ExamSectionQuestion], esqId).question
      claims.getJSONObjectClaim("https://purl.imsglobal.org/spec/lti/claim/resource_link")
        .get("id") must be(s"exam-1-question-${question.id}")

    "give a student's copy the resource link of the original exam's question" in:
      val (student, studentSession) = runIO(loginAsStudent())
      val prototype                 = findExam(2L)
      val original = prototype.examSections.asScala
        .flatMap(_.sectionQuestions.asScala)
        .headOption
        .getOrElse(fail("Prototype exam has no section questions"))
        .question
      val esqId    = setUpLtiQuestion(student, Some(prototype))
      val question = DB.find(classOf[ExamSectionQuestion], esqId).question
      question.parent = original
      question.update()
      val hint   = loginHintOf(studentSession, esqId)
      val claims = claimsOf(callback(toolParams(hint)))
      claims.getJSONObjectClaim("https://purl.imsglobal.org/spec/lti/claim/resource_link")
        .get("id") must be(s"exam-${prototype.id}-question-${original.id}")

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
      val hint                      = loginHintOf(studentSession, esqId)
      val claims                    = claimsOf(callback(toolParams(hint)))
      val context = claims.getJSONObjectClaim("https://purl.imsglobal.org/spec/lti/claim/context")
      context.get("id") must be(s"exam-${prototype.id}")
      context.get("title") must be(prototype.name)
      context.get("label") must be(prototype.course.code)

    "assert a student as a Learner" in:
      val (student, studentSession) = runIO(loginAsStudent())
      val esqId                     = setUpLtiQuestion(student, Some(findExam(2L)))
      val hint                      = loginHintOf(studentSession, esqId)
      val claims                    = claimsOf(callback(toolParams(hint)))
      claims.getStringListClaim("https://purl.imsglobal.org/spec/lti/claim/roles").asScala must
        be(Seq("http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"))

    "assert a teacher as an Instructor" in:
      val (_, claims) = launch()
      claims.getStringListClaim("https://purl.imsglobal.org/spec/lti/claim/roles").asScala must
        be(Seq("http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"))

    "tell the tool it is shown in EXAM's frame" in:
      val (_, claims) = launch()
      claims.getJSONObjectClaim("https://purl.imsglobal.org/spec/lti/claim/launch_presentation")
        .get("document_target") must be("iframe")

    // The way out when the tool cannot work in the frame, e.g. its login page refuses framing.
    "tell the tool it is in a window of its own when opened in one" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val query  = s"sectionQuestionId=$esqId&examHash=${encode(ExamHash)}&target=window"
      val result = runIO(get(s"/integration/lti/start-login?$query", session = userSession))
      statusOf(result) must be(Status.SEE_OTHER)
      claimsOf(callback(toolParams(hintOf(result))))
        .getJSONObjectClaim("https://purl.imsglobal.org/spec/lti/claim/launch_presentation")
        .get("document_target") must be("window")

    "expire five minutes after issue" in:
      val (_, claims) = launch()
      val lifetime    = claims.getExpirationTime.getTime - claims.getIssueTime.getTime
      lifetime must be(5 * 60 * 1000)

    "post the token to the validated redirect URI" in:
      val (html, _) = launch()
      formAction(html) must be(launchUri())

    // The auto-submit is an inline script, which script-src only lets through by nonce.
    "carry the CSP nonce on the auto-submit script" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val hint                    = loginHintOf(userSession, esqId)
      val result                  = callback(toolParams(hint))
      val csp = headerOf(result, "Content-Security-Policy").getOrElse(fail("No CSP header"))
      val nonce = """<script nonce="([^"]+)">""".r
        .findFirstMatchIn(contentAsStringOf(result))
        .map(_.group(1))
        .getOrElse(fail("No nonce on the launch script"))
      csp must include(s"'nonce-$nonce'")

    // The controller sets its own no-store, but SystemFilter overwrites Cache-Control on every
    // /integration response - so assert the property, not the exact value the controller asked for.
    "not be cached" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val hint                    = loginHintOf(userSession, esqId)
      val result                  = callback(toolParams(hint))
      headerOf(result, "Cache-Control").getOrElse(fail("No Cache-Control")) must include("no-store")

  "A tampered callback" should:
    "be rejected when the client_id is not ours" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val hint                    = loginHintOf(userSession, esqId)
      val params                  = toolParams(hint) + ("client_id" -> "someone-else")
      statusOf(callback(params)) must be(Status.BAD_REQUEST)

    "not hand the token to an unregistered redirect_uri" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val hint                    = loginHintOf(userSession, esqId)
      val params =
        toolParams(hint) + ("redirect_uri" -> "https://attacker.test/steal")
      val result = callback(params)
      statusOf(result) must be(Status.BAD_REQUEST)
      contentAsStringOf(result) must not include "id_token"

    "be rejected when a required parameter is missing" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val hint                    = loginHintOf(userSession, esqId)
      val full                    = toolParams(hint)
      Seq("redirect_uri", "state", "nonce").foreach { missing =>
        withClue(s"missing $missing: ")(
          statusOf(callback(full - missing)) must be(Status.BAD_REQUEST)
        )
      }

    "be rejected when the login_hint is missing" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val hint                    = loginHintOf(userSession, esqId)
      val params                  = toolParams(hint) - "login_hint"
      statusOf(callback(params)) must be(Status.BAD_REQUEST)

    "be rejected when the login_hint was never issued" in:
      teacherReadyToLaunch()
      val result = callback(toolParams("some-hint"))
      statusOf(result) must be(Status.BAD_REQUEST)
      contentAsStringOf(result) must not include "id_token"

    "be rejected when the login_hint has been used already" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val hint                    = loginHintOf(userSession, esqId)
      statusOf(callback(toolParams(hint))) must be(Status.OK)
      val replay = callback(toolParams(hint))
      statusOf(replay) must be(Status.BAD_REQUEST)
      contentAsStringOf(replay) must not include "id_token"

    // The session plays no part, so a session cookie that does arrive cannot redirect the login
    // to another user: the token is for the one who started it.
    "be issued for the user who started the login, whatever session comes with it" in:
      val (teacher, teacherSession, esqId) = teacherReadyToLaunch()
      val hint                             = loginHintOf(teacherSession, esqId)
      val (_, studentSession)              = runIO(loginAsStudent())
      claimsOf(callback(toolParams(hint), studentSession)).getSubject must be(teacher.eppn)

  // The callback reaches EXAM through a redirect from the tool. When the tool is on another site
  // that is a cross-site request inside an iframe, which the browser sends without EXAM's
  // SameSite=Lax session cookie (every callback in this spec is sent without it).
  "A cross-site callback" should:
    "complete without EXAM's session cookie" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      statusOf(callback(toolParams(loginHintOf(userSession, esqId)), Session())) must
        be(Status.OK)

    // An exam section shows its LTI questions at once; each frame has its own login.
    "complete several launches started in one session, in any order" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val first                   = loginHintOf(userSession, esqId)
      val second                  = loginHintOf(userSession, esqId)
      statusOf(callback(toolParams(second))) must be(Status.OK)
      statusOf(callback(toolParams(first))) must be(Status.OK)

  "With several tools, a launch" should:
    val aplusParams = Map("course_slug" -> "cs-101", "instance_slug" -> "2026")

    def aplusQuestion(custom: Map[String, String] = aplusParams): (Session, Long) =
      val (teacher, session) = runIO(loginAsTeacher())
      (session, setUpLtiQuestion(teacher, tool = "aplus", custom = custom))

    "start at the login URL of the question's tool, with that tool's client id" in:
      val (session, esqId) = aplusQuestion()
      val (result, _)      = initiateLogin(session, esqId)
      statusOf(result) must be(Status.SEE_OTHER)
      val location = headerOf(result, "Location").getOrElse(fail("No redirect"))
      location must startWith(s"$AplusOrigin/lti/login/?")
      val params = queryOf(location)
      params("client_id") must be("aplus-client")
      params("target_link_uri") must be(AplusLaunch)

    "sign the token for the question's tool and post it there" in:
      val (session, esqId) = aplusQuestion()
      val (html, claims)   = launchAs(session, esqId, tool = "aplus")
      claims.getAudience.asScala must be(Seq("aplus-client"))
      claims.getStringClaim("https://purl.imsglobal.org/spec/lti/claim/deployment_id") must
        be("aplus-deployment")
      formAction(html) must be(AplusLaunch)

    "send only the parameters the tool declares" in:
      val (session, esqId) = aplusQuestion(aplusParams + ("id" -> "not-an-aplus-parameter"))
      val (_, claims)      = launchAs(session, esqId, tool = "aplus")
      claims.getJSONObjectClaim("https://purl.imsglobal.org/spec/lti/claim/custom").asScala must
        be(aplusParams)

    // The callback is checked against the tool of the launch it completes, not against any tool.
    "reject a callback carrying another tool's client_id" in:
      val (session, esqId) = aplusQuestion()
      val hint             = loginHintOf(session, esqId)
      val result           = callback(toolParams(hint))
      statusOf(result) must be(Status.BAD_REQUEST)
      contentAsStringOf(result) must not include "id_token"

    "not hand the token to another tool's redirect URI" in:
      val (session, esqId) = aplusQuestion()
      val hint             = loginHintOf(session, esqId)
      val params =
        toolParams(hint, "aplus") + ("redirect_uri" -> launchUri())
      val result = callback(params)
      statusOf(result) must be(Status.BAD_REQUEST)
      contentAsStringOf(result) must not include "id_token"

    "refuse a question whose tool is not configured" in:
      val (teacher, session) = runIO(loginAsTeacher())
      val esqId              = setUpLtiQuestion(teacher, tool = "removed-tool")
      statusOf(initiateLogin(session, esqId)._1) must be(Status.BAD_REQUEST)

    "refuse a question missing a parameter its tool requires" in:
      val (session, esqId) = aplusQuestion(Map("course_slug" -> "cs-101"))
      statusOf(initiateLogin(session, esqId)._1) must be(Status.BAD_REQUEST)

    // The launch is a self-submitting cross-origin form POST inside an iframe, so form-action and
    // frame-src have to allow every tool's origin. They are added at startup
    // (system.modules.LtiCspModule); fails if the LTI settings and the CSP drift apart.
    "be allowed to post to and frame every tool by the CSP" in:
      val (_, userSession, esqId) = teacherReadyToLaunch()
      val hint                    = loginHintOf(userSession, esqId)
      val result                  = callback(toolParams(hint))
      val csp = headerOf(result, "Content-Security-Policy").getOrElse(fail("No CSP header"))
      val directives = csp.split(";").map(_.trim.split("\\s+").toList).collect {
        case name :: sources => name -> sources
      }.toMap
      val moodle = URI(launchUri())
      Seq(s"${moodle.getScheme}://${moodle.getAuthority}", AplusOrigin).foreach { origin =>
        directives("form-action") must contain(origin)
        directives("frame-src") must contain(origin)
      }
      directives("form-action") must not contain "'none'"
      // The launch iframe starts at the platform itself before it is redirected to the tool.
      directives("frame-src") must contain(setting("lti.platform.issuer").stripSuffix("/"))

  "The LTI setting" should:
    "tell the UI that LTI is active" in:
      val result = runIO(get("/app/settings/lti"))
      statusOf(result) must be(Status.OK)
      (contentAsJsonOf(result) \ "ltiActive").as[Boolean] must be(true)

  "The tools endpoint" should:
    "list the configured tools and the parameters a question gives them" in:
      val (_, session) = runIO(loginAsTeacher())
      val result       = runIO(get("/app/lti/tools", session = session))
      statusOf(result) must be(Status.OK)
      val tools = contentAsJsonOf(result).as[Seq[play.api.libs.json.JsObject]]
      tools.map(t => (t \ "key").as[String]) must be(Seq("aplus", "moodle"))
      val aplus = tools.head
      (aplus \ "name").as[String] must be("A+")
      (aplus \ "parameters").as[Seq[play.api.libs.json.JsObject]].map(p =>
        ((p \ "name").as[String], (p \ "required").as[Boolean], (p \ "requires").as[Seq[String]])
      ) must be(
        Seq(
          ("course_slug", true, Nil),
          ("instance_slug", true, Nil),
          ("module_slug", false, Nil),
          ("exercise_path", false, Seq("module_slug"))
        )
      )

    "not be available to students" in:
      val (_, session) = runIO(loginAsStudent())
      statusOf(runIO(get("/app/lti/tools", session = session))) must be(Status.FORBIDDEN)
