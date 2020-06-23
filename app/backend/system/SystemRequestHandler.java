package backend.system;

import akka.http.scaladsl.settings.ParserSettings;
import java.lang.reflect.Method;
import java.util.concurrent.CompletionStage;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;

public class SystemRequestHandler implements play.http.ActionCreator {

    @Override
    public Action<?> createAction(Http.Request request, Method actionMethod) {
        return new Action.Simple() {

            @Override
            public CompletionStage<Result> call(Http.Request req) {
                AuditLogger.log(req);
                return delegate.call(req).thenApply(r -> r.withHeader("Expires", "0"));
            }
        };
    }
}
