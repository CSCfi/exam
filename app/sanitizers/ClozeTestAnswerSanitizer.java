// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Optional;
import play.mvc.Http;

public class ClozeTestAnswerSanitizer extends BaseSanitizer {

    protected Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        Http.Request request = req;
        Optional<String> answer = SanitizingHelper.parse("answer", body, String.class);
        if (answer.isPresent()) {
            try {
                new ObjectMapper().readTree(answer.get());
            } catch (IOException e) {
                throw new SanitizingException("Invalid answer content");
            }
            request = request.addAttr(Attrs.ESSAY_ANSWER, answer.get());
        }
        request = SanitizingHelper.sanitizeOptional("objectVersion", body, Long.class, Attrs.OBJECT_VERSION, request);
        return request;
    }
}
