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

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import play.data.DynamicForm;
import play.libs.Json;
import play.mvc.Result;
import play.mvc.With;

import backend.controllers.base.BaseController;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamInspection;
import backend.models.Language;
import backend.models.Permission;
import backend.models.Role;
import backend.models.User;
import backend.models.questions.Question;
import backend.sanitizers.Attrs;
import backend.sanitizers.UserLanguageSanitizer;
import backend.validators.JsonValidator;

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
            Permission permission = Ebean.find(Permission.class).where().eq("type", type).findOne();
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
                    .findOne();
            user.getPermissions().remove(permission);
            user.update();
        }
        return ok();
    }

    @Restrict({@Group("ADMIN")})
    public Result getUser(Long id) {
        User user = Ebean.find(User.class).fetch("roles", "name").fetch("language").where().idEq(id).findOne();
        if (user == null) {
            return notFound();
        }
        return ok(user);
    }

    @Restrict({@Group("ADMIN")})
    public Result findUsers(Optional<String> filter) {
        PathProperties pp = PathProperties.parse("(*, roles(*), permissions(*))");
        Query<User> query = Ebean.find(User.class);
        pp.apply(query);
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
        return ok(results, pp);
    }

    @Restrict({@Group("ADMIN")})
    public Result addRole(Long uid, String roleName) {
        User user = Ebean.find(User.class, uid);
        if (user == null) {
            return notFound("sitnet_user_not_found");
        }
        if (user.getRoles().stream().noneMatch((r) -> r.getName().equals(roleName))) {
            Role role = Ebean.find(Role.class).where().eq("name", roleName).findOne();
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
            Role role = Ebean.find(Role.class).where().eq("name", roleName).findOne();
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
            part.put("firstName", u.getFirstName());
            part.put("lastName", u.getLastName());
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
    public Result getQuestionOwnersByRoleFilter(String role, String criteria, Optional<Long> qid) {
        List<User> users = findUsersByRoleAndName(role, criteria);
        Set<User> owners = new HashSet<>();
        owners.add(getLoggedUser());
        if (qid.isPresent()) {
            Question question = Ebean.find(Question.class, qid.get());
            if (question == null) {
                return notFound();
            }
            owners.addAll(question.getQuestionOwners());
        }
        users.removeAll(owners);
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
                .findOne();
        if (user == null) {
            result = notFound();
        } else {
            user.setUserAgreementAccepted(true);
            user.update();
            result = ok(user);
        }
        return result;
    }

    @JsonValidator(schema = "userLang")
    @With(UserLanguageSanitizer.class)
    @Restrict({@Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public Result updateLanguage() {
        User user = getLoggedUser();
        String lang = request().attrs().get(Attrs.LANG);
        Language language = Ebean.find(Language.class, lang);
        if (language == null) {
            return badRequest("Unsupported language code");
        }
        user.setLanguage(language);
        user.update();
        return ok();
    }

}
