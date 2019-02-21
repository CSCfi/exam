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

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Http;

public class CommaJoinedListSanitizer extends BaseSanitizer {

    protected Http.Request sanitize(Http.Context ctx, JsonNode body) throws SanitizingException {
        String args = SanitizingHelper.parse("ids", body, String.class)
                .orElseThrow(() -> new SanitizingException("bad list"));
        List<Long> ids = Arrays.stream(args.split(",")).map(Long::parseLong).collect(Collectors.toList());
        if (ids.isEmpty()) {
            throw new SanitizingException("empty list");
        }
        return ctx.request().addAttr(Attrs.ID_COLLECTION, ids);
    }
}
