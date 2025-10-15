// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;
import sanitizers.validation.FieldError;
import sanitizers.validation.ValidationException;

abstract class BaseSanitizer extends play.mvc.Action.Simple {

    protected Logger logger() {
        return LoggerFactory.getLogger(getClass());
    }

    @Override
    public CompletionStage<Result> call(Http.Request request) {
        JsonNode body = request.body().asJson();
        try {
            return delegate.call(sanitize(request, body));
        } catch (ValidationException e) {
            // Return structured validation errors as JSON
            logger().warn("Validation error: {}", e.getMessage());
            ObjectNode response = Json.newObject();
            response.put("status", "validation_error");

            ArrayNode errors = response.putArray("errors");
            for (FieldError fieldError : e.getValidationResult().getErrors()) {
                ObjectNode error = Json.newObject();
                error.put("field", fieldError.getField());
                error.put("message", fieldError.getMessage());
                errors.add(error);
            }

            return CompletableFuture.completedFuture(Results.badRequest(response));
        } catch (SanitizingException e) {
            logger().error("Sanitizing error: {}", e.getMessage(), e);
            return CompletableFuture.completedFuture(Results.badRequest(e.getMessage()));
        }
    }

    protected abstract Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException;
}
