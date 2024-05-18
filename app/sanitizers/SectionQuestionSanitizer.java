// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Http;

public class SectionQuestionSanitizer extends BaseSanitizer {

    protected Http.Request sanitize(Http.Request req, JsonNode body) {
        Http.Request request = SanitizingHelper.sanitizeOptionalHtml(
            "answerInstructions",
            body,
            Attrs.ANSWER_INSTRUCTIONS,
            req
        );
        request = SanitizingHelper.sanitizeOptionalHtml("evaluationCriteria", body, Attrs.EVALUATION_CRITERIA, request);
        if (body.has("question")) {
            request =
                SanitizingHelper.sanitizeOptionalHtml("question", body.get("question"), Attrs.QUESTION_TEXT, request);
        }
        return request;
    }
}
