// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system

import play.api.http.HttpFilters
import play.api.mvc.{EssentialAction, EssentialFilter, RequestHeader}
import play.filters.cors.CORSFilter
import play.filters.csp.CSPFilter
import play.filters.csrf.CSRFFilter
import play.filters.gzip.GzipFilter
import play.filters.headers.SecurityHeadersFilter

import javax.inject.Inject

class AppFilters @Inject() (
    securityHeadersFilter: SecurityHeadersFilter,
    csrfFilter: CSRFFilter,
    gzipFilter: GzipFilter,
    corsFilter: CORSFilter,
    cspFilter: CSPFilter,
    auditFilter: AuditLogFilter,
    systemFilter: SystemFilter
) extends HttpFilters:

  override def filters: Seq[EssentialFilter] =
    Seq(
      securityHeadersFilter,
      csrfFilter,
      gzipFilter,
      AppFilters.exceptToolPosts(corsFilter),
      cspFilter,
      auditFilter,
      systemFilter
    )

object AppFilters:

  /** Requests an LTI tool makes as a form posted from its own page, in the browser.
    *
    * A browser sends such a post with the tool's `Origin`, which the CORS filter refuses since it
    * is not EXAM's own. Allowing the tool's origin there instead would let scripts on the tool's
    * pages read EXAM's API as the user. These posts are navigations, not script requests, so CORS
    * has nothing to protect there; the signed message in them is what is checked.
    */
  val ToolPosts: Set[String] = Set("/integration/lti/deep-link/return")

  def exceptToolPosts(filter: EssentialFilter): EssentialFilter = new EssentialFilter:
    override def apply(next: EssentialAction): EssentialAction =
      val filtered = filter(next)
      EssentialAction { (request: RequestHeader) =>
        if request.method == "POST" && ToolPosts.contains(request.path) then next(request)
        else filtered(request)
      }
