/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
 */

package backend.system.interceptors;


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
