// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.java;

import com.fasterxml.jackson.databind.JsonNode;
import play.data.validation.Constraints;
import play.mvc.Http;
import validation.java.core.Attrs;
import validation.java.core.ValidatorAction;
import validation.scala.core.SanitizingException;

public class EmailSanitizer extends ValidatorAction {

    public Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        if (body.has("email")) {
            String email = body.get("email").asText();
            Constraints.EmailValidator validator = new Constraints.EmailValidator();
            if (!validator.isValid(email)) {
                throw new SanitizingException("bad email format");
            }
            return req.addAttr(Attrs.EMAIL, email);
        } else {
            throw new SanitizingException("no date");
        }
    }
}
