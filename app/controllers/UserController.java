package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.Query;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.Exam;
import models.ExamEnrolment;
import models.ExamInspection;
import models.Language;
import models.Permission;
import models.Role;
import models.User;
import models.questions.Question;
import play.data.DynamicForm;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

public class UserController extends BaseController {

    @Restrict({@Group("ADMIN")})
    public Result listPermissions() {
        return ok(Ebean.find(Permission.class).findList());
    }

    @Restrict({@Group("ADMIN")})
    public Result grantUserPermission() {
        DynamicForm df = formFactory.form().bindFromRequest();
        String permissionString = df.get("permission");
        User user = Ebean.find(User.class, df.get("id"));
        if (user == null) {
            return notFound();
        }
        if (user.getPermissions().stream().noneMatch(p -> p.getValue().equals(permissionString))) {
            Permission.Type type;
            try {
                type = Permission.Type.valueOf(permissionString);
            } catch (IllegalArgumentException e) {
                return badRequest();
            }
            Permission permission = Ebean.find(Permission.class).where().eq("type", type).findUnique();
            user.getPermissions().add(permission);
            user.update();
        }
        return ok();
    }

    @Restrict({@Group("ADMIN")})
    public Result revokeUserPermission() {
        DynamicForm df = formFactory.form().bindFromRequest();
        String permissionString = df.get("permission");
        User user = Ebean.find(User.class, df.get("id"));
        if (user == null) {
            return notFound();
        }
        if (user.getPermissions().stream().anyMatch(p -> p.getValue().equals(permissionString))) {
            Permission permission = Ebean.find(Permission.class).where()
                    .eq("type", Permission.Type.valueOf(permissionString))
                    .findUnique();
            user.getPermissions().remove(permission);
            user.update();
        }
        return ok();
    }

    @Restrict({@Group("ADMIN")})
    public Result getUser(Long id) {
        User user = Ebean.find(User.class).fetch("roles", "name").fetch("language").where().idEq(id).findUnique();
        if (user == null) {
            return notFound();
        }
        return ok(user);
    }

    @Restrict({@Group("ADMIN")})
    public Result findUsers(Optional<String> filter) {
        Query<User> query = Ebean.find(User.class).fetch("roles").fetch("permissions");
        List<User> results;
        if (filter.isPresent()) {
            ExpressionList<User> el = query.where().disjunction();
            el = applyUserFilter(null, el, filter.get());
            String condition = String.format("%%%s%%", filter.get());
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
            user.update();
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
            user.update();
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
            String uid = u.getUserIdentifier();
            String uidString = uid != null && !uid.isEmpty() ? String.format(" (%s)", u.getUserIdentifier()) : "";
            part.put("name", String.format("%s %s%s", u.getFirstName(), u.getLastName(), uidString));
            array.add(part);
        }
        return array;
    }

    private List<User> findUsersByRoleAndName(String role, String nameFilter) {
        ExpressionList<User> el = Ebean.find(User.class).where().eq("roles.name", role).disjunction();
        el = applyUserFilter(null, el, nameFilter);
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
    public Result getQuestionOwnersByRoleFilter(String role, Long qid, String criteria) {
        Question question = Ebean.find(Question.class, qid);
        if (question == null) {
            return notFound();
        }
        List<User> users = findUsersByRoleAndName(role, criteria);
        users.removeAll(question.getQuestionOwners());
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
    public Result updateUserAgreementAccepted() {
        Result result;
        User user = Ebean.find(User.class).fetch("roles", "name").fetch("language").where()
                .idEq(getLoggedUser().getId())
                .findUnique();
        if (user == null) {
            result = notFound();
        } else {
            user.setUserAgreementAccepted(true);
            user.update();
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
