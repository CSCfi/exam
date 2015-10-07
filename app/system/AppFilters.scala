package system

import javax.inject.Inject

import play.api.http.HttpFilters
import play.filters.csrf.CSRFFilter
import play.filters.headers.SecurityHeadersFilter

class AppFilters @Inject() (securityHeadersFilter: SecurityHeadersFilter, csrfFilter: CSRFFilter) extends HttpFilters {
  override def filters = Seq(securityHeadersFilter, csrfFilter)
}
