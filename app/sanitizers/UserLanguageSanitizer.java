package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Http;
import play.mvc.Result;

import java.util.concurrent.CompletionStage;

public class UserLanguageSanitizer extends play.mvc.Action.Simple {

    public CompletionStage<Result> call(Http.Context ctx) {
        JsonNode body = ctx.request().body().asJson();
        Http.Request request = ctx.request().addAttr(Attrs.LANG, body.get("lang").asText());
        return delegate.call(ctx.withRequest(request));
    }

}
