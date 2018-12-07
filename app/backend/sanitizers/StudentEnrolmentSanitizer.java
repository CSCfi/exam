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
