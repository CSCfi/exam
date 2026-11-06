// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package lti

import base.BaseIntegrationSpec
import io.ebean.DB
import models.questions.{Question, QuestionType}
import models.user.User
import play.api.Application
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*
import play.api.mvc.Result
import play.api.test.Helpers.*

import scala.jdk.CollectionConverters.*

/** LTI is an optional integration (`lti.active`). While it is off it is as if it did not exist: no
  * endpoint, nothing in the CSP, and no new LTI questions. Questions created while it was on are
  * kept as they are.
  */
class LtiInactiveSpec extends BaseIntegrationSpec:

  override def fakeApplication(): Application =
    new GuiceApplicationBuilder().configure("lti.active" -> false).build()

  private def ltiDraft(user: User): JsObject = Json.obj(
    "type"                  -> "LtiQuestion",
    "question"              -> "Solve the exercise in Moodle",
    "defaultMaxScore"       -> 5,
    "defaultEvaluationType" -> "Points",
    "ltiTool"               -> "moodle",
    "ltiCustom"             -> Json.obj("id" -> "r-1"),
    "questionOwners"        -> Json.arr(Json.obj("id" -> JsNumber(BigDecimal(user.id))))
  )

  private def directives(result: Result): Map[String, List[String]] =
    headerOf(result, "Content-Security-Policy")
      .getOrElse(fail("No CSP header"))
      .split(";")
      .map(_.trim.split("\\s+").toList)
      .collect { case name :: sources => name -> sources }
      .toMap

  "With LTI not active, the LTI endpoints" should:
    "answer 404, also without a session" in:
      Seq(
        "/integration/lti/oidc/jwks",
        "/integration/lti/start-login?sectionQuestionId=1&examHash=x",
        "/integration/lti/oidc/login?client_id=c&login_hint=h&state=s&nonce=n&redirect_uri=u",
        "/app/lti/login-url",
        "/app/lti/tools"
      ).foreach { path =>
        withClue(s"$path: ")(statusOf(runIO(get(path))) must be(Status.NOT_FOUND))
      }

    "answer 404 to a logged-in user" in:
      val (_, session) = runIO(loginAsTeacher())
      Seq("/app/lti/login-url", "/app/lti/tools").foreach { path =>
        withClue(s"$path: ")(
          statusOf(runIO(get(path, session = session))) must be(Status.NOT_FOUND)
        )
      }

    "tell the UI that LTI is off" in:
      val result = runIO(get("/app/settings/lti"))
      statusOf(result) must be(Status.OK)
      (contentAsJsonOf(result) \ "ltiActive").as[Boolean] must be(false)

  "With LTI not active, the CSP" should:
    "allow no LTI origin to be framed or posted to" in:
      val csp = directives(runIO(get("/app/settings/lti")))
      csp("frame-src") must be(List("'self'"))
      csp("form-action") must be(List("'none'"))

  "With LTI not active, LTI questions" should:
    "not be created" in:
      val (user, session) = runIO(loginAsTeacher())
      val result =
        runIO(makeRequest(POST, "/app/questions", Some(ltiDraft(user)), session = session))
      statusOf(result) must be(Status.BAD_REQUEST)
      contentAsStringOf(result) must include("i18n_lti_not_active")

    // Created while LTI was on; there are no tools now to check the tool against.
    "keep their tool and parameters when an existing one is saved" in:
      val (user, session) = runIO(loginAsTeacher())
      val question = DB.find(classOf[Question]).where().eq("type", QuestionType.EssayQuestion)
        .setMaxRows(1).findList().asScala.headOption.getOrElse(fail("No question to use"))
      question.`type` = QuestionType.LtiQuestion
      question.defaultEvaluationType = models.questions.QuestionEvaluationType.Points
      question.defaultMaxScore = 5.0
      question.ltiTool = "moodle"
      question.ltiCustom = new java.util.HashMap[String, Object](java.util.Map.of("id", "r-1"))
      question.questionOwners.add(user)
      question.update()

      val update = ltiDraft(user) ++ Json.obj("question" -> "Changed", "ltiCustom" -> Json.obj())
      val result = runIO(put(s"/app/questions/${question.id}", update, session = session))
      statusOf(result) must be(Status.OK)
      val saved = DB.find(classOf[Question], question.id)
      saved.ltiTool must be("moodle")
      saved.ltiCustomParameters must be(Map("id" -> "r-1"))
