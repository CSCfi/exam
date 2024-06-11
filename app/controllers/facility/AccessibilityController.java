// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.facility;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.DB;
import java.util.List;
import models.facility.Accessibility;
import models.facility.ExamRoom;
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
