// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system

import play.api.http.HttpFilters
import play.api.mvc.EssentialFilter
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
    systemFilter: SystemFilter
) extends HttpFilters:

  override def filters: Seq[EssentialFilter] =
    Seq(securityHeadersFilter, csrfFilter, gzipFilter, corsFilter, cspFilter, systemFilter)
