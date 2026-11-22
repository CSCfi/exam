// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package session

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

import java.time.Instant
import java.time.temporal.ChronoUnit.MINUTES

/** Logging in, choosing a role, keeping the session alive and logging out */
class SessionFlowSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def find(eppn: String): Option[User] =
    DB.find(classOf[User]).where().eq("eppn", eppn).find

  private def call(method: String, url: String, session: Session): Result =
    runIO(makeRequest(method, url, session = session))

  "Logging in" when:
    "a new local user has several roles" should:
      "let them choose one of their own" in:
        val (_, session) =
          runIO(login("twohats@funet.fi", Map("unscoped-affiliation" -> "faculty;student")))
        session.get("role") must be(None)

        statusOf(call("PUT", "/app/users/roles/ADMIN", session)) must be(Status.FORBIDDEN)
        statusOf(call("PUT", "/app/users/roles/WIZARD", session)) must be(Status.NOT_FOUND)
        statusOf(call("PUT", "/app/users/roles/TEACHER", Session())) must be(Status.UNAUTHORIZED)
        val chosen = call("PUT", "/app/users/roles/TEACHER", session)
        statusOf(chosen) must be(Status.OK)
        (contentAsJsonOf(chosen) \ "name").as[String] must be("TEACHER")
        sessionOf(chosen).get("role") must be(Some("TEACHER"))

    "a new user's attributes fall short" should:
      "refuse them without creating an account" in:
        runIO(loginExpectFailure("")) // no eppn
        statusOf(runIO(loginRaw("nobody@funet.fi", Map("unscoped-affiliation" -> "member")))) must
          be(Status.BAD_REQUEST)
        statusOf(runIO(loginRaw("nomail@funet.fi", Map("mail" -> "not an address")))) must be(
          Status.BAD_REQUEST
        )
        statusOf(runIO(loginRaw("nosurname@funet.fi", Map("sn" -> "")))) must be(
          Status.BAD_REQUEST
        )
        Seq("nobody@funet.fi", "nomail@funet.fi", "nosurname@funet.fi").flatMap(find) must be(
          empty
        )

    "a user returns" should:
      "update their details from the attributes" in:
        val (user, _) = runIO(login("teacher@funet.fi", Map("givenName" -> "Oliver")))
        user.firstName must be("Oliver")
        user.lastName must be("Lazenby")
        user.email must be("glazenby@funet.fi")
        user.employeeNumber must be("12345")
        user.lastLogin must not be null

      "keep their old details if the new ones are invalid" in:
        ensureTestDataLoaded()
        statusOf(runIO(loginRaw("teacher@funet.fi", Map("mail" -> "")))) must be(
          Status.BAD_REQUEST
        )
        find("teacher@funet.fi").map(_.email) must be(Some("teacher@funet.fi"))

    "someone was enrolled by email before they had an account" should:
      "hand the enrolment over to them" in:
        ensureTestDataLoaded()
        val enrolment = new ExamEnrolment
        enrolment.exam = DB.find(classOf[Exam], 1L)
        // The login's mail is glazenby@funet.fi
        enrolment.preEnrolledUserEmail = "GLazenby@funet.fi"
        enrolment.enrolledOn = Instant.now()
        enrolment.save()

        val (user, _) = runIO(login("preenrolled@funet.fi"))
        val after     = DB.find(classOf[ExamEnrolment], enrolment.id)
        after.user.id must be(user.id)
        after.preEnrolledUserEmail must be(null)

  "The session" when:
    "checked" should:
      "warn two minutes before it runs out, and end after 30" in:
        def check(minutesAgo: Long) =
          val since = Instant.now().minus(minutesAgo, MINUTES).toString
          contentAsStringOf(call("GET", "/app/session", Session(Map("since" -> since))))

        check(1) must be("")
        check(29) must be("alarm")
        check(31) must be("no_session")
        contentAsStringOf(call("GET", "/app/session", Session())) must be("no_session")

    "extended" should:
      "start the 30 minutes again" in:
        val old = Instant.now().minus(29, MINUTES)
        val extended =
          call("PUT", "/app/session", Session(Map("since" -> old.toString, "id" -> "1")))
        statusOf(extended) must be(Status.OK)
        val since = sessionOf(extended).get("since").map(Instant.parse)
        since.exists(_.isAfter(old.plus(28, MINUTES))) must be(true)
        sessionOf(extended).get("id") must be(Some("1"))

    "ended" should:
      "give the identity provider's logout address" in:
        val (_, session) = runIO(loginAsTeacher())
        val result       = call("DELETE", "/app/session", session)
        statusOf(result) must be(Status.OK)
        (contentAsJsonOf(result) \ "logoutUrl").as[String] must startWith(
          "https://logout.foo.bar.com"
        )
        sessionOf(result).get("id") must be(None)

  "The login attributes" when:
    "asked for" should:
      "be echoed back" in:
        val result = call("GET", "/app/attributes", Session())
        statusOf(result) must be(Status.OK)
        (contentAsJsonOf(result) \ "sn").as[String] must be("Lazenby")
