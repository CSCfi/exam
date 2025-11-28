// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package session

import base.BaseIntegrationSpec
import io.ebean.DB
import miscellaneous.scala.DbApiHelper
import models.user.{Role, User}
import play.api.http.Status
import play.api.test.Helpers.*

import scala.jdk.CollectionConverters.*

class SessionControllerSpec extends BaseIntegrationSpec with DbApiHelper:

  "SessionController" when:
    "handling new local user login".must:
      "create new user with correct attributes" in:
        val eppn = "newuser@funet.fi"

        // Verify that the user doesn't exist initially
        val initialUser = DB.find(classOf[User]).where().eq("eppn", eppn).find
        initialUser must be(empty)

        // Login and verify user creation
        val (user, _) = runIO(login(eppn))
        user.getRoles.size must be(1)
        user.getOrganisation mustNot be(null)
        user.getRoles.asScala.head.getName must be(Role.Name.TEACHER.toString)
        user.getFirstName must be("George")
        user.getLastName must be("Lazenby")
        user.getUserIdentifier must be("org1.org:11111 org2.org:22222 org3.org:33333")
        user.getLanguage.getCode must be("en") // was de originally, but not supported

    "handling new external user login" must:
      "reject external user and not create account" in:
        val eppn = "newuser@other.org"

        // Verify that the user doesn't exist initially
        val initialUser = DB.find(classOf[User]).where().eq("eppn", eppn).find
        initialUser must be(None)

        // Attempt login - must fail
        runIO(loginExpectFailure(eppn))

        // Verify that the user was not created
        val user = DB.find(classOf[User]).where().eq("eppn", eppn).find
        user must be(empty)

    "handling user identifiers" must:
      "handle duplicate user identifier keys correctly" in:
        val eppn = "newuser@test.org"

        // Verify that the user doesn't exist initially
        val initialUser = DB.find(classOf[User]).where().eq("eppn", eppn).find
        initialUser must be(None)

        // Login with duplicate identifier keys
        val additionalHeaders = Map(
          "schacPersonalUniqueCode" -> (
            "urn:schac:personalUniqueCode:int:studentID:org2.org:aaaaa;" +
              "urn:schac:personalUniqueCode:int:studentID:org1.org:33333;" +
              "urn:schac:personalUniqueCode:int:studentID:org1.org:22222;" +
              "urn:schac:personalUniqueCode:int:studentID:org1.org:11111"
          )
        )
        val (user, _) = runIO(login(eppn, additionalHeaders))
        // Verify that the user was created with deduplicated identifiers
        user.getUserIdentifier must be("org1.org:null org2.org:aaaaa")

      "handle other identifier key types correctly" in:
        val eppn = "newuser@test.org"

        // Verify that the user doesn't exist initially
        val initialUser = DB.find(classOf[User]).where().eq("eppn", eppn).find
        initialUser must be(None)

        // Login with different identifier key types
        val additionalHeaders = Map(
          "schacPersonalUniqueCode" -> (
            "urn:schac:personalUniqueCode:int:studentID:org2.org:aaaaa;" +
              "urn:schac:personalUniqueCode:org:org1.org:dirid:33333;" +
              "urn:schac:personalUniqueCode:org:org1.org:arturid:22222"
          )
        )
        val (user, _) = runIO(login(eppn, additionalHeaders))
        // Verify that the user was created with a correct identifier
        user.getUserIdentifier must be("org2.org:aaaaa")

      "handle invalid user identifier string" in:
        val eppn = "newuser@test.org"

        // Verify that the user doesn't exist initially
        val initialUser = DB.find(classOf[User]).where().eq("eppn", eppn).find
        initialUser must be(None)

        // Login with an invalid identifier string
        val additionalHeaders = Map("schacPersonalUniqueCode" -> "11111")
        val (user, _)         = runIO(login(eppn, additionalHeaders))
        // Verify that the user was created with the raw identifier
        user.getUserIdentifier must be("11111")

      "handle missing user identifier value" in:
        val eppn = "newuser@test.org"

        // Verify that the user doesn't exist initially
        val initialUser = DB.find(classOf[User]).where().eq("eppn", eppn).find
        initialUser must be(None)

        // Login with a missing identifier value
        val additionalHeaders = Map(
          "schacPersonalUniqueCode" -> "urn:schac:personalUniqueCode:int:studentID:org2.org:"
        )
        val (user, _) = runIO(login(eppn, additionalHeaders))
        // Verify that the user was created with a null value
        user.getUserIdentifier must be("org2.org:null")

      "handle national user identifier correctly" in:
        val eppn = "newuser@test.org"

        // Verify that the user doesn't exist initially
        val initialUser = DB.find(classOf[User]).where().eq("eppn", eppn).find
        initialUser must be(None)

        // Login with national identifier
        val additionalHeaders = Map(
          "schacPersonalUniqueCode" -> (
            "urn:schac:personalUniqueCode:int:studentID:org2.org:111;" +
              "urn:schac:personalUniqueCode:int:esi:FI:xxx"
          )
        )
        val (user, _) = runIO(login(eppn, additionalHeaders))
        // Verify user was created with a correct identifier (national identifier ignored)
        user.getUserIdentifier must be("org2.org:111")

    "handling session management" must:
      "maintain session across requests" in:
        // Login first and use the session for subsequent requests
        val (user, session) = runIO(login("sessiontest@funet.fi"))
        // Check session status (returns plain text, not JSON)
        val result = runIO(get("/app/session", session = session))
        statusOf(result) must be(Status.OK)

        // Verify that the session is active (should return an empty string or "alarm", not "no_session")
        val content = contentAsStringOf(result)
        content must not be "no_session"

      "clear session on logout" in:
        // Login first
        val (user, session) = runIO(login("logouttest@funet.fi"))
        user.getId.longValue must be > 0L

        // Logout using the session
        val logoutResult = runIO(logout())
        statusOf(logoutResult) must be(Status.OK)

        // Verify that subsequent requests without session fail
        val sessionCheckResult = runIO(get("/app/session"))
        val content            = contentAsStringOf(sessionCheckResult)
        content must be("no_session")
