package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Update;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import exceptions.MalformedDataException;
import models.GeneralSettings;
import models.User;
import play.Play;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

import java.util.List;

public class SettingsController  extends SitnetController {

    @Restrict({ @Group("ADMIN"), @Group("STUDENT")})
    public static Result getUserAgreement() {
        List<GeneralSettings> gs = Ebean.find(GeneralSettings.class).setMaxRows(1).findList();
        return ok(Json.toJson(gs.get(0)));
    }

    @Restrict({ @Group("ADMIN")})
    public static Result updateUserAgreement() throws MalformedDataException {
        DynamicForm df = Form.form().bindFromRequest();
        String eula = df.get("eula");
        GeneralSettings gs = Ebean.find(GeneralSettings.class).setMaxRows(1).findList().get(0);
        gs.setEula(eula);
        gs.update();

        // Since the EULA has changed, force users to accept it again.
        String updStatement = "update sitnet_users set has_accepted_user_agreament = :hasNot";
        Update<User> update = Ebean.createUpdate(User.class, updStatement);
        update.set("hasNot", false);
        update.execute();

        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN")})
    public static Result updateSettings() throws MalformedDataException {
        DynamicForm df = Form.form().bindFromRequest();
        long deadline = Long.valueOf(df.get("reviewDeadline"));
        GeneralSettings gs = Ebean.find(GeneralSettings.class).setMaxRows(1).findList().get(0);
        gs.setReviewDeadline(deadline);
        gs.update();
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public static Result getHostname() {
        ObjectNode node = Json.newObject();
        node.put("hostname", SitnetUtil.getHostName());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER")})
    public static Result getExamDurations() {
        ObjectNode node = Json.newObject();
        ArrayNode durations = node.putArray("examDurations");
        for (Integer duration : SitnetUtil.getExamDurations()) {
            durations.add(duration);
        }
        return ok(Json.toJson(node));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public static Result isExamGradeScaleOverridable() {
        ObjectNode node = Json.newObject();
        node.put("overridable", SitnetUtil.isCourseGradeScaleOverridable());
        return ok(Json.toJson(node));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public static Result isEnrolmentPermissionCheckActive() {
        ObjectNode node = Json.newObject();
        node.put("active", SitnetUtil.isEnrolmentPermissionCheckActive());
        return ok(Json.toJson(node));
    }

    public static Result isProd() {
        ObjectNode node = Json.newObject();
        node.put("isProd", Play.isProd());
        return ok(Json.toJson(node));
    }

}
