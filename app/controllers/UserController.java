package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Expr;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import play.cache.Cache;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;

public class UserController extends SitnetController {

    @Restrict({@Group("ADMIN")})
    public static Result getUser(Long id) {
        User user = Ebean.find(User.class, id);

        if (user == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, email, firstName, lastName, roles, userLanguage");
            options.setPathProperties("roles", "name");

            return ok(jsonContext.toJsonString(user, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getUsersByRole(String role) {

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
    public static Result getUsersByRoleFilter(String role, String criteria) {

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
    public static Result getExamOwnersByRoleFilter(String role, Long eid, String criteria) {

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
    public static Result getExamInspectorsByRoleFilter(String role, Long eid, String criteria) {

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

    public static User getLoggedUser() {
        String token = request().getHeader(SITNET_TOKEN_HEADER_KEY);
        Session session = (Session) Cache.get(SITNET_CACHE_KEY + token);
        return Ebean.find(User.class, session.getUserId());
    }

    @Restrict({@Group("STUDENT")})
    public static Result updateUserAgreementAccepted(Long id) {

        Result result;
        User user = Ebean.find(User.class, id);
        if (user == null) {
            result = notFound();
        } else {
            user.setHasAcceptedUserAgreament(true);
            user.save();
            Ebean.update(user);

            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, email, firstName, lastName, roles, userLanguage, hasAcceptedUserAgreament");
            options.setPathProperties("roles", "name");

            result = ok(jsonContext.toJsonString(user, true, options)).as("application/json");
        }
        return result;
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public static Result updateLanguage() {
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
