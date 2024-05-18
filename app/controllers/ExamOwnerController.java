// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.base.BaseController;
import io.ebean.DB;
import models.Exam;
import models.Role;
import models.User;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import sanitizers.Attrs;
import security.Authenticated;

public class ExamOwnerController extends BaseController {

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result getExamOwners(Long id) {
        Exam exam = DB.find(Exam.class).fetch("examOwners").where().idEq(id).findOne();
        if (exam == null) {
            return notFound();
        }
        ArrayNode node = Json.newArray();
        exam
            .getExamOwners()
            .stream()
            .map(u -> {
                ObjectNode o = Json.newObject();
                o.put("firstName", u.getFirstName());
                o.put("id", u.getId());
                o.put("lastName", u.getLastName());
                o.put("email", u.getEmail());
                return o;
            })
            .forEach(node::add);
        return ok(Json.toJson(node));
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result insertExamOwner(Long eid, Long uid, Http.Request request) {
        final User owner = DB.find(User.class, uid);
        final Exam exam = DB.find(Exam.class, eid);
        if (exam == null || owner == null) {
            return notFound();
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!user.hasRole(Role.Name.ADMIN) && !exam.isOwnedOrCreatedBy(user)) {
            return forbidden("i18n_error_access_forbidden");
        }
        exam.getExamOwners().add(owner);
        exam.update();
        return ok();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result removeExamOwner(Long eid, Long uid, Http.Request request) {
        final User owner = DB.find(User.class, uid);
        final Exam exam = DB.find(Exam.class, eid);
        if (exam == null) {
            return notFound();
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!user.hasRole(Role.Name.ADMIN) && !exam.isOwnedOrCreatedBy(user)) {
            return forbidden("i18n_error_access_forbidden");
        }
        if (owner != null) {
            exam.getExamOwners().remove(owner);
            exam.update();
            return ok();
        }
        return notFound();
    }
}
