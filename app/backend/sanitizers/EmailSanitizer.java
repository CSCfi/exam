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

package backend.sanitizers;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

import com.fasterxml.jackson.databind.JsonNode;
import play.Logger;
import play.data.validation.Constraints;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

public class EmailSanitizer extends play.mvc.Action.Simple {

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
        if (body.has("email")) {
            String email = body.get("email").asText();
            Constraints.EmailValidator validator = new Constraints.EmailValidator();
            if (!validator.isValid(email)) {
                throw new SanitizingException("bad email format");
            }
            return ctx.request().addAttr(Attrs.EMAIL, email);
        } else {
            throw new SanitizingException("no date");
        }
    }
}
