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

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import controllers.base.BaseController;
import io.ebean.DB;
import java.util.List;
import models.calendar.MaintenancePeriod;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Http;
import play.mvc.Result;

public class MaintenancePeriodController extends BaseController {

    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    public Result listMaintenancePeriods() {
        List<MaintenancePeriod> periods = DB.find(MaintenancePeriod.class)
            .where()
            .gt("endsAt", DateTime.now())
            .findList();
        return ok(periods);
    }

    @Restrict({ @Group("ADMIN") })
    public Result createMaintenancePeriod(Http.Request request) {
        JsonNode body = request.body().asJson();
        DateTime start = DateTime.parse(body.get("startsAt").asText(), ISODateTimeFormat.dateTimeParser());
        DateTime end = DateTime.parse(body.get("endsAt").asText(), ISODateTimeFormat.dateTimeParser());
        String description = body.get("description").asText();
        MaintenancePeriod period = new MaintenancePeriod();
        period.setStartsAt(start);
        period.setEndsAt(end);
        period.setDescription(description);
        period.save();
        return created(period);
    }

    @Restrict({ @Group("ADMIN") })
    public Result updateMaintenancePeriod(Long id, Http.Request request) {
        MaintenancePeriod period = DB.find(MaintenancePeriod.class, id);
        if (period == null) {
            return notFound();
        }
        JsonNode body = request.body().asJson();
        DateTime start = DateTime.parse(body.get("startsAt").asText(), ISODateTimeFormat.dateTimeParser());
        DateTime end = DateTime.parse(body.get("endsAt").asText(), ISODateTimeFormat.dateTimeParser());
        String description = body.get("description").asText();
        period.setStartsAt(start);
        period.setEndsAt(end);
        period.setDescription(description);
        period.update();
        return ok();
    }

    @Restrict({ @Group("ADMIN") })
    public Result removeMaintenancePeriod(Long id) {
        MaintenancePeriod period = DB.find(MaintenancePeriod.class, id);
        if (period == null) {
            return notFound();
        }
        period.delete();
        return ok();
    }
}
