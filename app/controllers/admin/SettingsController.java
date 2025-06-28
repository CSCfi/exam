// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.admin;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import be.objectify.deadbolt.java.actions.SubjectPresent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.base.ActionMethod;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.Update;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import miscellaneous.config.ConfigReader;
import models.admin.GeneralSettings;
import models.enrolment.ExamEnrolment;
import models.user.Language;
import models.user.User;
import play.Environment;
import play.data.DynamicForm;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.mvc.Http;
import play.mvc.Result;
import scala.jdk.javaapi.CollectionConverters;

public class SettingsController extends BaseController {

    private final Environment environment;
    private final ConfigReader configReader;
    private final WSClient wsClient;

    @Inject
    public SettingsController(Environment environment, ConfigReader configReader, WSClient wsClient) {
        this.environment = environment;
        this.configReader = configReader;
        this.wsClient = wsClient;
    }

    public static GeneralSettings get(String name) {
        return DB.find(GeneralSettings.class).where().eq("name", name).findOneOrEmpty().orElse(new GeneralSettings());
    }

    public static GeneralSettings getOrCreateSettings(String name, String value, String defaultValue) {
        GeneralSettings gs = DB.find(GeneralSettings.class).where().eq("name", name).findOne();
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

    @SubjectPresent
    public Result getUserAgreement() {
        GeneralSettings gs = getOrCreateSettings("eula", null, null);
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result getDeadline() {
        GeneralSettings gs = getOrCreateSettings("review_deadline", null, "14");
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result getReservationWindowSize() {
        GeneralSettings gs = getOrCreateSettings("reservation_window_size", null, "30");
        return ok(Json.toJson(gs));
    }

    @SubjectPresent
    public CompletionStage<Result> getMaturityInstructions(String lang, Optional<String> hash) throws IOException {
        Language language = DB.find(Language.class, lang);
        if (language == null) {
            return wrapAsPromise(badRequest("Language not supported"));
        }
        if (hash.isPresent()) {
            ExamEnrolment enrolment = DB.find(ExamEnrolment.class)
                .where()
                .eq("externalExam.hash", hash.get())
                .findOne();
            if (enrolment == null) {
                return wrapAsPromise(badRequest("Enrolment not found"));
            }
            URL url = parseExternalUrl(enrolment.getReservation().getExternalRef());
            WSRequest request = wsClient.url(url.toString()).addQueryParameter("lang", language.getCode());
            return request
                .get()
                .thenApplyAsync(response -> {
                    JsonNode root = response.asJson();
                    if (response.getStatus() != Http.Status.OK) {
                        return internalServerError(root.get("message").asText("Connection refused"));
                    }
                    return ok(root);
                });
        } else {
            String key = String.format("maturity_instructions_%s", lang);
            return wrapAsPromise(ok(Json.toJson(get(key))));
        }
    }

    @SubjectNotPresent
    public Result provideMaturityInstructions(String ref, String lang) {
        Language language = DB.find(Language.class, lang);
        if (language == null) {
            badRequest("Language not supported");
        }
        String key = String.format("maturity_instructions_%s", lang);
        return ok(Json.toJson(get(key)));
    }

    @Restrict({ @Group("ADMIN") })
    public Result updateUserAgreement(Http.Request request) {
        JsonNode body = request.body().asJson();
        String eula = body.get("value").asText();
        GeneralSettings gs = getOrCreateSettings("eula", eula, null);
        if (!body.get("minorUpdate").asBoolean()) {
            // Since the EULA has changed, force users to accept it again.
            String updStatement = "update app_user set user_agreement_accepted = :hasNot";
            Update<User> update = DB.createUpdate(User.class, updStatement);
            update.set("hasNot", false);
            update.execute();
        }
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN") })
    public Result setDeadline(Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
        String deadline = df.get("value");
        GeneralSettings gs = getOrCreateSettings("review_deadline", deadline, null);
        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN") })
    public Result setReservationWindowSize(Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
        String deadline = df.get("value");
        GeneralSettings gs = getOrCreateSettings("reservation_window_size", deadline, null);
        return ok(Json.toJson(gs));
    }

    @SubjectPresent
    public Result getHostname() {
        ObjectNode node = Json.newObject();
        node.put("hostname", configReader.getHostName());
        return ok(Json.toJson(node));
    }

    @SubjectPresent
    public Result getMaxFilesize() {
        ObjectNode node = Json.newObject();
        node.put("filesize", configReader.getMaxFileSize());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT"), @Group("TEACHER") })
    public Result getExamDurations() {
        ObjectNode node = Json.newObject();
        ArrayNode durations = node.putArray("examDurations");
        configReader.getExamDurationsJava().forEach(durations::add);
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT"), @Group("TEACHER") })
    public Result getExamMaxDuration() {
        ObjectNode node = Json.newObject();
        node.put("maxDuration", configReader.getExamMaxDuration());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT"), @Group("TEACHER") })
    public Result getExamMinDuration() {
        ObjectNode node = Json.newObject();
        node.put("minDuration", configReader.getExamMinDuration());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT"), @Group("TEACHER") })
    public Result isExamGradeScaleOverridable() {
        ObjectNode node = Json.newObject();
        node.put("overridable", configReader.isCourseGradeScaleOverridable());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT") })
    public Result isEnrolmentPermissionCheckActive() {
        ObjectNode node = Json.newObject();
        node.put("active", configReader.isEnrolmentPermissionCheckActive());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN") })
    public Result getAppVersion() {
        ObjectNode node = Json.newObject();
        node.put("appVersion", configReader.getAppVersion());
        return ok(Json.toJson(node));
    }

    @ActionMethod
    public Result isProd() {
        ObjectNode node = Json.newObject();
        node.put("isProd", environment.isProd());
        return ok(Json.toJson(node));
    }

    @ActionMethod
    public Result isExamVisitSupported() {
        ObjectNode node = Json.newObject();
        node.put("isExamVisitSupported", configReader.isVisitingExaminationSupported());
        return ok(Json.toJson(node));
    }

    @ActionMethod
    public Result isExamCollaborationSupported() {
        ObjectNode node = Json.newObject();
        node.put("isExamCollaborationSupported", configReader.isCollaborationExaminationSupported());
        return ok(Json.toJson(node));
    }

    @ActionMethod
    public Result isAnonymousReviewEnabled() {
        ObjectNode node = Json.newObject();
        node.put("anonymousReviewEnabled", configReader.isAnonymousReviewEnabled());
        return ok(Json.toJson(node));
    }

    @ActionMethod
    public Result getByodSupport() {
        ObjectNode node = Json.newObject();
        node
            .put("sebExaminationSupported", configReader.isSebExaminationSupported())
            .put("homeExaminationSupported", configReader.isHomeExaminationSupported());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("STUDENT") })
    public Result getExaminationQuitLink() {
        ObjectNode node = Json.newObject();
        node.put("quitLink", configReader.getQuitExaminationLink());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN") })
    public Result getConfig() {
        ObjectNode node = Json.newObject();

        node.put("hasCourseSearchIntegration", configReader.isCourseSearchActive());
        node.put("anonymousReviewEnabled", configReader.isAnonymousReviewEnabled());
        ObjectNode courseIntegrationUrls = Json.newObject();
        CollectionConverters.asJava(configReader.getCourseIntegrationUrls()).forEach(courseIntegrationUrls::put);
        node.set("courseSearchIntegrationUrls", courseIntegrationUrls);

        ArrayNode durations = Json.newArray();
        configReader.getExamDurationsJava().forEach(durations::add);
        node.set("examDurations", durations);

        ObjectNode roles = Json.newObject();
        configReader
            .getRoleMappingJava()
            .forEach((k, v) -> {
                ArrayNode role = Json.newArray();
                v.forEach(role::add);
                roles.set(k.getName(), role);
            });
        node.set("roles", roles);

        GeneralSettings eula = getOrCreateSettings("eula", null, null);
        node.put("eula", eula.getValue());
        GeneralSettings reservationWindowSize = getOrCreateSettings("reservation_window_size", null, "30");
        node.put("reservationWindowSize", Integer.parseInt(reservationWindowSize.getValue()));
        GeneralSettings reviewDeadline = getOrCreateSettings("review_deadline", null, "14");
        node.put("reviewDeadline", Integer.parseInt(reviewDeadline.getValue()));

        node.put("isExamVisitSupported", configReader.isVisitingExaminationSupported());
        node.put("isExamCollaborationSupported", configReader.isCollaborationExaminationSupported());
        node.put("hasEnrolmentCheckIntegration", configReader.isEnrolmentPermissionCheckActive());
        node.put("isGradeScaleOverridable", configReader.isCourseGradeScaleOverridable());
        node.put("supportsMaturity", configReader.isMaturitySupported());
        node.put("supportsPrintouts", configReader.isPrintoutSupported());
        node.put("maxFileSize", configReader.getMaxFileSize());
        node.put("expirationPeriod", configReader.getExamExpirationPeriod());
        node.put("defaultTimeZone", configReader.getDefaultTimeZone().getID());
        node.put("sebQuitLink", configReader.getQuitExaminationLink());
        node.put("isSebExaminationSupported", configReader.isSebExaminationSupported());
        node.put("isHomeExaminationSupported", configReader.isHomeExaminationSupported());

        return ok(Json.toJson(node));
    }

    @SubjectPresent
    public Result getCourseCodePrefix() {
        ObjectNode node = Json.newObject();
        node.put("prefix", configReader.getCourseCodePrefix());
        return ok(Json.toJson(node));
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT"), @Group("TEACHER") })
    public Result getByodMaxParticipants() {
        ObjectNode node = Json.newObject();
        node.put("max", configReader.getMaxByodExaminationParticipantCount());
        return ok(Json.toJson(node));
    }

    private URL parseExternalUrl(String reservationRef) throws MalformedURLException {
        return URI.create(
            configReader.getIopHost() + String.format("/api/enrolments/%s/instructions", reservationRef)
        ).toURL();
    }
}
