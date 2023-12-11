package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

abstract class BaseSanitizer extends play.mvc.Action.Simple {

    protected Logger logger() {
        return LoggerFactory.getLogger(getClass());
    }

    @Override
    public CompletionStage<Result> call(Http.Request request) {
        JsonNode body = request.body().asJson();
        try {
            return delegate.call(sanitize(request, body));
        } catch (SanitizingException e) {
            logger().error("Sanitizing error: " + e.getMessage(), e);
            return CompletableFuture.completedFuture(Results.badRequest());
        }
    }

    protected abstract Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException;
}
