// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Arrays;
import java.util.List;
import play.mvc.Http;

public class CommaJoinedListSanitizer extends BaseSanitizer {

    protected Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        String args = SanitizingHelper.parse("ids", body, String.class).orElseThrow(() ->
            new SanitizingException("bad list")
        );
        List<Long> ids = Arrays.stream(args.split(",")).map(Long::parseLong).toList();
        if (ids.isEmpty()) {
            throw new SanitizingException("empty list");
        }
        return req.addAttr(Attrs.ID_COLLECTION, ids);
    }
}
