// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.interceptors;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Arrays;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.validation.constraints.NotNull;
import miscellaneous.json.JsonFilter;
import org.apache.pekko.stream.Materializer;
import play.http.HttpEntity;
import play.libs.Json;
import play.mvc.Action;
import play.mvc.Result;
import scala.jdk.javaapi.CollectionConverters;

abstract class JsonFilterAction<T> extends Action<T> {

    private final Materializer materializer;

    JsonFilterAction(Materializer materializer) {
        this.materializer = materializer;
    }

    @NotNull
    CompletionStage<Result> filterJsonResponse(Result result, String... properties) {
        return filterJsonResponse(result, Collections.emptySet(), properties);
    }

    @NotNull
    CompletionStage<Result> filterJsonResponse(Result result, Set<Long> ids, String... properties) {
        String contentType = result.contentType().orElse("");
        if (!contentType.equalsIgnoreCase("application/json") || properties.length < 1) {
            return CompletableFuture.completedFuture(result);
        }
        return result
            .body()
            .consumeData(materializer)
            .thenApply(body -> {
                JsonNode json = Json.parse(body.decodeString("UTF-8"));
                JsonNode filtered = JsonFilter.filter(
                    json,
                    CollectionConverters.asScala(ids).toSet(),
                    CollectionConverters.asScala(Arrays.asList(properties)).toSet()
                );
                return new Result(
                    result.status(),
                    result.headers(),
                    HttpEntity.fromString(Json.stringify(filtered), "UTF-8")
                );
            });
    }
}
