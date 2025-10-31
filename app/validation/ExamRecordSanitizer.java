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

public class ExamRecordSanitizer extends ValidatorAction {

    @Override
    public Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        if (body.has("params") && body.get("params").has("childIds")) {
            JsonNode node = body.get("params").get("childIds");
            List<Long> ids = StreamSupport.stream(node.spliterator(), false).map(JsonNode::asLong).toList();
            return req.addAttr(Attrs.ID_COLLECTION, ids);
        }
        throw new SanitizingException("no ids");
    }
}
