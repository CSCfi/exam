/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */

package system.interceptors;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Arrays;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.validation.constraints.NotNull;
import org.apache.pekko.stream.Materializer;
import play.http.HttpEntity;
import play.libs.Json;
import play.mvc.Action;
import play.mvc.Result;
import scala.jdk.javaapi.CollectionConverters;
import util.json.JsonFilter;

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
                JsonFilter.filterProperties(
                    json,
                    CollectionConverters.asScala(ids).toSet(),
                    CollectionConverters.asScala(Arrays.asList(properties)).toSeq()
                );
                return new Result(
                    result.status(),
                    result.headers(),
                    HttpEntity.fromString(Json.stringify(json), "UTF-8")
                );
            });
    }
}
