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
