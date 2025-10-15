// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.user;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.ExpressionList;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import javax.inject.Inject;
import miscellaneous.user.UserHandler;
import models.enrolment.ExamEnrolment;
import models.questions.Question;
import models.user.Language;
import models.user.Permission;
import models.user.Role;
import models.user.User;
import play.data.DynamicForm;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import security.Authenticated;
import validation.UserLanguageSanitizer;
import validation.core.Attrs;

public class UserController extends BaseController {

    private final UserHandler userHandler;

    @Inject
    public UserController(UserHandler userHandler) {
        this.userHandler = userHandler;
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT") })
    public Result listPermissions() {
        return ok(DB.find(Permission.class).findList());
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT") })
    public Result grantUserPermission(Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
        String permissionString = df.get("permission");
        User user = DB.find(User.class, df.get("id"));
        if (user == null) {
            return notFound();
        }
        if (
            user
                .getPermissions()
                .stream()
                .noneMatch(p -> p.getValue().equals(permissionString))
        ) {
            Permission.Type type;
            try {
                type = Permission.Type.valueOf(permissionString);
            } catch (IllegalArgumentException e) {
                return badRequest();
            }
            Permission permission = DB.find(Permission.class).where().eq("type", type).findOne();
            user.getPermissions().add(permission);
            user.update();
        }
        return ok();
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT") })
    public Result revokeUserPermission(Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
        String permissionString = df.get("permission");
        User user = DB.find(User.class, df.get("id"));
        if (user == null) {
            return notFound();
        }
        if (
            user
                .getPermissions()
                .stream()
                .anyMatch(p -> p.getValue().equals(permissionString))
        ) {
            Permission permission = DB.find(Permission.class)
                .where()
                .eq("type", Permission.Type.valueOf(permissionString))
                .findOne();
            user.getPermissions().remove(permission);
            user.update();
        }
        return ok();
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT") })
    public Result listUsers(Optional<String> filter) {
        PathProperties pp = PathProperties.parse("(*, roles(*), permissions(*))");
        Query<User> query = DB.find(User.class);
        pp.apply(query);
        List<User> results;
        if (filter.isPresent()) {
            ExpressionList<User> el = query.where().disjunction();
            el = userHandler.applyNameSearch(null, el, filter.get());
            String condition = String.format("%%%s%%", filter.get());
            results = el
                .ilike("email", condition)
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

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT") })
    public Result addRole(Long uid, String roleName) {
        User user = DB.find(User.class, uid);
        if (user == null) {
            return notFound("i18n_user_not_found");
        }
        // TODO
        if (
            user
                .getRoles()
                .stream()
                .noneMatch(r -> r.getName().equals(roleName))
        ) {
            Role role = DB.find(Role.class).where().eq("name", roleName).findOne();
            if (role == null) {
                return notFound("i18n_role_not_found");
            }
            user.getRoles().add(role);
            user.update();
        }
        return ok();
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT") })
    public Result removeRole(Long uid, String roleName) {
        User user = DB.find(User.class, uid);
        if (user == null) {
            return notFound("i18n_user_not_found");
        }
        // TODO
        if (
            user
                .getRoles()
                .stream()
                .anyMatch(r -> r.getName().equals(roleName))
        ) {
            Role role = DB.find(Role.class).where().eq("name", roleName).findOne();
            if (role == null) {
                return notFound("i18n_role_not_found");
            }
            user.getRoles().remove(role);
            user.update();
        }
        return ok();
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result listUsersByRole(String role) {
        PathProperties pp = PathProperties.parse("(*, roles(*), permissions(*))");
        List<User> users = DB.find(User.class).where().eq("roles.name", role).orderBy("lastName").findList();
        return ok(users, pp);
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result listQuestionOwners(String role, String criteria, Optional<Long> qid, Http.Request request) {
        List<User> users = listUsersByRoleAndName(role, criteria);
        Set<User> owners = new HashSet<>();
        owners.add(request.attrs().get(Attrs.AUTHENTICATED_USER));
        if (qid.isPresent()) {
            Question question = DB.find(Question.class, qid.get());
            if (question == null) {
                return notFound();
            }
            owners.addAll(question.getQuestionOwners());
        }
        users.removeAll(owners);
        return ok(users);
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result listTeachers(String criteria) {
        return ok(listUsersByRoleAndName(Role.Name.TEACHER.toString(), criteria));
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result listUnenrolledStudents(Long eid, String criteria) {
        List<ExamEnrolment> enrolments = DB.find(ExamEnrolment.class).where().eq("exam.id", eid).findList();
        List<User> users = listUsersByRoleAndName("STUDENT", criteria);
        users.removeAll(enrolments.stream().map((ExamEnrolment::getUser)).toList());
        return ok(users);
    }

    @Authenticated
    public Result updateUserAgreementAccepted(Http.Request request) {
        Result result;
        User user = DB.find(User.class)
            .fetch("roles", "name")
            .fetch("language")
            .where()
            .idEq(request.attrs().get(Attrs.AUTHENTICATED_USER).getId())
            .findOne();
        if (user == null) {
            result = notFound();
        } else {
            user.setUserAgreementAccepted(true);
            user.update();
            result = ok();
        }
        return result;
    }

    @Authenticated
    @With(UserLanguageSanitizer.class)
    @Restrict({ @Group("ADMIN"), @Group("SUPPORT"), @Group("TEACHER"), @Group("STUDENT") })
    public Result updateLanguage(Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        String lang = request.attrs().get(Attrs.LANG);
        Language language = DB.find(Language.class, lang);
        if (language == null) {
            return badRequest("Unsupported language code");
        }
        user.setLanguage(language);
        user.update();
        return ok();
    }

    private List<User> listUsersByRoleAndName(String role, String nameFilter) {
        ExpressionList<User> el = DB.find(User.class).where().eq("roles.name", role).disjunction();
        el = userHandler.applyNameSearch(null, el, nameFilter);
        return el.endJunction().findList();
    }
}
