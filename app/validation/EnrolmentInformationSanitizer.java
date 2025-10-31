// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation;

import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Http;
import validation.core.Attrs;
import validation.core.ValidatorAction;

public class EnrolmentInformationSanitizer extends ValidatorAction {

    public Http.Request sanitize(Http.Request req, JsonNode body) {
        return req.addAttr(Attrs.ENROLMENT_INFORMATION, body.get("information").asText());
    }
}
