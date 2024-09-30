// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Http;

public class EssayAnswerSanitizer extends BaseSanitizer {

    protected Http.Request sanitize(Http.Request req, JsonNode body) {
        Http.Request request = SanitizingHelper.sanitizeOptionalHtml("answer", body, Attrs.ESSAY_ANSWER, req);
        request = SanitizingHelper.sanitizeOptional("objectVersion", body, Long.class, Attrs.OBJECT_VERSION, request);
        return request;
    }
}
