package system.interceptors;


import akka.stream.Materializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.google.inject.Inject;
import play.Logger;
import play.libs.Json;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;

import java.util.concurrent.CompletionStage;
import java.util.stream.Stream;

// Action composition to ensure that no data classed as sensitive shall be sent to client.
class SensitiveDataAction extends Action<SensitiveDataPolicy> {

    private static final int HTTP_CREATED = 201;

    @Inject
    private Materializer materializer;

    private JsonNode searchForSensitiveContent(JsonNode node) {
        if (Stream.of(configuration.sensitiveFieldNames()).anyMatch(node::has)) {
            return node;
        }
        for (JsonNode child : node) {
            JsonNode result = searchForSensitiveContent(child);
            if (result != null) {
                return result;
            }
        }
        return null;
    }

    @Override
    public CompletionStage<Result> call(Http.Context ctx) {
        return delegate.call(ctx).thenApply(result -> {
            if (result.status() <= HTTP_CREATED &&
                    result.body().contentType().orElse("").equals("application/json")) {
                result.body().consumeData(materializer).thenApplyAsync(body -> {
                    JsonNode bodyJson = Json.parse(body.decodeString("UTF-8"));
                    if (searchForSensitiveContent(bodyJson) != null) {
                        Logger.error("!!!Sensitive data returned by action!!!");
                        throw new SecurityException();
                    }
                    return result;
                });
            }
            return result;
        });
    }
}
