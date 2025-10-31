// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.stream.StreamSupport;
import play.mvc.Http;
import validation.core.Attrs;
import validation.core.ValidatorAction;

public class ExternalRefCollectionSanitizer extends ValidatorAction {

    @Override
    public Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        if (body.has("params") && body.get("params").has("childIds")) {
            JsonNode node = body.get("params").get("childIds");
            List<String> refs = StreamSupport.stream(node.spliterator(), false).map(JsonNode::asText).toList();
            return req.addAttr(Attrs.REF_COLLECTION, refs);
        }
        throw new SanitizingException("no refs");
    }
}
