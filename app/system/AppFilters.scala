package system

import javax.inject.Inject

import play.api.http.HttpFilters
import play.filters.csrf.CSRFFilter
import play.filters.gzip.GzipFilter
import play.filters.headers.SecurityHeadersFilter

class AppFilters @Inject() (securityHeadersFilter: SecurityHeadersFilter, csrfFilter: CSRFFilter, gzipFilter: GzipFilter) extends HttpFilters {
  override def filters = Seq(securityHeadersFilter, csrfFilter, gzipFilter)
}
