package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.base.BaseController;
import models.Exam;
import models.Role;
import models.User;
import play.libs.Json;
import play.mvc.Result;


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
        if (exam == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (!user.hasRole(Role.Name.ADMIN.toString(), getSession()) && !exam.isOwnedOrCreatedBy(user)) {
            return forbidden("sitnet_error_access_forbidden");
        }
        if (owner != null) {
            exam.getExamOwners().add(owner);
            exam.update();
            return ok();
        }
        return notFound();
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
