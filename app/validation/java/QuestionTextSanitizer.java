// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.java;

import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Http;
import validation.java.core.Attrs;
import validation.java.core.ValidatorAction;

public class QuestionTextSanitizer extends ValidatorAction {

    public Http.Request sanitize(Http.Request req, JsonNode body) {
        return SanitizingHelper.sanitizeOptionalHtml("question", body, Attrs.QUESTION_TEXT, req);
    }
}
