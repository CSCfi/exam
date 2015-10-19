package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Update;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.inject.Inject;
import models.GeneralSettings;
import models.User;
import play.Play;
import play.data.DynamicForm;
import play.data.Form;
import play.i18n.Lang;
import play.i18n.Langs;
import play.libs.Json;
import play.mvc.Result;
import util.AppUtil;

import java.util.stream.Collectors;

public class SettingsController  extends BaseController {

    @Inject
    protected Langs langs;

    public static GeneralSettings getOrCreateSettings(String name, String value, String defaultValue) {
        GeneralSettings gs = Ebean.find(GeneralSettings.class).where().eq("name", name).findUnique();
        if (gs == null) {
            gs = new GeneralSettings();
            gs.setName(name);
            gs.save();
        }
        if (value != null) {
            gs.setValue(value);
            gs.update();
        } else if (gs.getValue() == null && defaultValue != null) {
            gs.setValue(defaultValue);
            gs.update();
        }
        return gs;
    }

    @Restrict({ @Group("ADMIN"), @Group("STUDENT")})
    public Result getUserAgreement() {
        GeneralSettings gs = getOrCreateSettings("eula", null, null);
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN"), @Group("STUDENT")})
    public Result getDeadline() {
        GeneralSettings gs = getOrCreateSettings("review_deadline", null, "14");
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN"), @Group("STUDENT")})
    public Result getReservationWindowSize() {
        GeneralSettings gs = getOrCreateSettings("reservation_window_size", null, "30");
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public Result getMaturityInstructions(String lang) {
        if (!langs.availables().stream().map(Lang::code).collect(Collectors.toList()).contains(lang)) {
            return badRequest("Language not supported");
        }
        String key = String.format("maturity_instructions_%s", lang);
        GeneralSettings gs = getOrCreateSettings(key, null, null);
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN")})
    public Result updateUserAgreement() {
        DynamicForm df = Form.form().bindFromRequest();
        String eula = df.get("value");
        GeneralSettings gs = getOrCreateSettings("eula", eula, null);

        // Since the EULA has changed, force users to accept it again.
        String updStatement = "update app_user set user_agreement_accepted = :hasNot";
        Update<User> update = Ebean.createUpdate(User.class, updStatement);
        update.set("hasNot", false);
        update.execute();

        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN")})
    public Result setDeadline() {
        DynamicForm df = Form.form().bindFromRequest();
        String deadline = df.get("value");
        GeneralSettings gs = getOrCreateSettings("review_deadline", deadline, null);
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN")})
    public Result setReservationWindowSize() {
        DynamicForm df = Form.form().bindFromRequest();
        String deadline = df.get("value");
        GeneralSettings gs = getOrCreateSettings("reservation_window_size", deadline, null);
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public Result getHostname() {
        ObjectNode node = Json.newObject();
        node.put("hostname", AppUtil.getHostName());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public Result getMaxFilesize() {
        ObjectNode node = Json.newObject();
        node.put("filesize", AppUtil.getMaxFileSize());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER")})
    public Result getExamDurations() {
        ObjectNode node = Json.newObject();
        ArrayNode durations = node.putArray("examDurations");
        AppUtil.getExamDurations().forEach(durations::add);
        return ok(Json.toJson(node));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result isExamGradeScaleOverridable() {
        ObjectNode node = Json.newObject();
        node.put("overridable", AppUtil.isCourseGradeScaleOverridable());
        return ok(Json.toJson(node));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public Result isEnrolmentPermissionCheckActive() {
        ObjectNode node = Json.newObject();
        node.put("active", AppUtil.isEnrolmentPermissionCheckActive());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN") })
    public Result getAppVersion() {
        ObjectNode node = Json.newObject();
        node.put("appVersion", AppUtil.getAppVersion());
        return ok(Json.toJson(node));
    }

    public Result isProd() {
        ObjectNode node = Json.newObject();
        node.put("isProd", Play.isProd());
        return ok(Json.toJson(node));
    }

}
