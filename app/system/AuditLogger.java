package system;

import com.avaje.ebean.Ebean;
import models.Session;
import models.User;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Http;

public class AuditLogger {

    private AuditLogger() {
    }

    public static void log(Http.Request request, Session session) {
            String method = request.method();
            String user = null;
            if (session != null) {
                User u = Ebean.find(User.class, session.getUserId());
                user = u.getId() + ", " + u.getEmail();
            }
            String uri = request.uri();
            String body = request.body() == null || request.body().asJson() == null ? null : request.body().asJson().toString();
            Logger.debug(DateTime.now() + " uid " + user + " " + method + " > " + uri + " data: " + body);
    }
}
