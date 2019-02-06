package backend.sanitizers;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

import com.fasterxml.jackson.databind.JsonNode;
import play.Logger;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

public abstract class BaseSanitizer extends play.mvc.Action.Simple {

    @Override
    public CompletionStage<Result> call(Http.Context ctx) {
        JsonNode body = ctx.request().body().asJson();
        try {
            return delegate.call(ctx.withRequest(sanitize(ctx, body)));
        } catch (SanitizingException e) {
            Logger.error("Sanitizing error: " + e.getMessage(), e);
            return CompletableFuture.supplyAsync(Results::badRequest);
        }
    }

    protected abstract Http.Request sanitize(Http.Context ctx, JsonNode body) throws SanitizingException;

}
