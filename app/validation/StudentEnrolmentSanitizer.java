// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Optional;
import play.data.validation.Constraints;
import play.mvc.Http;
import validation.core.Attrs;
import validation.core.ValidatorAction;

public class StudentEnrolmentSanitizer extends ValidatorAction {

    @Override
    public Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        Http.Request request = SanitizingHelper.sanitizeOptional("uid", body, Long.class, Attrs.USER_ID, req);
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
