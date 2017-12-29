/*
 * Copyright (c) 2017 Exam Consortium
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

package system;


import exceptions.MalformedDataException;
import play.Logger;
import play.http.HttpErrorHandler;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import javax.persistence.OptimisticLockException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public class SystemErrorHandler implements HttpErrorHandler {

    @Override
    public CompletionStage<Result> onClientError(Http.RequestHeader request, int statusCode, String message) {
        return CompletableFuture.supplyAsync(() -> {
            Logger.warn("onClientError: URL: {}, status: {}, msg: {}", request.uri(), statusCode, message);
            if (statusCode == play.mvc.Http.Status.BAD_REQUEST) {
                return Results.badRequest(Json.toJson(new ApiError(message)));
            }
            if (statusCode == play.mvc.Http.Status.NOT_FOUND) {
                return Results.notFound(Json.toJson(new ApiError(message)));
            }
            if (statusCode == Http.Status.UNAUTHORIZED || statusCode == Http.Status.FORBIDDEN) {
                return Results.unauthorized(Json.toJson(new ApiError(message)));
            }
            return Results.internalServerError(Json.toJson(new ApiError(message)));
        });
    }

    @Override
    public CompletionStage<Result> onServerError(Http.RequestHeader request, Throwable exception) {
        return CompletableFuture.supplyAsync(() -> {
            Throwable cause = exception.getCause();
            String errorMessage = cause == null ? exception.getMessage() : cause.getMessage();
            Logger.error("onServerError: URL: {}, msg: {}", request.uri(), errorMessage);
            exception.printStackTrace();
            if (cause != null) {
                if (cause instanceof MalformedDataException) {
                    return Results.badRequest(Json.toJson(errorMessage));
                }
                if (cause instanceof IllegalArgumentException) {
                    return Results.badRequest(Json.toJson(new ApiError(errorMessage)));
                }
                if (cause instanceof OptimisticLockException) {
                    return Results.badRequest("sitnet_error_data_has_changed");
                }
            }
            return Results.internalServerError(Json.toJson(new ApiError(errorMessage)));
        });
    }
}
