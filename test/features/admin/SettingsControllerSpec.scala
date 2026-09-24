// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin

import base.BaseIntegrationSpec
import play.api.http.Status
import play.api.libs.json.*

class SettingsControllerSpec extends BaseIntegrationSpec:

  "SettingsController" when:
    "setting review deadline" should:
      "allow ADMIN to update deadline with a string" in:
        val (_, session) = runIO(loginAsAdmin())
        val data         = Json.obj("value" -> "21")
        val result       = runIO(put("/app/settings/deadline", data, session = session))

        statusOf(result).must(be(Status.OK))
        val response = contentAsJsonOf(result)
        (response \ "name").as[String].must(be("review_deadline"))
        (response \ "value").as[String].must(be("21"))

      "allow ADMIN to update deadline with a number" in:
        val (_, session) = runIO(loginAsAdmin())
        val data         = Json.obj("value" -> 15)
        val result       = runIO(put("/app/settings/deadline", data, session = session))

        statusOf(result).must(be(Status.OK))
        val response = contentAsJsonOf(result)
        (response \ "name").as[String].must(be("review_deadline"))
        (response \ "value").as[String].must(be("15"))

      "return BadRequest if value is missing" in:
        val (_, session) = runIO(loginAsAdmin())
        val data         = Json.obj("wrong_key" -> "val")
        val result       = runIO(put("/app/settings/deadline", data, session = session))

        statusOf(result).must(be(Status.BAD_REQUEST))
        contentAsStringOf(result).must(be("Missing value"))

      "deny access to non-admins" in:
        val (_, session) = runIO(loginAsTeacher())
        val data         = Json.obj("value" -> "10")
        val result       = runIO(put("/app/settings/deadline", data, session = session))

        statusOf(result).must(be(Status.FORBIDDEN))

    "setting reservation window size" should:
      "allow ADMIN to update window size with a string" in:
        val (_, session) = runIO(loginAsAdmin())
        val data         = Json.obj("value" -> "45")
        val result       = runIO(put("/app/settings/reservationWindow", data, session = session))

        statusOf(result).must(be(Status.OK))
        val response = contentAsJsonOf(result)
        (response \ "name").as[String].must(be("reservation_window_size"))
        (response \ "value").as[String].must(be("45"))

      "allow ADMIN to update window size with a number" in:
        val (_, session) = runIO(loginAsAdmin())
        val data         = Json.obj("value" -> 60)
        val result       = runIO(put("/app/settings/reservationWindow", data, session = session))

        statusOf(result).must(be(Status.OK))
        val response = contentAsJsonOf(result)
        (response \ "name").as[String].must(be("reservation_window_size"))
        (response \ "value").as[String].must(be("60"))

      "return BadRequest if value is missing" in:
        val (_, session) = runIO(loginAsAdmin())
        val data         = Json.obj("foo" -> "bar")
        val result       = runIO(put("/app/settings/reservationWindow", data, session = session))

        statusOf(result).must(be(Status.BAD_REQUEST))
        contentAsStringOf(result).must(be("Missing value"))

      "deny access to non-admins" in:
        val (_, session) = runIO(loginAsStudent())
        val data         = Json.obj("value" -> "30")
        val result       = runIO(put("/app/settings/reservationWindow", data, session = session))

        statusOf(result).must(be(Status.FORBIDDEN))

    "getting the configuration" should:
      "include the effective retention policy" in:
        val (_, session) = runIO(loginAsAdmin())
        val result       = runIO(get("/app/config", session = session))

        statusOf(result).must(be(Status.OK))
        val retention = contentAsJsonOf(result) \ "retention"
        (retention \ "dryRun").as[Boolean].must(be(true))
        (retention \ "batchSize").as[Int].must(be(500))
        (retention \ "studentInactivity").as[String].must(be("P6M"))
        (retention \ "booking").as[String].must(be("P2Y"))
        (retention \ "assessedAttempt").as[String].must(be("P6M"))
        (retention \ "maturityAttempt").as[String].must(be("P6M"))
        (retention \ "abortedAttempt").as[String].must(be("P1Y"))
        (retention \ "autoLock").as[String].must(be("P1Y"))
        (retention \ "record").as[String].must(be("P2Y"))
        (retention \ "hostCopy").as[String].must(be("P3M"))
        (contentAsJsonOf(result) \ "expirationPeriod").toOption.must(be(None))

      "deny access to non-admins" in:
        val (_, session) = runIO(loginAsTeacher())
        val result       = runIO(get("/app/config", session = session))

        statusOf(result).must(be(Status.FORBIDDEN))
