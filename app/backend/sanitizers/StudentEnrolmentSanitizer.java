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

import java.util.Optional;

import com.fasterxml.jackson.databind.JsonNode;
import play.data.validation.Constraints;
import play.mvc.Http;

public class StudentEnrolmentSanitizer extends BaseSanitizer {

    @Override
    protected Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        Http.Request request = SanitizingHelper.sanitizeOptional("uid", body, Long.class, Attrs.USER_ID, req);
        Optional<String> email = SanitizingHelper.parse("email", body, String.class);
        if (email.isPresent()) {
            Constraints.EmailValidator validator = new Constraints.EmailValidator();
            if (!validator.isValid(email.get())) {
                throw new SanitizingException("bad email format");
            }
            request = request.addAttr(Attrs.EMAIL, email.get());
        }
        request = SanitizingHelper.sanitizeOptional("email", body, String.class, Attrs.EMAIL, request);
        return request;
    }
}
