package backend.sanitizers;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

import com.fasterxml.jackson.databind.JsonNode;
import play.Logger;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

public abstract class BaseSanitizer extends play.mvc.Action.Simple {

    protected play.Logger.ALogger logger() {
        return Logger.of(getClass());
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
