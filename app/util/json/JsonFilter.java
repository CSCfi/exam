/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */

package util.json;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Set;

public class JsonFilter {

    public static void filterProperties(JsonNode node, boolean isRoot, Set<Long> ids, String... properties) {
        if (isRoot && !ids.isEmpty() && node.has("id")) {
            final long id = node.get("id").asLong();
            if (!ids.contains(id)) {
                return;
            }
        }
        for (String prop : properties) {
            if (node.has(prop) && node.isObject()) {
                ((ObjectNode) node).remove(prop);
            }
        }
        for (JsonNode child : node) {
            filterProperties(child, node.isArray() && isRoot, ids, properties);
        }
    }
}
