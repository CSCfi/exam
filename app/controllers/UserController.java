package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.Query;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import play.libs.F;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;
import java.util.stream.Collectors;

public class UserController extends BaseController {

    @Restrict({@Group("ADMIN")})
    public Result getUser(Long id) {
        User user = Ebean.find(User.class).fetch("roles", "name").fetch("language").where().idEq(id).findUnique();

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
            String rawFilter = filter.get().replaceAll(" +", " ").trim();
            String condition = String.format("%%%s%%", rawFilter);
            ExpressionList<User> el = query.where().disjunction();
            if (rawFilter.contains(" ")) {
                // Possible that user provided us two names. Lets try out some combinations of first and last names
                String name1 = rawFilter.split(" ")[0];
                String name2 = rawFilter.split(" ")[1];
                el = el.disjunction().conjunction()
                        .ilike("firstName", String.format("%%%s%%", name1))
                        .ilike("lastName", String.format("%%%s%%", name2))
                        .endJunction().conjunction()
                        .ilike("firstName", String.format("%%%s%%", name2))
                        .ilike("lastName", String.format("%%%s%%", name1))
                        .endJunction().endJunction();
            } else {
                el = el.ilike("firstName", condition)
                        .ilike("lastName", condition);
            }
            results = el.ilike("email", condition)
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

    private static ArrayNode asArray(List<User> users) {
        ArrayNode array = JsonNodeFactory.instance.arrayNode();
        for (User u : users) {
            ObjectNode part = Json.newObject();
            part.put("id", u.getId());
            part.put("name", String.format("%s %s", u.getFirstName(), u.getLastName()));
            array.add(part);
        }
        return array;
    }

    private static List<User> findUsersByRoleAndName(String role, String nameFilter) {
        ExpressionList<User> el = Ebean.find(User.class).where().eq("roles.name", role).disjunction();
        if (nameFilter.contains(" ")) {
            // Possible that user provided us two names. Lets try out some combinations of first and last names
            String name1 = nameFilter.split(" ")[0];
            String name2 = nameFilter.split(" ")[1];
            el = el.disjunction().conjunction()
                    .icontains("firstName", name1)
                    .icontains("lastName", name2)
                    .endJunction().conjunction()
                    .icontains("firstName", name2)
                    .icontains("lastName", name1)
                    .endJunction().endJunction();
        } else {
            el = el.icontains("firstName", nameFilter)
                    .icontains("lastName", nameFilter);
        }
        return el.endJunction().findList();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getUsersByRoleFilter(String role, String criteria) {
        return ok(Json.toJson(asArray(findUsersByRoleAndName(role, criteria))));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamOwnersByRoleFilter(String role, Long eid, String criteria) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound();
        }
        List<User> users = findUsersByRoleAndName(role, criteria);
        users.removeAll(exam.getExamOwners());
        return ok(Json.toJson(asArray(users)));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamInspectorsByRoleFilter(String role, Long eid, String criteria) {
        List<ExamInspection> inspections = Ebean.find(ExamInspection.class).where().eq("exam.id", eid).findList();
        List<User> users = findUsersByRoleAndName(role, criteria);
        users.removeAll(inspections.stream().map((ExamInspection::getUser)).collect(Collectors.toList()));
        return ok(Json.toJson(asArray(users)));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getUnenrolledStudents(Long eid, String criteria) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class).where().eq("exam.id", eid).findList();
        List<User> users = findUsersByRoleAndName("STUDENT", criteria);
        users.removeAll(enrolments.stream().map((ExamEnrolment::getUser)).collect(Collectors.toList()));
        return ok(Json.toJson(asArray(users)));
    }

    @Restrict({@Group("STUDENT")})
    public Result updateUserAgreementAccepted(Long id) {

        Result result;
        User user = Ebean.find(User.class).fetch("roles", "name").fetch("language").where().idEq(id).findUnique();
        if (user == null) {
            result = notFound();
        } else {
            user.setUserAgreementAccepted(true);
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
        Language language = Ebean.find(Language.class, lang);
        if (language == null) {
            return badRequest("Unsupported language code");
        }
        user.setLanguage(language);
        user.update();
        return ok();
    }

}
