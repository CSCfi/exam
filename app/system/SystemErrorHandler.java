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

package system;

import exceptions.MalformedDataException;
import jakarta.persistence.OptimisticLockException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.http.HttpErrorHandler;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

public class SystemErrorHandler implements HttpErrorHandler {

    private final Logger logger = LoggerFactory.getLogger(SystemErrorHandler.class);

    @Override
    public CompletionStage<Result> onClientError(Http.RequestHeader request, int statusCode, String message) {
        logger.warn("onClientError: {} {}, status: {}, msg: {}", request.method(), request.uri(), statusCode, message);
        Result result =
            switch (statusCode) {
                case Http.Status.BAD_REQUEST -> Results.badRequest(Json.toJson(new ApiError(message)));
                case Http.Status.NOT_FOUND -> Results.notFound(Json.toJson(new ApiError(message)));
                case Http.Status.UNAUTHORIZED, Http.Status.FORBIDDEN -> Results.unauthorized(
                    Json.toJson(new ApiError(message))
                );
                case Http.Status.REQUEST_ENTITY_TOO_LARGE -> Results.status(
                    statusCode,
                    Json.toJson(new ApiError(message))
                );
                default -> Results.internalServerError(Json.toJson(new ApiError(message)));
            };
        return CompletableFuture.completedFuture(result);
    }

    @Override
    public CompletionStage<Result> onServerError(Http.RequestHeader request, Throwable exception) {
        logger.error("onServerError: {} {}", request.method(), request.uri(), exception);
        Throwable cause = exception.getCause();
        String errorMessage = cause == null ? exception.getMessage() : cause.getMessage();
        Result result =
            switch (cause) {
                case MalformedDataException __ -> Results.badRequest(Json.toJson(errorMessage));
                case IllegalArgumentException __ -> Results.badRequest(Json.toJson(new ApiError(errorMessage)));
                case OptimisticLockException __ -> Results.badRequest("i18n_error_data_has_changed");
                case null, default -> Results.internalServerError(Json.toJson(new ApiError(errorMessage)));
            };
        return CompletableFuture.completedFuture(result);
    }
}
