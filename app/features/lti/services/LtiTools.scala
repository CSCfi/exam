// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.lti.services

import com.typesafe.config.Config
import play.api.Logging

import java.net.URI
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** A custom parameter a tool expects in the launch, filled in per question by the teacher.
  * `requires` names other parameters that must be given along with this one when it is given.
  */
final case class LtiToolParameter(name: String, required: Boolean, requires: List[String] = Nil)

/** One LTI 1.3 tool registered with this platform, read from `lti.tools.<key>`.
  *
  * Client and deployment id are the tool's: each tool registers the platform separately and hands
  * out its own. The platform's issuer and signing key are shared by every tool.
  */
final case class LtiTool(
    key: String,
    name: String,
    origin: String,
    clientId: String,
    deploymentId: String,
    initiateLoginUrl: String,
    targetLinkUri: String,
    redirectUris: List[String],
    jwksUrl: Option[String],
    parameters: List[LtiToolParameter]
):
  def requiredParameters: List[String] = parameters.filter(_.required).map(_.name)
  def parameterNames: Set[String]      = parameters.map(_.name).toSet

  /** The custom parameters to launch with, out of what a question stores: blank values dropped,
    * only the parameters this tool declares kept, and every required one present.
    */
  def customParameters(values: Map[String, String]): Either[LtiError, Map[String, String]] =
    val provided = values.view.mapValues(_.trim).filter((k, v) => parameterNames(k) && v.nonEmpty)
      .toMap
    val complete = requiredParameters.forall(provided.contains) &&
      parameters.filter(p => provided.contains(p.name)).forall(_.requires.forall(provided.contains))
    Either.cond(complete, provided, LtiError.MissingToolParameters)

  /** The tool must echo back a registered redirect URI; anything else would leak the id_token.
    */
  def validateRedirectUri(uri: String): Either[LtiError, String] =
    Either.cond(redirectUris.contains(uri), uri, LtiError.InvalidRedirectUri)

object LtiTools extends Logging:

  val ToolsPath = "lti.tools"

  /** Tools keyed by their config key. An entry that cannot be used is logged and left out rather
    * than failing startup: the rest of EXAM does not depend on LTI, and the questions using a
    * missing tool fail to launch with a clear error.
    */
  def fromConfig(config: Config): Map[String, LtiTool] =
    if !config.hasPath(ToolsPath) then Map.empty
    else
      val tools = config.getConfig(ToolsPath)
      config.getObject(ToolsPath).keySet.asScala.toList.sorted.flatMap { key =>
        // Typesafe Config throws on a value of the wrong type; turn that into a reason too.
        Try(parse(key, tools.getConfig(key))).toEither.left
          .map(e => s"invalid configuration (${e.getMessage})")
          .flatten match
          case Right(tool) => Some(key -> tool)
          case Left(reason) =>
            logger.error(s"Ignoring LTI tool '$key': $reason")
            None
      }.toMap

  private def parse(key: String, c: Config): Either[String, LtiTool] =
    def string(path: String): Either[String, String] =
      Try(c.getString(path)).toOption.map(_.trim).filter(_.nonEmpty).toRight(s"$path is missing")
    def optString(path: String): Option[String] =
      Option.when(c.hasPath(path))(c.getString(path).trim).filter(_.nonEmpty)
    for
      origin           <- string("origin").flatMap(validOrigin)
      clientId         <- string("client-id")
      deploymentId     <- string("deployment-id")
      initiateLoginUrl <- string("initiate-login-url")
      targetLinkUri    <- string("target-link-uri")
      parameters       <- parseParameters(c)
    yield
      val redirectUris =
        if c.hasPath("redirect-uris") then
          c.getStringList("redirect-uris").asScala.toList.map(_.trim).filter(_.nonEmpty)
        else List(targetLinkUri)
      LtiTool(
        key = key,
        name = optString("name").getOrElse(key),
        origin = origin,
        clientId = clientId,
        deploymentId = deploymentId,
        initiateLoginUrl = initiateLoginUrl,
        targetLinkUri = targetLinkUri,
        redirectUris = redirectUris,
        jwksUrl = optString("jwks-url"),
        parameters = parameters
      )

  /** The origin goes into CSP directives verbatim, so it must be exactly scheme://host[:port]. */
  private def validOrigin(origin: String): Either[String, String] =
    Try(URI(origin)).toOption
      .filter(u => Option(u.getScheme).exists(s => s == "https" || s == "http"))
      .filter(u => Option(u.getHost).exists(_.nonEmpty))
      .filter(u => Option(u.getRawPath).forall(p => p.isEmpty || p == "/"))
      .filter(u => u.getRawQuery == null && u.getRawFragment == null && u.getRawUserInfo == null)
      .map(_ => origin.stripSuffix("/"))
      .toRight(s"origin '$origin' is not of the form https://host[:port]")

  private def parseParameters(c: Config): Either[String, List[LtiToolParameter]] =
    if !c.hasPath("parameters") then Right(Nil)
    else
      val parsed = c.getConfigList("parameters").asScala.toList.map { p =>
        Try(p.getString("name").trim).toOption.filter(_.nonEmpty).map { name =>
          LtiToolParameter(
            name,
            p.hasPath("required") && p.getBoolean("required"),
            if p.hasPath("requires") then p.getStringList("requires").asScala.toList.map(_.trim)
            else Nil
          )
        }
      }
      if parsed.exists(_.isEmpty) then Left("every parameter needs a name")
      else
        val params = parsed.flatten
        val names  = params.map(_.name)
        if names.distinct.size != names.size then Left("parameter names must be unique")
        else
          params.flatMap(_.requires).find(!names.contains(_)) match
            case Some(unknown) => Left(s"a parameter requires '$unknown', which is not declared")
            case None          => Right(params)
