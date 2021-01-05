/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.system

import javax.inject.Inject
import play.api.http.HttpFilters
import play.filters.cors.CORSFilter
import play.filters.csp.CSPFilter
import play.filters.csrf.CSRFFilter
import play.filters.gzip.GzipFilter
import play.filters.headers.SecurityHeadersFilter

class AppFilters @Inject()(securityHeadersFilter: SecurityHeadersFilter,
                           csrfFilter: CSRFFilter,
                           gzipFilter: GzipFilter,
                           corsFilter: CORSFilter,
                           cspFilter: CSPFilter,
                           systemFilter: SystemFilter)
    extends HttpFilters {

  override def filters =
    Seq(securityHeadersFilter, csrfFilter, gzipFilter, corsFilter, cspFilter, systemFilter)
}
