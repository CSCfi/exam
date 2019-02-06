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
import org.joda.time.LocalDate;
import org.joda.time.format.DateTimeFormat;
import play.mvc.Http;

public class ExaminationDateSanitizer extends BaseSanitizer {

    @Override
    protected Http.Request sanitize(Http.Context ctx, JsonNode body) throws SanitizingException {
        if (body.has("date")) {
            LocalDate date = LocalDate.parse(body.get("date").asText(), DateTimeFormat.forPattern("dd/MM/yy"));
            return ctx.request().addAttr(Attrs.DATE, date);
        } else {
            throw new SanitizingException("no date");
        }
    }
}
