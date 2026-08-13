// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package lti

import com.typesafe.config.ConfigFactory
import features.lti.services.{LtiError, LtiService}
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

class LtiServiceSpec extends AnyWordSpec with Matchers:

  private val launchUri = "http://moodle.local:8888/moodle500/enrol/lti/launch.php"

  private def service(extra: String = ""): LtiService =
    val base =
      s"""lti.platform.issuer = "https://exam.example.org"
         |lti.platform.target-link-uri = "$launchUri"
         |lti.platform.client-id = "client"
         |lti.platform.deployment-id = "deployment"
         |lti.platform.key-id = "kid"
         |lti.platform.public-key = "public.pem"
         |lti.platform.private-key = "private.pem"
         |lti.tool.initiate-login-url = "http://moodle.local:8888/moodle500/enrol/lti/login.php"
         |$extra
         |""".stripMargin
    LtiService(ConfigFactory.parseString(base))

  "LtiService.validateRedirectUri" when:
    "no allow-list is configured" should:
      "fall back to the configured target link URI" in:
        service().validateRedirectUri(launchUri) must be(Right(launchUri))

      "reject any other URI" in:
        service().validateRedirectUri("https://attacker.example/steal") must be(
          Left(LtiError.InvalidRedirectUri)
        )

    "an allow-list is configured" should:
      val withList =
        service(s"""lti.tool.redirect-uris = ["$launchUri", "https://alt.example/l"]""")

      "accept every listed URI" in:
        withList.validateRedirectUri(launchUri) must be(Right(launchUri))
        withList.validateRedirectUri("https://alt.example/l") must be(
          Right("https://alt.example/l")
        )

      "reject a URI that is not listed, even on an allowed host" in:
        withList.validateRedirectUri("https://alt.example/elsewhere") must be(
          Left(LtiError.InvalidRedirectUri)
        )

  "LtiService.buildLoginRedirect" should:
    "carry the issued login_hint so the tool can echo it back" in:
      val url = service().buildLoginRedirect("hint-token", "nonce", "state")
      url.map(_.contains("login_hint=hint-token")) must be(Right(true))

    "url-encode parameter values" in:
      val url = service().buildLoginRedirect("a b", "nonce", "state")
      url.map(_.contains("login_hint=a+b")) must be(Right(true))

    "report incomplete configuration rather than building a partial URL" in:
      val incomplete = LtiService(
        ConfigFactory.parseString(
          """lti.platform.issuer = ""
            |lti.platform.target-link-uri = ""
            |lti.platform.client-id = ""
            |lti.tool.initiate-login-url = ""
            |""".stripMargin
        )
      )
      incomplete.buildLoginRedirect("hint", "nonce", "state") must be(
        Left(LtiError.IncompleteConfiguration)
      )

  "LtiService.generateLoginHint" should:
    "produce a distinct value per call" in:
      val svc = service()
      svc.generateLoginHint must not be svc.generateLoginHint
