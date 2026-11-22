// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package admin

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

/** The settings the application reads and the administrator changes */
class SettingsSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def call(
      method: String,
      url: String,
      session: Session,
      body: Option[JsValue] = None
  ): Result = runIO(makeRequest(method, url, body, session = session))

  private def json(url: String, session: Session): JsValue =
    val result = call("GET", url, session)
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result)

  "Settings" when:
    "the administrator changes them" should:
      "store the review deadline and reservation window" in:
        val (_, session) = runIO(loginAsAdmin())

        statusOf(call("PUT", "/app/settings/deadline", session, Some(Json.obj("value" -> 21)))) must
          be(Status.OK)
        (json("/app/settings/deadline", session) \ "value").as[String] must be("21")
        statusOf(call(
          "PUT",
          "/app/settings/reservationWindow",
          session,
          Some(Json.obj("value" -> "60"))
        )) must be(Status.OK)
        (json("/app/settings/reservationWindow", session) \ "value").as[String] must be("60")
        (json("/app/config", session) \ "reviewDeadline").as[Int] must be(21)

      "refuse a value that is not a whole number of days" in:
        val (_, session) = runIO(loginAsAdmin())
        Seq(Json.obj("value" -> -1), Json.obj("value" -> "soon"), Json.obj()).foreach { body =>
          statusOf(call("PUT", "/app/settings/deadline", session, Some(body))) must be(
            Status.BAD_REQUEST
          )
          statusOf(call("PUT", "/app/settings/reservationWindow", session, Some(body))) must be(
            Status.BAD_REQUEST
          )
        }

      "make everyone accept a changed user agreement again, unless the change is minor" in:
        val (_, session)           = runIO(loginAsAdmin())
        def accepted: Seq[Boolean] = DB.find(classOf[User]).list.map(_.userAgreementAccepted)
        DB.find(classOf[User]).list.foreach { u =>
          u.userAgreementAccepted = true
          u.update()
        }

        statusOf(call(
          "PUT",
          "/app/settings/agreement",
          session,
          Some(Json.obj("value" -> "<p>Be nice</p>", "minorUpdate" -> true))
        )) must be(Status.OK)
        accepted.distinct must be(Seq(true))
        (json("/app/settings/agreement", session) \ "value").as[String] must be("<p>Be nice</p>")

        statusOf(call(
          "PUT",
          "/app/settings/agreement",
          session,
          Some(Json.obj("value" -> "<p>Be nicer</p>", "minorUpdate" -> false))
        )) must be(Status.OK)
        accepted.distinct must be(Seq(false))

      "not let a teacher change them" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(call("PUT", "/app/settings/deadline", session, Some(Json.obj("value" -> 1)))) must
          be(Status.FORBIDDEN)
        statusOf(call("GET", "/app/config", session)) must be(Status.FORBIDDEN)

    "the application reads them" should:
      "give the whole configuration to the administrator" in:
        val (_, session) = runIO(loginAsAdmin())
        val config       = json("/app/config", session)

        (config \ "defaultTimeZone").as[String] must be("Europe/Helsinki")
        (config \ "examDurations").as[Seq[Int]] must not be empty
        (config \ "roles").as[JsObject].keys must not be empty
        (config \ "retention" \ "batchSize").as[Int] must be > 0
        (json("/app/settings/appVersion", session) \ "appVersion").as[String] must not be empty

      "answer the editor's questions about what is allowed" in:
        val (_, session) = runIO(loginAsTeacher())
        val answers = Seq(
          "/app/settings/durations"                -> "examDurations",
          "/app/settings/maxDuration"              -> "maxDuration",
          "/app/settings/minDuration"              -> "minDuration",
          "/app/settings/gradescale"               -> "overridable",
          "/app/settings/enrolmentPermissionCheck" -> "active",
          "/app/settings/byodmaxparticipants"      -> "max",
          "/app/settings/newMultichoiceSupport"    -> "multichoiceFeaturesOn",
          "/app/settings/hostname"                 -> "hostname",
          "/app/settings/maxfilesize"              -> "filesize",
          "/app/settings/coursecodeprefix"         -> "prefix",
          "/app/settings/environment"              -> "isProd",
          "/app/settings/iop/examVisit"            -> "isExamVisitSupported",
          "/app/settings/iop/examCollaboration"    -> "isExamCollaborationSupported",
          "/app/settings/anonymousReviewEnabled"   -> "anonymousReviewEnabled",
          "/app/settings/byod"                     -> "sebExaminationSupported"
        )
        answers.foreach((url, key) => (json(url, session) \ key).toOption must not be empty)

      "give students their quit link and the booking limits" in:
        val (_, session) = runIO(loginAsStudent())
        (json("/app/settings/examinationQuitLink", session) \ "quitLink").toOption must not be empty
        (json("/app/settings/reservationWindow", session) \ "value").as[String] must be("30")
        (json("/app/settings/deadline", session) \ "value").as[String] must be("14")

    "maturity instructions are asked for" should:
      "give them in a known language only" in:
        val (_, session) = runIO(loginAsStudent())

        statusOf(call("GET", "/app/settings/maturityInstructions?lang=fi", session)) must be(
          Status.OK
        )
        statusOf(call("GET", "/app/settings/maturityInstructions?lang=xx", session)) must be(
          Status.BAD_REQUEST
        )
        contentAsStringOf(call(
          "GET",
          "/app/settings/maturityInstructions?lang=fi&ref=no-such-hash",
          session
        )) must be("Enrolment not found")

      "give them to another organisation" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(
          call("GET", "/integration/iop/reservations/abc/instructions?lang=fi", session)
        ) must
          be(Status.OK)
        statusOf(
          call("GET", "/integration/iop/reservations/abc/instructions?lang=xx", session)
        ) must
          be(Status.BAD_REQUEST)
