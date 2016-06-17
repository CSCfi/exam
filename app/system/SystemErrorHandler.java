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
        Logger.warn("onClientError: URL: {}, status: {}, msg: {}", request.uri(), statusCode, message);
        if (statusCode == play.mvc.Http.Status.BAD_REQUEST) {
            return CompletableFuture.supplyAsync(() -> Results.badRequest(Json.toJson(new ApiError(message))));
        }
        if (statusCode == play.mvc.Http.Status.NOT_FOUND) {
            return CompletableFuture.supplyAsync(() -> Results.notFound(Json.toJson(new ApiError(message))));
        }
        if (statusCode == Http.Status.UNAUTHORIZED || statusCode == Http.Status.FORBIDDEN) {
            return CompletableFuture.supplyAsync(() -> Results.unauthorized(Json.toJson(new ApiError(message))));
        }
        return CompletableFuture.supplyAsync(() -> Results.internalServerError(Json.toJson(new ApiError(message))));
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
            }
            if (exception instanceof OptimisticLockException) {
                return Results.badRequest("sitnet_error_data_has_changed");
            }
            return Results.internalServerError(Json.toJson(new ApiError(errorMessage)));
        });
    }
}
