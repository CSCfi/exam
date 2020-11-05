/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.sanitizers;

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
