package security.interceptors;


import akka.stream.Materializer;
import akka.util.ByteString;
import com.fasterxml.jackson.databind.JsonNode;
import com.google.inject.Inject;
import io.netty.handler.codec.http.HttpResponseStatus;
import play.Logger;
import play.core.j.JavaResultExtractor;
import play.libs.Json;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;

import java.util.concurrent.CompletionStage;
import java.util.stream.Stream;

class StudentExamAction extends Action<SensitiveDataPolicy> {

    private static final Long TIMEOUT = 1000L;

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
            if (result.status() <= HttpResponseStatus.CREATED.code() &&
                    result.body().contentType().orElse("").equals("application/json")) {
                ByteString body = JavaResultExtractor.getBody(result, TIMEOUT, materializer);
                JsonNode bodyJson = Json.parse(body.decodeString("UTF-8"));
                if (searchForSensitiveContent(bodyJson) != null) {
                    Logger.error("!!!Sensitive data returned by action!!!");
                    throw new SecurityException();
                }
            }
            return result;
        });
    }
}
