// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Http;

public class CommentSanitizer extends BaseSanitizer {

    protected Http.Request sanitize(Http.Request req, JsonNode body) {
        Http.Request request = SanitizingHelper.sanitizeOptionalHtml("comment", body, Attrs.COMMENT, req);
        request = SanitizingHelper.sanitizeOptional("id", body, Long.class, Attrs.COMMENT_ID, request);
        request = SanitizingHelper.sanitizeOptional(
            "feedbackStatus",
            body,
            Boolean.class,
            Attrs.FEEDBACK_STATUS,
            request
        );
        return request;
    }
}
