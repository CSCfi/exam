// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package lti

import com.nimbusds.jwt.JWTClaimsSet
import models.user.User
import play.api.http.Status
import play.api.mvc.Session

import scala.jdk.CollectionConverters.*

/** What A+ (Aalto's LMS, https://github.com/apluslms/a-plus) needs from an LTI 1.3 launch, as an
  * executable contract.
  *
  * There is no A+ to test against, so these are assumptions read from its tool implementation at
  * commit 6387fa1052f19ba5fbd05bdd35d93d3061e76936 (2026-10-27), which uses pylti1p3:
  *
  *   - `lti_tool/views.py` `lti_login`: third-party initiated login; pylti1p3 looks the platform up
  *     by `iss` and `client_id`, and the login needs `target_link_uri`.
  *   - `lti_tool/views.py` `LtiLaunchView.post`: pylti1p3 validates the id_token (signature through
  *     the platform's JWKS, `aud`, `deployment_id`, nonce). The username is
  *     `claim/ext.user_username`, falling back to `email`. A new user is created from `email`,
  *     `given_name`, `family_name`, `claim/launch_presentation.locale` and
  *     `claim/lis.person_sourcedid`, read without defaults, so a missing one fails the launch.
  *   - The same view, resource launch: the content comes from `claim/custom`. `course_slug` and
  *     `instance_slug` are always read; with `exercise_path` it also reads `module_slug`, otherwise
  *     `module_slug` alone opens a module. A `Learner` who is not course staff gets enrolled.
  *
  * When a test A+ becomes available, check these against it and update the commit above.
  */
class AplusContractSpec extends LtiIntegrationSpec:

  private val Lti = "https://purl.imsglobal.org/spec/lti/claim"

  private val Exercise = Map(
    "course_slug"   -> "cs-101",
    "instance_slug" -> "2026",
    "module_slug"   -> "week1",
    "exercise_path" -> "hello"
  )

  private def aplusLaunch(
      login: => (User, Session),
      custom: Map[String, String] = Exercise
  ): (User, JWTClaimsSet) =
    val (user, session) = login
    val esqId           = setUpLtiQuestion(user, tool = "aplus", custom = custom)
    (user, launchAs(session, esqId, tool = "aplus")._2)

  private def asTeacher(custom: Map[String, String] = Exercise) =
    aplusLaunch(runIO(loginAsTeacher()), custom)

  "The login initiation A+ receives" should:
    "carry the issuer, client id and target link URI pylti1p3 looks the platform up with" in:
      val (teacher, session) = runIO(loginAsTeacher())
      val esqId              = setUpLtiQuestion(teacher, tool = "aplus", custom = Exercise)
      val location = headerOf(initiateLogin(session, esqId)._1, "Location").getOrElse(
        fail("No redirect")
      )
      val params = queryOf(location)
      params("iss") must be(setting("lti.platform.issuer"))
      params("client_id") must be("aplus-client")
      params("target_link_uri") must be(AplusLaunch)
      params("login_hint") must not be empty

  "The id_token A+ receives" should:
    "be addressed to A+'s registration of this platform" in:
      val (_, claims) = asTeacher()
      claims.getIssuer must be(setting("lti.platform.issuer"))
      claims.getAudience.asScala must be(Seq("aplus-client"))
      claims.getStringClaim(s"$Lti/deployment_id") must be("aplus-deployment")
      claims.getStringClaim(s"$Lti/message_type") must be("LtiResourceLinkRequest")
      claims.getStringClaim(s"$Lti/version") must be("1.3.0")
      claims.getStringClaim("nonce") must be(ToolNonce)

    "carry every user claim A+ reads when it creates the user" in:
      val (teacher, claims) = asTeacher()
      claims.getStringClaim("email") must be(teacher.email)
      claims.getStringClaim("given_name") must be(teacher.firstName)
      claims.getStringClaim("family_name") must be(teacher.lastName)
      claims.getJSONObjectClaim(s"$Lti/launch_presentation").get("locale") must
        be(teacher.language.code)
      claims.getJSONObjectClaim(s"$Lti/lis").containsKey("person_sourcedid") must be(true)

    // A user with no student number still needs the claim: A+ reads it without a default.
    "carry lis.person_sourcedid even for a user without a student number" in:
      val (teacher, session) = runIO(loginAsTeacher())
      teacher.userIdentifier = null
      teacher.update()
      val (_, claims) = aplusLaunch((teacher, session))
      claims.getJSONObjectClaim(s"$Lti/lis").get("person_sourcedid") must be("")

    "give the student number as lis.person_sourcedid" in:
      val (student, session) = runIO(loginAsStudent())
      student.userIdentifier = "123456"
      student.update()
      val esqId       = setUpLtiQuestion(student, Some(findExam(2L)), "aplus", Exercise)
      val (_, claims) = launchAs(session, esqId, tool = "aplus")
      claims.getJSONObjectClaim(s"$Lti/lis").get("person_sourcedid") must be("123456")

    // Without it A+ would key the account by email, which can change.
    "name the user by eppn in ext.user_username" in:
      val (teacher, claims) = asTeacher()
      claims.getJSONObjectClaim(s"$Lti/ext").get("user_username") must be(teacher.eppn)

    "pick the exercise with the slugs A+ routes by" in:
      val (_, claims) = asTeacher()
      claims.getJSONObjectClaim(s"$Lti/custom").asScala must be(Exercise)

    "be able to pick a whole course instance" in:
      val course      = Exercise -- Seq("module_slug", "exercise_path")
      val (_, claims) = asTeacher(course)
      claims.getJSONObjectClaim(s"$Lti/custom").asScala must be(course)

    "enrol a student into the course by the Learner role" in:
      val (student, session) = runIO(loginAsStudent())
      val esqId              = setUpLtiQuestion(student, Some(findExam(2L)), "aplus", Exercise)
      val (_, claims)        = launchAs(session, esqId, tool = "aplus")
      claims.getStringListClaim(s"$Lti/roles").asScala must contain(
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      )

  "A question A+ could not open" should:
    // A+ would fail on module_slug, mid-exam; refuse before leaving EXAM.
    "not be launched with an exercise but no module" in:
      val (teacher, session) = runIO(loginAsTeacher())
      val esqId = setUpLtiQuestion(teacher, tool = "aplus", custom = Exercise - "module_slug")
      statusOf(initiateLogin(session, esqId)._1) must be(Status.BAD_REQUEST)

    "not be launched without the course instance" in:
      val (teacher, session) = runIO(loginAsTeacher())
      val esqId = setUpLtiQuestion(teacher, tool = "aplus", custom = Exercise - "instance_slug")
      statusOf(initiateLogin(session, esqId)._1) must be(Status.BAD_REQUEST)
