// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Http;

public class QuestionTextSanitizer extends BaseSanitizer {

    protected Http.Request sanitize(Http.Request req, JsonNode body) {
        return SanitizingHelper.sanitizeOptionalHtml("question", body, Attrs.QUESTION_TEXT, req);
    }
}
