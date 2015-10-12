package system;


import exceptions.AuthenticateException;
import exceptions.MalformedDataException;
import models.ApiError;
import play.Logger;
import play.http.HttpErrorHandler;
import play.libs.F;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

public class SystemErrorHandler implements HttpErrorHandler {

    @Override
    public F.Promise<Result> onClientError(Http.RequestHeader request, int statusCode, String message) {
        Logger.debug("onClientError: URL: {}, status: {}, msg: {}", request.uri(), statusCode, message);
        if (statusCode == play.mvc.Http.Status.BAD_REQUEST) {
            return F.Promise.promise(() -> Results.badRequest(Json.toJson(new ApiError(message))));
        }
        if (statusCode == play.mvc.Http.Status.NOT_FOUND) {
            return F.Promise.promise(() -> Results.notFound(Json.toJson(new ApiError(message))));
        }
        if (statusCode == Http.Status.UNAUTHORIZED || statusCode == Http.Status.FORBIDDEN) {
            return F.Promise.promise(() -> Results.unauthorized(Json.toJson(new ApiError(message))));
        }
        return F.Promise.promise(() -> Results.internalServerError(Json.toJson(new ApiError(message))));
    }

    @Override
    public F.Promise<Result> onServerError(Http.RequestHeader request, Throwable exception) {
        return F.Promise.promise(() -> {
            Throwable cause = exception.getCause();
            String errorMessage = cause == null ? exception.getMessage() : cause.getMessage();
            Logger.debug("onServerError: URL: {}, msg: {}", request.uri(), errorMessage);
            exception.printStackTrace();
            if (cause != null) {
                if (cause instanceof AuthenticateException) {
                    return Results.unauthorized(Json.toJson(errorMessage));
                }
                if (cause instanceof MalformedDataException) {
                    return Results.badRequest(Json.toJson(errorMessage));
                }
                if (cause instanceof IllegalArgumentException) {
                    return Results.badRequest(Json.toJson(new ApiError(errorMessage)));
                }
            }
            return Results.internalServerError(Json.toJson(new ApiError(errorMessage)));
        });
    }
}
