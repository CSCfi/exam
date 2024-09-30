// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import org.joda.time.LocalDate;
import org.joda.time.format.DateTimeFormat;
import play.mvc.Http;

public class ExaminationDateSanitizer extends BaseSanitizer {

    @Override
    protected Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        if (body.has("date")) {
            LocalDate date = LocalDate.parse(body.get("date").asText(), DateTimeFormat.forPattern("dd/MM/yy"));
            return req.addAttr(Attrs.DATE, date);
        } else {
            throw new SanitizingException("no date");
        }
    }
}
