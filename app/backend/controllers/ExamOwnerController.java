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

package backend.controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.ebean.Ebean;
import play.libs.Json;
import play.mvc.Result;

import backend.controllers.base.BaseController;
import backend.models.Exam;
import backend.models.Role;
import backend.models.User;


public class ExamOwnerController extends BaseController {

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamOwners(Long id) {
        Exam exam = Ebean.find(Exam.class).fetch("examOwners").where().idEq(id).findUnique();
        if (exam == null) {
            return notFound();
        }
        ArrayNode node = Json.newArray();
        exam.getExamOwners().stream().map(u -> {
            ObjectNode o = Json.newObject();
            o.put("firstName", u.getFirstName());
            o.put("id", u.getId());
            o.put("lastName", u.getLastName());
            return o;
        }).forEach(node::add);
        return ok(Json.toJson(node));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertExamOwner(Long eid, Long uid) {

        final User owner = Ebean.find(User.class, uid);
        final Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null || owner == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (!user.hasRole(Role.Name.ADMIN.toString(), getSession()) && !exam.isOwnedOrCreatedBy(user)) {
            return forbidden("sitnet_error_access_forbidden");
        }
        exam.getExamOwners().add(owner);
        exam.update();
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeExamOwner(Long eid, Long uid) {

        final User owner = Ebean.find(User.class, uid);
        final Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (!user.hasRole(Role.Name.ADMIN.toString(), getSession()) && !exam.isOwnedOrCreatedBy(user)) {
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
