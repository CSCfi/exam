package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import play.Logger;
import play.data.validation.Constraints;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public class StudentEnrolmentSanitizer extends play.mvc.Action.Simple {

    public CompletionStage<Result> call(Http.Context ctx) {
        JsonNode body = ctx.request().body().asJson();
        try {
            return delegate.call(ctx.withRequest(sanitize(ctx, body)));
        } catch (SanitizingException e) {
            Logger.error("Sanitizing error: " + e.getMessage(), e);
            return CompletableFuture.supplyAsync(Results::badRequest);
        }
    }

    private Http.Request sanitize(Http.Context ctx, JsonNode body) throws SanitizingException {
        Http.Request request = SanitizingHelper.sanitizeOptional("uid", body, Long.class, Attrs.USER_ID, ctx.request());
        Optional<String> email = SanitizingHelper.parse("email", body, String.class);
        if (email.isPresent()) {
            Constraints.EmailValidator validator = new Constraints.EmailValidator();
            if (!validator.isValid(email.get())) {
                throw new SanitizingException("bad email format");
            }
            request = request.addAttr(Attrs.EMAIL, email.get());
        }
        request = SanitizingHelper.sanitizeOptional("email", body, String.class, Attrs.EMAIL, request);
        return request;
    }
}
