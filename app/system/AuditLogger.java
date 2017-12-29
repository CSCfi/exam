/*
 * Copyright (c) 2017 Exam Consortium
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

package system;

import models.User;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Http;

class AuditLogger {

    public static void log(Http.Request request, User user) {
        String method = request.method();
        String userString = user == null ?
                "user <NULL>" :
                String.format("user #%d [%s]", user.getId(), user.getEmail());
        String uri = request.uri();
        StringBuilder logEntry = new StringBuilder(
                String.format("%s %s %s %s", DateTime.now(), userString, method, uri));
        if (!method.equals("GET")) {
            String body = request.body() == null || request.body().asJson() == null ? null :
                    request.body().asJson().toString();
            logEntry.append(String.format(" data: %s", body));
        }
        Logger.debug(logEntry.toString());
    }

}
