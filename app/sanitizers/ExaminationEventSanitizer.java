// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Http;

public class ExaminationEventSanitizer extends BaseSanitizer {

    @Override
    protected Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        if (body.has("config")) {
            JsonNode configNode = body.get("config");
            String settingsPassword = configNode.path("settingsPassword").asText(null);
            String quitPassword = configNode.path("quitPassword").asText(null);
            JsonNode eventNode = configNode.get("examinationEvent");
            DateTime dateTime = DateTime.parse(eventNode.get("start").asText(), ISODateTimeFormat.dateTime());
            String description = eventNode.get("description").asText();
            int capacity = eventNode.get("capacity").asInt();
            return req
                .addAttr(Attrs.START_DATE, dateTime)
                .addAttr(Attrs.DESCRIPTION, description)
                .addAttr(Attrs.CAPACITY, capacity)
                .addAttr(Attrs.SETTINGS_PASSWORD, settingsPassword)
                .addAttr(Attrs.QUIT_PASSWORD, quitPassword);
        } else {
            throw new SanitizingException("missing required data");
        }
    }
}
