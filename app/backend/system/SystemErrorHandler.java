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

package backend.system;


import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.persistence.OptimisticLockException;

import play.Logger;
import play.http.HttpErrorHandler;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import backend.exceptions.MalformedDataException;



public class SystemErrorHandler implements HttpErrorHandler {

    private static final Logger.ALogger logger = Logger.of(SystemErrorHandler.class);

    @Override
    public CompletionStage<Result> onClientError(Http.RequestHeader request, int statusCode, String message) {
        logger.warn("onClientError: URL: {}, status: {}, msg: {}", request.uri(), statusCode, message);
        Result result;
        switch (statusCode) {
            case Http.Status.BAD_REQUEST:
                result = Results.badRequest(Json.toJson(new ApiError(message)));
                break;
            case Http.Status.NOT_FOUND:
                result = Results.notFound(Json.toJson(new ApiError(message)));
                break;
            case Http.Status.UNAUTHORIZED:
            case Http.Status.FORBIDDEN:
                result = Results.unauthorized(Json.toJson(new ApiError(message)));
                break;
            default:
                result = Results.internalServerError(Json.toJson(new ApiError(message)));
        }
        return CompletableFuture.completedFuture(result);
    }

    @Override
    public CompletionStage<Result> onServerError(Http.RequestHeader request, Throwable exception) {
        logger.error("onServerError: URL: {}", request.uri(), exception);
        Throwable cause = exception.getCause();
        String errorMessage = cause == null ? exception.getMessage() : cause.getMessage();
        Result result = Results.internalServerError(Json.toJson(new ApiError(errorMessage)));;
        if (cause != null) {
            if (cause instanceof MalformedDataException) {
                result = Results.badRequest(Json.toJson(errorMessage));
            }
            if (cause instanceof IllegalArgumentException) {
                result = Results.badRequest(Json.toJson(new ApiError(errorMessage)));
            }
            if (cause instanceof OptimisticLockException) {
                result = Results.badRequest("sitnet_error_data_has_changed");
            }
        }
        return CompletableFuture.completedFuture(result);
    }
}
