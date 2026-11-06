// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.modules

import features.lti.services.{LtiService, LtiTools}
import play.api.Configuration
import play.api.inject.SimpleModule
import play.api.inject.bind
import play.filters.csp.*

import javax.inject.{Inject, Provider, Singleton}

/** Play's CSPModule, except that while LTI is active (`lti.active`) the configured CSP is extended
  * with LTI's origins.
  *
  * The LTI launch iframe starts at the platform's issuer, and the launch is a form posted to the
  * tool inside it, so the issuer has to be in `frame-src` and every tool's origin in `form-action`
  * and `frame-src`. HOCON cannot turn the `lti.tools` object into a list of origins, so this is
  * done here, and adding a tool to `lti.tools` is all a deployment does. While LTI is not active
  * the CSP is left as configured. Enabled in place of `play.filters.csp.CSPModule`, whose bindings
  * are repeated as is.
  */
class LtiCspModule
    extends SimpleModule(
      bind[CSPConfig].toProvider[LtiCspConfigProvider],
      bind[CSPProcessor].to[DefaultCSPProcessor],
      bind[CSPResultProcessor].to[DefaultCSPResultProcessor],
      bind[CSPActionBuilder].to[DefaultCSPActionBuilder],
      bind[CSPFilter].toSelf,
      bind[CSPReportBodyParser].to[DefaultCSPReportBodyParser],
      bind[CSPReportActionBuilder].to[DefaultCSPReportActionBuilder]
    )

@Singleton
class LtiCspConfigProvider @Inject() (configuration: Configuration) extends Provider[CSPConfig]:
  override lazy val get: CSPConfig =
    val csp = CSPConfig.fromConfiguration(configuration)
    val lti = configuration.underlying
    if !LtiService.isActive(lti) then csp
    else
      val issuer = lti.getString("lti.platform.issuer").trim.stripSuffix("/")
      val tools  = LtiTools.fromConfig(lti).values.map(_.origin).toSeq.sorted
      LtiCspConfigProvider.withLtiOrigins(csp, frameOrigins = issuer +: tools, postOrigins = tools)

object LtiCspConfigProvider:

  /** Adds LTI's origins to `frame-src` and `form-action`. A directive configured as `'none'`
    * becomes just the origins, and stays `'none'` when there are none. A directive that is not
    * configured at all is left alone: it falls back to default-src, which adding it here would
    * override.
    */
  def withLtiOrigins(
      config: CSPConfig,
      frameOrigins: Seq[String],
      postOrigins: Seq[String]
  ): CSPConfig =
    def merged(value: String, origins: Seq[String]): String =
      val sources = (value.split("\\s+").toSeq.filter(_.nonEmpty) ++ origins).distinct
        .filterNot(_ == "'none'")
      if sources.isEmpty then "'none'" else sources.mkString(" ")
    config.copy(directives = config.directives.map {
      case CSPDirective("frame-src", value) =>
        CSPDirective("frame-src", merged(value, frameOrigins))
      case CSPDirective("form-action", value) =>
        CSPDirective("form-action", merged(value, postOrigins))
      case other => other
    })
