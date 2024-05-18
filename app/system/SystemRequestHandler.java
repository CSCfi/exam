// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system;

import java.lang.reflect.Method;
import java.util.concurrent.CompletionStage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;

public class SystemRequestHandler implements play.http.ActionCreator {

    private static final Logger logger = LoggerFactory.getLogger(SystemRequestHandler.class);

    @Override
    public Action<?> createAction(Http.Request request, Method actionMethod) {
        return new Action.Simple() {
            @Override
            public CompletionStage<Result> call(Http.Request req) {
                log(req);
                return delegate.call(req);
            }
        };
    }

    private void log(Http.Request request) {
        String method = request.method();
        Http.Session session = request.session();
        String userString = session == null || session.get("id").isEmpty()
            ? "user <NULL>"
            : String.format("user #%d [%s]", Long.parseLong(session.get("id").get()), session.get("email").orElse(""));
        String uri = request.uri();
        StringBuilder logEntry = new StringBuilder(String.format("%s %s %s", userString, method, uri));
        // Do not log body of data import request to avoid logs getting unreadable.
        if (!method.equals("GET") && !method.equals("DELETE") && !request.path().equals("/integration/iop/import")) {
            String body = request.body() == null || request.body().asJson() == null
                ? null
                : request.body().asJson().toString();
            logEntry.append(String.format(" data: %s", body));
        }
        logger.debug(logEntry.toString());
    }
}
