// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation;

import com.fasterxml.jackson.databind.JsonNode;
import org.joda.time.LocalDate;
import org.joda.time.format.DateTimeFormat;
import play.mvc.Http;
import validation.core.Attrs;
import validation.core.ValidatorAction;

public class ExaminationDateSanitizer extends ValidatorAction {

    @Override
    public Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        if (body.has("date")) {
            LocalDate date = LocalDate.parse(body.get("date").asText(), DateTimeFormat.forPattern("dd/MM/yy"));
            return req.addAttr(Attrs.DATE, date);
        } else {
            throw new SanitizingException("no date");
        }
    }
}
