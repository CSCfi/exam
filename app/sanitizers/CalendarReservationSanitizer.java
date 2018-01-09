/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.Logger;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public class CalendarReservationSanitizer extends play.mvc.Action.Simple {

    public CompletionStage<Result> call(Http.Context ctx) {
        JsonNode body = ctx.request().body().asJson();
        try {
            return delegate.call(ctx.withRequest(sanitize(ctx, body)));
        } catch (SanitizingException e) {
            Logger.error("Sanitizing error: " + e.getMessage(), e);
            return CompletableFuture.supplyAsync(Results::badRequest);
        }
    }

    private Http.Request sanitize(Http.Context ctx, JsonNode body) throws SanitizingException {
        Http.Request request = SanitizingHelper.sanitize("roomId", body, Long.class, Attrs.ROOM_ID, ctx.request());
        request = SanitizingHelper.sanitize("examId", body, Long.class, Attrs.EXAM_ID, request);

        // Custom sanitizing ->

        // Optional AIDS (sic!)
        Collection<Integer> aids = new HashSet<>();
        if (body.has("aids")) {
            Iterator<JsonNode> it = body.get("aids").elements();
            while (it.hasNext()) {
                aids.add(it.next().asInt());
            }
        }
        request = request.addAttr(Attrs.ACCESSABILITES, aids);

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
