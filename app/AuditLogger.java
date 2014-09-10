import com.avaje.ebean.Ebean;
import models.Session;
import models.User;
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

            // TODO in production change back to id
            // for debugging purposes nicer to have email
//            Long user = session.getUserId();

            User u = Ebean.find(User.class)
                    .select("id, email")
                    .where()
                    .eq("id", session.getUserId())
                    .findUnique();

            String user = u.getId() +", "+ u.getEmail();

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
