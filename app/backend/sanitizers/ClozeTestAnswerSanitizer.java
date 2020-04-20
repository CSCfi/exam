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
