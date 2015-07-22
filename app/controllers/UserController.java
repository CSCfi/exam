package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Expr;
import com.avaje.ebean.Query;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import play.libs.F;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;

public class UserController extends BaseController {

    @Restrict({@Group("ADMIN")})
    public Result getUser(Long id) {
        User user = Ebean.find(User.class).fetch("roles", "name").fetch("userLanguage").where().idEq(id).findUnique();

        if (user == null) {
            return notFound();
        }
        return ok(user);
    }

    @Restrict({@Group("ADMIN")})
    public Result findUsers(F.Option<String> filter) {
        Query<User> query = Ebean.find(User.class).fetch("roles");
        List<User> results;
        if (filter.isDefined() && !filter.get().isEmpty()) {
            String condition = String.format("%%%s%%", filter.get());
            results = query.where()
                    .disjunction()
                    .ilike("firstName", condition)
                    .ilike("lastName", condition)
                    .ilike("email", condition)
                    .ilike("userIdentifier", condition)
                    .ilike("employeeNumber", condition)
                    .endJunction()
                    .orderBy("lastName, firstName")
                    .findList();
        } else {
            results = query.orderBy("lastName, firstName").findList();
        }
        return ok(Json.toJson(results));
    }

    @Restrict({@Group("ADMIN")})
    public Result addRole(Long uid, String roleName) {
        User user = Ebean.find(User.class, uid);
        if (user == null) {
            return notFound("sitnet_user_not_found");
        }
        if (user.getRoles().stream().noneMatch((r) -> r.getName().equals(roleName))) {
            Role role = Ebean.find(Role.class).where().eq("name", roleName).findUnique();
            if (role == null) {
                return notFound("sitnet_role_not_found");
            }
            user.getRoles().add(role);
            user.save();
        }
        return ok();
    }

    @Restrict({@Group("ADMIN")})
    public Result removeRole(Long uid, String roleName) {
        User user = Ebean.find(User.class, uid);
        if (user == null) {
            return notFound("sitnet_user_not_found");
        }
        if (user.getRoles().stream().anyMatch((r) -> r.getName().equals(roleName))) {
            Role role = Ebean.find(Role.class).where().eq("name", roleName).findUnique();
            if (role == null) {
                return notFound("sitnet_role_not_found");
            }
            user.getRoles().remove(role);
            user.save();
        }
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getUsersByRole(String role) {

        List<User> users = Ebean.find(User.class)
                .where()
                .eq("roles.name", role)
                .orderBy("lastName")
                .findList();

        ArrayNode array = JsonNodeFactory.instance.arrayNode();
        for (User u : users) {
            ObjectNode part = Json.newObject();
            part.put("id", u.getId());
            part.put("name", String.format("%s %s", u.getFirstName(), u.getLastName()));
            array.add(part);
        }

        return ok(Json.toJson(array));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getUsersByRoleFilter(String role, String criteria) {

        List<User> users = Ebean.find(User.class)
                .where()
                .and(
                        Expr.eq("roles.name", role),
                        Expr.or(
                                Expr.icontains("lastName", criteria),
                                Expr.icontains("firstName", criteria)
                        )
                )
                .findList();

        ArrayNode array = JsonNodeFactory.instance.arrayNode();
        for (User u : users) {
            ObjectNode part = Json.newObject();
            part.put("id", u.getId());
            part.put("name", String.format("%s %s", u.getFirstName(), u.getLastName()));
            array.add(part);
        }

        return ok(Json.toJson(array));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamOwnersByRoleFilter(String role, Long eid, String criteria) {

        List<User> users = Ebean.find(User.class)
                .where()
                .and(
                        Expr.eq("roles.name", role),
                        Expr.or(
                                Expr.icontains("lastName", criteria),
                                Expr.icontains("firstName", criteria)
                        )
                )
                .findList();

        Exam exam = Ebean.find(Exam.class).where().eq("id", eid).findUnique();

        if (exam == null) {
            return notFound();
        }
        ArrayNode array = JsonNodeFactory.instance.arrayNode();
        List<User> owners = exam.getExamOwners();
        // removes all user who are already inspectors
        for (User u : users) {
            boolean b = true;
            for (User owner : owners) {
                if (u.getId().equals(owner.getId())) {
                    b = false;
                    break;
                }
            }
            if (b) {
                ObjectNode part = Json.newObject();
                part.put("id", u.getId());
                part.put("name", String.format("%s %s", u.getFirstName(), u.getLastName()));
                array.add(part);
            }
        }

        return ok(Json.toJson(array));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamInspectorsByRoleFilter(String role, Long eid, String criteria) {

        List<User> users = Ebean.find(User.class)
                .where()
                .and(
                        Expr.eq("roles.name", role),
                        Expr.or(
                                Expr.icontains("lastName", criteria),
                                Expr.icontains("firstName", criteria)
                        )
                )
                .findList();

        List<ExamInspection> inspections = Ebean.find(ExamInspection.class).where().eq("exam.id", eid).findList();

        ArrayNode array = JsonNodeFactory.instance.arrayNode();

        // removes all user who are already inspectors
        for (User u : users) {
            boolean b = true;
            for (ExamInspection i : inspections) {
                if (u.getId().equals(i.getUser().getId())) {
                    b = false;
                    break;
                }
            }
            if (b) {
                ObjectNode part = Json.newObject();
                part.put("id", u.getId());
                part.put("name", String.format("%s %s", u.getFirstName(), u.getLastName()));
                array.add(part);
            }
        }

        return ok(Json.toJson(array));
    }

    @Restrict({@Group("STUDENT")})
    public Result updateUserAgreementAccepted(Long id) {

        Result result;
        User user = Ebean.find(User.class).fetch("roles", "name").fetch("userLanguage").where().idEq(id).findUnique();
        if (user == null) {
            result = notFound();
        } else {
            user.setHasAcceptedUserAgreament(true);
            user.save();
            Ebean.update(user);
            result = ok(user);
        }
        return result;
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public Result updateLanguage() {
        User user = getLoggedUser();
        String lang = request().body().asJson().get("lang").asText();
        UserLanguage language = Ebean.find(UserLanguage.class).where().eq("UILanguageCode", lang).findUnique();
        if (language == null) {
            return badRequest("Unsupported language code");
        }
        user.setUserLanguage(language);
        user.update();
        return ok();
    }
}
