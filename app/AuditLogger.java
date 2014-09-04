import models.Session;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Http;

import java.lang.reflect.Method;

public class AuditLogger {

    private AuditLogger() {
    }

    public static void log(final Http.Request request, final Method actionMethod, final Session session) {
        try {
            String method = request.method();
            Long user = session.getUserId();
            String uri = request.uri();
            String data = "--";
            try {
                data = request.body().asJson().toString();
            } catch (Exception ex) {
            }
            Logger.debug(DateTime.now() + " uid " + user + " " + method + " > " + uri + " data: " + data);
        } catch (Exception ex) {
        }
    }
}
