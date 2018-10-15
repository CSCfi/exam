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

import java.util.stream.Collectors;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.inject.Inject;
import io.ebean.Ebean;
import io.ebean.Update;
import play.Environment;
import play.data.DynamicForm;
import play.i18n.Lang;
import play.i18n.Langs;
import play.libs.Json;
import play.mvc.Result;

import backend.controllers.base.ActionMethod;
import backend.controllers.base.BaseController;
import backend.models.GeneralSettings;
import backend.models.User;
import backend.util.config.ConfigUtil;

public class SettingsController  extends BaseController {

    @Inject
    private Langs langs;

    @Inject
    private Environment environment;

    public static GeneralSettings getOrCreateSettings(String name, String value, String defaultValue) {
        GeneralSettings gs = Ebean.find(GeneralSettings.class).where().eq("name", name).findOne();
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
        DynamicForm df = formFactory.form().bindFromRequest();
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
        DynamicForm df = formFactory.form().bindFromRequest();
        String deadline = df.get("value");
        GeneralSettings gs = getOrCreateSettings("review_deadline", deadline, null);
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN")})
    public Result setReservationWindowSize() {
        DynamicForm df = formFactory.form().bindFromRequest();
        String deadline = df.get("value");
        GeneralSettings gs = getOrCreateSettings("reservation_window_size", deadline, null);
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public Result getHostname() {
        ObjectNode node = Json.newObject();
        node.put("hostname", ConfigUtil.getHostName());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public Result getMaxFilesize() {
        ObjectNode node = Json.newObject();
        node.put("filesize", ConfigUtil.getMaxFileSize());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER")})
    public Result getExamDurations() {
        ObjectNode node = Json.newObject();
        ArrayNode durations = node.putArray("examDurations");
        ConfigUtil.getExamDurations().forEach(durations::add);
        return ok(Json.toJson(node));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result isExamGradeScaleOverridable() {
        ObjectNode node = Json.newObject();
        node.put("overridable", ConfigUtil.isCourseGradeScaleOverridable());
        return ok(Json.toJson(node));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public Result isEnrolmentPermissionCheckActive() {
        ObjectNode node = Json.newObject();
        node.put("active", ConfigUtil.isEnrolmentPermissionCheckActive());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN") })
    public Result getAppVersion() {
        ObjectNode node = Json.newObject();
        node.put("appVersion", ConfigUtil.getAppVersion());
        return ok(Json.toJson(node));
    }

    @ActionMethod
    public Result isProd() {
        ObjectNode node = Json.newObject();
        node.put("isProd", environment.isProd());
        return ok(Json.toJson(node));
    }

    @ActionMethod
    public Result isInteroperable() {
        ObjectNode node = Json.newObject();
        node.put("isInteroperable", ConfigUtil.isInteroperable());
        return ok(Json.toJson(node));
    }

    @ActionMethod
    public Result isAnonymousReviewEnabled() {
        ObjectNode node = Json.newObject();
        node.put("anonymousReviewEnabled", ConfigUtil.isAnonymousReviewEnabled());
        return ok(Json.toJson(node));
    }

    @Restrict({@Group("ADMIN")})
    public Result getConfig() {
        ObjectNode node = Json.newObject();

        node.put("hasCourseSearchIntegration", ConfigUtil.isCourseSearchActive());
        node.put("anonymousReviewEnabled", ConfigUtil.isAnonymousReviewEnabled());
        ObjectNode courseIntegrationUrls = Json.newObject();
        ConfigUtil.getCourseIntegrationUrls().forEach(courseIntegrationUrls::put);
        node.set("courseSearchIntegrationUrls", courseIntegrationUrls);

        ArrayNode durations = Json.newArray();
        ConfigUtil.getExamDurations().forEach(durations::add);
        node.set("examDurations", durations);

        ObjectNode roles = Json.newObject();
        ConfigUtil.getRoleMapping().forEach((k, v) -> {
            ArrayNode role = Json.newArray();
            v.forEach(role::add);
            roles.set(k.getName(), role);
        });
        node.set("roles", roles);

        GeneralSettings eula = getOrCreateSettings("eula", null , null);
        node.put("eula", eula.getValue());
        GeneralSettings reservationWindowSize =
                getOrCreateSettings("reservation_window_size", null, "30");
        node.put("reservationWindowSize", Integer.parseInt(reservationWindowSize.getValue()));
        GeneralSettings reviewDeadline =
                getOrCreateSettings("review_deadline", null, "14");
        node.put("reviewDeadline", Integer.parseInt(reviewDeadline.getValue()));

        node.put("isInteroperable", ConfigUtil.isInteroperable());
        node.put("hasEnrolmentCheckIntegration", ConfigUtil.isEnrolmentPermissionCheckActive());
        node.put("isGradeScaleOverridable", ConfigUtil.isCourseGradeScaleOverridable());
        node.put("supportsMaturity", ConfigUtil.isMaturitySupported());
        node.put("supportsPrintouts", ConfigUtil.isPrintoutSupported());
        node.put("maxFileSize", ConfigUtil.getMaxFileSize());
        node.put("expirationPeriod", ConfigUtil.getExamExpirationPeriod());
        node.put("defaultTimeZone", ConfigUtil.getDefaultTimeZone().getID());

        return ok(Json.toJson(node));

    }

}
