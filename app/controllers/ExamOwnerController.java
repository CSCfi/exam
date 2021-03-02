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

import controllers.base.BaseController;
import models.Exam;
import models.Role;
import models.User;
import sanitizers.Attrs;
import security.Authenticated;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.ebean.Ebean;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;

public class ExamOwnerController extends BaseController {

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result getExamOwners(Long id) {
        Exam exam = Ebean.find(Exam.class).fetch("examOwners").where().idEq(id).findOne();
        if (exam == null) {
            return notFound();
        }
        ArrayNode node = Json.newArray();
        exam
            .getExamOwners()
            .stream()
            .map(
                u -> {
                    ObjectNode o = Json.newObject();
                    o.put("firstName", u.getFirstName());
                    o.put("id", u.getId());
                    o.put("lastName", u.getLastName());
                    o.put("email", u.getEmail());
                    return o;
                }
            )
            .forEach(node::add);
        return ok(Json.toJson(node));
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result insertExamOwner(Long eid, Long uid, Http.Request request) {
        final User owner = Ebean.find(User.class, uid);
        final Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null || owner == null) {
            return notFound();
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!user.hasRole(Role.Name.ADMIN) && !exam.isOwnedOrCreatedBy(user)) {
            return forbidden("sitnet_error_access_forbidden");
        }
        exam.getExamOwners().add(owner);
        exam.update();
        return ok();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result removeExamOwner(Long eid, Long uid, Http.Request request) {
        final User owner = Ebean.find(User.class, uid);
        final Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound();
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!user.hasRole(Role.Name.ADMIN) && !exam.isOwnedOrCreatedBy(user)) {
            return forbidden("sitnet_error_access_forbidden");
        }
        if (owner != null) {
            exam.getExamOwners().remove(owner);
            exam.update();
            return ok();
        }
        return notFound();
    }
}
