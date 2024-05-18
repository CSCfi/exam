// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Collection;
import java.util.stream.StreamSupport;
import play.mvc.Http;

public class ExternalRefCollectionSanitizer extends BaseSanitizer {

    @Override
    protected Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        if (body.has("params") && body.get("params").has("childIds")) {
            JsonNode node = body.get("params").get("childIds");
            Collection<String> refs = StreamSupport.stream(node.spliterator(), false).map(JsonNode::asText).toList();
            return req.addAttr(Attrs.REF_COLLECTION, refs);
        }
        throw new SanitizingException("no refs");
    }
}
