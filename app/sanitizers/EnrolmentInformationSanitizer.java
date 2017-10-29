package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Http;
import play.mvc.Result;

import java.util.concurrent.CompletionStage;

public class EnrolmentInformationSanitizer extends play.mvc.Action.Simple {

    public CompletionStage<Result> call(Http.Context ctx) {
        JsonNode body = ctx.request().body().asJson();
        return delegate.call(ctx.withRequest(sanitize(ctx, body)));
    }

    private Http.Request sanitize(Http.Context ctx, JsonNode body) {
        return ctx.request().addAttr(Attrs.ENROLMENT_INFORMATION, body.get("information").asText());
    }
}
