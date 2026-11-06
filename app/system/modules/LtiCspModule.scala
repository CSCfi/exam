// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.modules

import features.lti.services.LtiTools
import play.api.Configuration
import play.api.inject.SimpleModule
import play.api.inject.bind
import play.filters.csp.*

import javax.inject.{Inject, Provider, Singleton}

/** Play's CSPModule, except that the configured CSP is extended with the LTI tools' origins.
  *
  * The LTI launch is a form posted to the tool inside an iframe, so every tool's origin has to be
  * in `form-action` and `frame-src`. HOCON cannot turn the `lti.tools` object into a list of
  * origins, so this is done here, and adding a tool to `lti.tools` is all a deployment does.
  * Enabled in place of `play.filters.csp.CSPModule`, whose bindings are repeated as is.
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
    LtiCspConfigProvider.withToolOrigins(
      CSPConfig.fromConfiguration(configuration),
      LtiTools.fromConfig(configuration.underlying).values.map(_.origin).toSeq
    )

object LtiCspConfigProvider:
  val ToolDirectives: Set[String] = Set("form-action", "frame-src")

  /** Appends the origins to the tool directives. A directive configured as `'none'` becomes just
    * the origins, and stays `'none'` when there are none. A directive that is not configured at all
    * is left alone: it falls back to default-src, which adding it here would override.
    */
  def withToolOrigins(config: CSPConfig, origins: Seq[String]): CSPConfig =
    config.copy(directives = config.directives.map {
      case CSPDirective(name, value) if ToolDirectives(name) =>
        val sources = (value.split("\\s+").toSeq.filter(_.nonEmpty) ++ origins).distinct
        val merged  = sources.filterNot(_ == "'none'")
        CSPDirective(name, if merged.isEmpty then "'none'" else merged.mkString(" "))
      case other => other
    })
