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

package backend.system;

import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Http;

class AuditLogger {

    private static final Logger.ALogger logger = Logger.of(AuditLogger.class);

    public static void log(Http.Request request) {
        String method = request.method();
        Http.Session session = request.session();
        String userString = session == null || session.get("id").isEmpty()
            ? "user <NULL>"
            : String.format("user #%d [%s]", Long.parseLong(session.get("id").get()), session.get("email").orElse(""));
        String uri = request.uri();
        StringBuilder logEntry = new StringBuilder(
            String.format("%s %s %s %s", DateTime.now(), userString, method, uri)
        );
        // Do not log body of data import request to avoid logs getting unreadable.
        if (!method.equals("GET") && !request.path().equals("/integration/iop/import")) {
            String body = request.body() == null || request.body().asJson() == null
                ? null
                : request.body().asJson().toString();
            logEntry.append(String.format(" data: %s", body));
        }
        logger.debug(logEntry.toString());
    }
}
