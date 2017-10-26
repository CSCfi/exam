package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import play.Logger;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;

public class CommaJoinedListSanitizer extends play.mvc.Action.Simple {

    public CompletionStage<Result> call(Http.Context ctx) {
        JsonNode body = ctx.request().body().asJson();
        try {
            return delegate.call(ctx.withRequest(sanitize(ctx, body)));
        } catch (SanitizingException e) {
            Logger.error("Sanitizing error: " + e.getMessage(), e);
            return CompletableFuture.supplyAsync(Results::badRequest);
        }
    }

    private Http.Request sanitize(Http.Context ctx, JsonNode body) throws SanitizingException {
        String args = SanitizingHelper.parse("ids", body, String.class)
                .orElseThrow(() -> new SanitizingException("bad list"));
        List<Long> ids = Arrays.stream(args.split(",")).map(Long::parseLong).collect(Collectors.toList());
        if (ids.isEmpty()) {
            throw new SanitizingException("empty list");
        }
        return ctx.request().addAttr(Attrs.ID_COLLECTION, ids);
    }
}
