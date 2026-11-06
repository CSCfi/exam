// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package lti

import com.typesafe.config.ConfigFactory
import features.lti.services.*
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import play.filters.csp.{CSPConfig, CSPDirective}
import system.modules.LtiCspConfigProvider

class LtiServiceSpec extends AnyWordSpec with Matchers:

  private val launchUri = "http://moodle.local:8888/enrol/lti/launch.php"

  private val moodle =
    s"""moodle {
       |  name = "Moodle"
       |  origin = "http://moodle.local:8888"
       |  client-id = "moodle-client"
       |  deployment-id = "moodle-deployment"
       |  initiate-login-url = "http://moodle.local:8888/enrol/lti/login.php?id=reg"
       |  target-link-uri = "$launchUri"
       |  parameters = [{ name = "id", required = true }]
       |}""".stripMargin

  private val aplus =
    """aplus {
      |  name = "A+"
      |  origin = "https://plus.example.org"
      |  client-id = "aplus-client"
      |  deployment-id = "aplus-deployment"
      |  initiate-login-url = "https://plus.example.org/lti/login/"
      |  target-link-uri = "https://plus.example.org/lti/launch/"
      |  parameters = [
      |    { name = "course_slug", required = true },
      |    { name = "instance_slug", required = true },
      |    { name = "module_slug" },
      |    { name = "exercise_path", requires = ["module_slug"] }
      |  ]
      |}""".stripMargin

  private def tools(entries: String*): Map[String, LtiTool] =
    LtiTools.fromConfig(ConfigFactory.parseString(s"lti.tools {\n${entries.mkString("\n")}\n}"))

  private def tool(entry: String): LtiTool = tools(entry).values.head

  private def service(issuer: String = "https://exam.example.org"): LtiService =
    LtiService(ConfigFactory.parseString(s"""lti.active = true
                                            |lti.platform.issuer = "$issuer"
                                            |lti.tools { $moodle }
                                            |""".stripMargin))

  "LtiTools.fromConfig" should:
    "read every configured tool under its key" in:
      val all = tools(moodle, aplus)
      all.keySet must be(Set("moodle", "aplus"))
      all("aplus").clientId must be("aplus-client")
      all("aplus").deploymentId must be("aplus-deployment")
      all("aplus").parameters must be(
        List(
          LtiToolParameter("course_slug", required = true),
          LtiToolParameter("instance_slug", required = true),
          LtiToolParameter("module_slug", required = false),
          LtiToolParameter("exercise_path", required = false, requires = List("module_slug"))
        )
      )

    "have no tools when none are configured" in:
      LtiTools.fromConfig(ConfigFactory.empty) must be(Map.empty)

    "leave out a tool with a missing setting and keep the rest" in:
      val broken = """broken { origin = "https://broken.example.org", client-id = "c" }"""
      tools(moodle, broken).keySet must be(Set("moodle"))

    "leave out a tool whose origin is not a bare origin" in:
      Seq("https://plus.example.org/path", "plus.example.org", "https://a.org 'unsafe-inline'")
        .foreach { origin =>
          withClue(s"origin '$origin': ")(
            tools(aplus.replace("https://plus.example.org\"", s"$origin\"")) must be(Map.empty)
          )
        }

    "leave out a tool with a value of the wrong type" in:
      tools(moodle, """bad { parameters = "id" }""").keySet must be(Set("moodle"))

    "leave out a tool whose parameter requires an undeclared parameter" in:
      tools(moodle.replace("required = true", "required = true, requires = [\"other\"]")) must be(
        Map.empty
      )

    "use the key as the name when none is given" in:
      tool(moodle.replace("name = \"Moodle\"", "")).name must be("moodle")

  "LtiTool.validateRedirectUri" when:
    "no allow-list is configured" should:
      "fall back to the configured target link URI" in:
        tool(moodle).validateRedirectUri(launchUri) must be(Right(launchUri))

      "reject any other URI" in:
        tool(moodle).validateRedirectUri("https://attacker.example/steal") must be(
          Left(LtiError.InvalidRedirectUri)
        )

    "an allow-list is configured" should:
      val withList = tool(
        moodle.replace(
          "parameters",
          s"""redirect-uris = ["$launchUri", "https://alt.example/l"]
                                       |  parameters""".stripMargin
        )
      )

      "accept every listed URI" in:
        withList.validateRedirectUri(launchUri) must be(Right(launchUri))
        withList.validateRedirectUri("https://alt.example/l") must be(
          Right("https://alt.example/l")
        )

      "reject a URI that is not listed, even on an allowed host" in:
        withList.validateRedirectUri("https://alt.example/elsewhere") must be(
          Left(LtiError.InvalidRedirectUri)
        )

  "LtiTool.customParameters" should:
    "keep the declared parameters a question gives" in:
      val exercise = Map(
        "course_slug"   -> "cs-101",
        "instance_slug" -> "2026",
        "module_slug"   -> "w1",
        "exercise_path" -> "e1"
      )
      tool(aplus).customParameters(exercise) must be(Right(exercise))

    // A+ reads module_slug whenever exercise_path is given
    "reject a parameter given without a parameter it requires" in:
      tool(aplus).customParameters(
        Map("course_slug" -> "cs-101", "instance_slug" -> "2026", "exercise_path" -> "e1")
      ) must be(Left(LtiError.MissingToolParameters))

    "allow an optional parameter to be left out" in:
      tool(aplus).customParameters(Map("course_slug" -> "cs-101", "instance_slug" -> "2026")) must
        be(Right(Map("course_slug" -> "cs-101", "instance_slug" -> "2026")))

    "drop parameters the tool does not declare, and blank values" in:
      tool(moodle).customParameters(Map("id" -> " r-1 ", "other" -> "x", "blank" -> " ")) must be(
        Right(Map("id" -> "r-1"))
      )

    "reject a missing or blank required parameter" in:
      tool(aplus).customParameters(Map("course_slug" -> "cs-101")) must be(
        Left(LtiError.MissingToolParameters)
      )
      tool(moodle).customParameters(Map("id" -> "  ")) must be(Left(LtiError.MissingToolParameters))

  "LtiService.tool" should:
    "find a configured tool by key" in:
      service().tool("moodle").map(_.clientId) must be(Right("moodle-client"))

    "report a tool that is not configured, or no tool at all" in:
      service().tool("aplus") must be(Left(LtiError.ToolNotConfigured))
      service().tool(null) must be(Left(LtiError.ToolNotConfigured))

  "LtiService.buildLoginRedirect" should:
    "send the browser to the tool's login URL with the tool's client id" in:
      val svc = service()
      val url = svc.buildLoginRedirect(tool(aplus), "hint-token", "nonce", "state")
      url.map(_.startsWith("https://plus.example.org/lti/login/?")) must be(Right(true))
      url.map(_.contains("client_id=aplus-client")) must be(Right(true))

    "carry the issued login_hint so the tool can echo it back" in:
      val url = service().buildLoginRedirect(tool(moodle), "hint-token", "nonce", "state")
      url.map(_.contains("login_hint=hint-token")) must be(Right(true))

    "keep the query string of the tool's login URL" in:
      val url = service().buildLoginRedirect(tool(moodle), "hint", "nonce", "state")
      url.map(_.startsWith("http://moodle.local:8888/enrol/lti/login.php?id=reg&")) must be(
        Right(true)
      )

    "url-encode parameter values" in:
      val url = service().buildLoginRedirect(tool(moodle), "a b", "nonce", "state")
      url.map(_.contains("login_hint=a+b")) must be(Right(true))

    "report incomplete configuration rather than building a partial URL" in:
      service(issuer = "").buildLoginRedirect(tool(moodle), "hint", "nonce", "state") must be(
        Left(LtiError.IncompleteConfiguration)
      )

  "LtiService.generateLoginHint" should:
    "produce a distinct value per call" in:
      val svc = service()
      svc.generateLoginHint must not be svc.generateLoginHint

  "LtiService.active" should:
    "be off unless lti.active is set" in:
      LtiService(ConfigFactory.parseString(s"lti.tools { $moodle }")).active must be(false)

    "read no tools while off" in:
      val off = LtiService(ConfigFactory.parseString(s"lti.active = false\nlti.tools { $moodle }"))
      off.tools must be(Map.empty)
      off.tool("moodle") must be(Left(LtiError.ToolNotConfigured))

  "LtiCspConfigProvider" when:
    def csp(directives: (String, String)*) =
      CSPConfig(directives = directives.map((n, v) => CSPDirective(n, v)))
    def directive(config: CSPConfig, name: String) =
      config.directives.find(_.name == name).map(_.value)
    val issuer     = "https://exam.example.org"
    val origins    = Seq("https://moodle.example.org", "https://plus.example.org")
    val configured = Seq("form-action" -> "'none'", "frame-src" -> "'self'")

    "LTI is active" should:
      "let the launch iframe start at the issuer and post to and frame every tool" in:
        val merged =
          LtiCspConfigProvider.withLtiOrigins(csp(configured*), issuer +: origins, origins)
        directive(merged, "form-action") must be(
          Some("https://moodle.example.org https://plus.example.org")
        )
        directive(merged, "frame-src") must be(
          Some(s"'self' $issuer https://moodle.example.org https://plus.example.org")
        )

      "keep form-action 'none' when there are no tools" in:
        val merged = LtiCspConfigProvider.withLtiOrigins(csp(configured*), Seq(issuer), Nil)
        directive(merged, "form-action") must be(Some("'none'"))

      "leave other directives, and directives that are not configured, alone" in:
        val merged = LtiCspConfigProvider.withLtiOrigins(
          csp("default-src" -> "'self'"),
          issuer +: origins,
          origins
        )
        merged.directives must be(Seq(CSPDirective("default-src", "'self'")))

    def provided(lti: String): CSPConfig =
      val base = ConfigFactory.parseString(
        s"""play.filters.csp.directives.form-action = "'none'"
           |play.filters.csp.directives.frame-src = "'self'"
           |lti.platform.issuer = "$issuer/"
           |lti.tools { $moodle }
           |$lti
           |""".stripMargin
      )
      val reference = ConfigFactory.load(ConfigFactory.empty())
      LtiCspConfigProvider(play.api.Configuration(base.withFallback(reference))).get

    "reading the configuration" should:
      "add the issuer and the tool origins while LTI is active" in:
        val config = provided("lti.active = true")
        directive(config, "frame-src") must be(Some(s"'self' $issuer http://moodle.local:8888"))
        directive(config, "form-action") must be(Some("http://moodle.local:8888"))

      "leave the CSP as configured while LTI is not active" in:
        val config = provided("lti.active = false")
        directive(config, "frame-src") must be(Some("'self'"))
        directive(config, "form-action") must be(Some("'none'"))
