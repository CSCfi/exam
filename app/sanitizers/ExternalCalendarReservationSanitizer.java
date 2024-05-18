// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Http;

public class ExternalCalendarReservationSanitizer extends BaseSanitizer {

    @Override
    protected Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        Http.Request request = SanitizingHelper.sanitize("roomId", body, String.class, Attrs.ROOM_REF, req);
        request = SanitizingHelper.sanitize("orgId", body, String.class, Attrs.ORG_REF, request);
        request = SanitizingHelper.sanitize("examId", body, Long.class, Attrs.EXAM_ID, request);

        // Custom sanitizing ->
        // Optional section IDs
        Collection<Long> optionalSectionIds = new HashSet<>();
        if (body.has("sectionIds")) {
            Iterator<JsonNode> it = body.get("sectionIds").elements();
            while (it.hasNext()) {
                optionalSectionIds.add(it.next().asLong());
            }
        }
        request = request.addAttr(Attrs.SECTION_IDS, optionalSectionIds);

        // Mandatory start + end dates
        if (body.has("start") && body.has("end")) {
            DateTime start = DateTime.parse(body.get("start").asText(), ISODateTimeFormat.dateTimeParser());
            DateTime end = DateTime.parse(body.get("end").asText(), ISODateTimeFormat.dateTimeParser());
            if (start.isBeforeNow() || end.isBefore(start)) {
                throw new SanitizingException("invalid dates");
            }
            request = request.addAttr(Attrs.START_DATE, start);
            request = request.addAttr(Attrs.END_DATE, end);
        } else {
            throw new SanitizingException("invalid dates");
        }
        return request;
    }
}
