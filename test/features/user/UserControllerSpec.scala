// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user

import base.BaseIntegrationSpec
import models.user.User
import play.api.http.Status
import play.api.libs.json.*

class UserControllerSpec extends BaseIntegrationSpec:

  // Two share a last name so that the first name decides their order
  private val Names = List(("Sortcheck", "Bea"), ("Aasortcheck", "Zed"), ("Sortcheck", "Ada"))

  private def createUsers(): Unit =
    Names.foreach { case (last, first) =>
      val user = new User
      user.firstName = first
      user.lastName = last
      user.email = s"${first.toLowerCase}.${last.toLowerCase}@sortcheck.fi"
      user.eppn = s"${first.toLowerCase}.${last.toLowerCase}@sortcheck.fi"
      user.save()
    }

  private def sortcheckNames(result: play.api.mvc.Result) =
    contentAsJsonOf(result)
      .as[Seq[JsObject]]
      .map(u => ((u \ "lastName").as[String], (u \ "firstName").as[String]))
      .filter(_._1.toLowerCase.contains("sortcheck"))

  private val Expected = List(("Aasortcheck", "Zed"), ("Sortcheck", "Ada"), ("Sortcheck", "Bea"))

  "UserController" when:
    "listing users" should:
      "order them by last name and then first name" in:
        val (_, session) = runIO(loginAsAdmin())
        createUsers()
        val result = runIO(get("/app/users", session = session))

        statusOf(result).must(be(Status.OK))
        sortcheckNames(result).must(be(Expected))

      "keep that order when filtering" in:
        val (_, session) = runIO(loginAsAdmin())
        createUsers()
        val result = runIO(get("/app/users?filter=sortcheck", session = session))

        statusOf(result).must(be(Status.OK))
        sortcheckNames(result).must(be(Expected))
