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
import controllers.base.BaseController;
import io.ebean.DB;
import java.util.List;
import models.Accessibility;
import models.ExamRoom;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;

public class AccessibilityController extends BaseController {

    @Restrict({ @Group("ADMIN") })
    public Result addAccessibility(Http.Request request) {
        Accessibility accessibility = new Accessibility();
        accessibility.setName(request.body().asJson().get("name").asText());
        accessibility.save();
        return ok(Json.toJson(accessibility));
    }

    @Restrict({ @Group("ADMIN") })
    public Result updateAccessibility(Http.Request request) {
        Accessibility accessibility = new Accessibility();
        accessibility.setName(request.body().asJson().get("name").asText());
        accessibility.update();
        return ok(Json.toJson(accessibility));
    }

    @Restrict({ @Group("ADMIN") })
    public Result removeAccessibility(Long id) {
        Accessibility accessibility = DB.find(Accessibility.class, id);
        if (accessibility == null) {
            return notFound();
        }
        DB
            .find(ExamRoom.class)
            .where()
            .in("accessibilities", accessibility)
            .findList()
            .forEach(er -> {
                er.getAccessibilities().remove(accessibility);
                er.update();
            });
        accessibility.delete();
        return ok();
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    public Result getAccessibilities() {
        List<Accessibility> accessibilities = DB.find(Accessibility.class).findList();
        return ok(Json.toJson(accessibilities));
    }
}
