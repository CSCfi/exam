package controllers;


import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.typesafe.config.Config;
import com.typesafe.config.ConfigException;
import com.typesafe.config.ConfigFactory;
import models.*;
import models.dto.ExamScore;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.Logger;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;
import play.mvc.Results;

import javax.inject.Inject;
import javax.servlet.http.HttpServletResponse;
import java.net.MalformedURLException;
import java.net.URL;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Collectors;

public class IntegrationController extends BaseController implements ExternalAPI {

    private static final String USER_ID_PLACEHOLDER = "${employee_number}";
    private static final String USER_LANG_PLACEHOLDER = "${employee_lang}";
    private static final String COURSE_CODE_PLACEHOLDER = "${course_code}";

    private static final DateFormat DF = new SimpleDateFormat("yyyyMMdd");

    private static final ObjectMapper SORTED_MAPPER = new ObjectMapper();

    static {
        SORTED_MAPPER.configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    private static class RemoteException extends Exception {

        RemoteException(String message) {
            super(message);
        }
    }

    @FunctionalInterface
    private interface RemoteFunction<T, R> extends Function<T, R> {
        @Override
        default R apply(T t) {
            try {
                return exec(t);
            } catch (RemoteException | ParseException e) {
                throw new RuntimeException(e);
            }
        }

        R exec(T t) throws RemoteException, ParseException;
    }

    @Inject
    protected WSClient wsClient;

    private static URL parseUrl(User user) throws MalformedURLException {
        if (user.getUserIdentifier() == null) {
            throw new RuntimeException("User has no identier number!");
        }
        String url = ConfigFactory.load().getString("sitnet.integration.enrolmentPermissionCheck.url");
        if (url == null || !url.contains(USER_ID_PLACEHOLDER) || !url.contains(USER_LANG_PLACEHOLDER)) {
            throw new RuntimeException("sitnet.integration.enrolmentPermissionCheck.url is malformed");
        }
        url = url.replace(USER_ID_PLACEHOLDER, user.getUserIdentifier()).replace(USER_LANG_PLACEHOLDER,
                user.getLanguage().getCode());
        return new URL(url);
    }

    private static URL parseUrl(User user, String courseCode) throws MalformedURLException {
        String urlConfigPrefix = "sitnet.integration.courseUnitInfo.url";
        Config config = ConfigFactory.load();
        String configPath = null;
        if (user.getOrganisation() != null && user.getOrganisation().getCode() != null) {
            String path = String.format("%s.%s", urlConfigPrefix, user.getOrganisation().getCode());
            if (config.hasPath(path)) {
                configPath = path;
            }
        }
        if (configPath == null) {
            String path = String.format("%s.%s", urlConfigPrefix, "default");
            if (config.hasPath(path)) {
                configPath = path;
            } else {
                throw new RuntimeException("sitnet.integration.courseUnitInfo.url holds no suitable URL for user");
            }
        }
        String url = ConfigFactory.load().getString(configPath);
        if (url == null || !url.contains(COURSE_CODE_PLACEHOLDER)) {
            throw new RuntimeException("sitnet.integration.courseUnitInfo.url is malformed");
        }
        url = url.replace(COURSE_CODE_PLACEHOLDER, courseCode);
        return new URL(url);
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public CompletionStage<Collection<String>> getPermittedCourses(User user) throws MalformedURLException {
        URL url = parseUrl(user);
        WSRequest request = wsClient.url(url.toString().split("\\?")[0]);
        if (url.getQuery() != null) {
            request = request.setQueryString(url.getQuery());
        }
        RemoteFunction<WSResponse, Collection<String>> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (root.has("exception")) {
                throw new RemoteException(root.get("exception").asText());
            } else if (root.has("data")) {
                Set<String> results = new HashSet<>();
                for (JsonNode course : root.get("data")) {
                    if (course.has("course_code")) {
                        results.add(course.get("course_code").asText());
                    } else {
                        Logger.warn("Unexpected content {}", course.asText());
                    }
                }
                return results;
            } else {
                Logger.warn("Unexpected content {}", root.asText());
                throw new RemoteException("sitnet_request_timed_out");
            }
        };
        return request.get().thenApplyAsync(onSuccess);
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public CompletionStage<List<Course>> getCourseInfoByCode(User user, String code) throws MalformedURLException {
        final List<Course> courses = Ebean.find(Course.class).where()
                .ilike("code", code + "%")
                .disjunction()
                .isNull("endDate")
                .gt("endDate", new Date())
                .endJunction()
                .disjunction()
                .isNull("startDate")
                .lt("startDate", new Date())
                .endJunction()
                .orderBy("code").findList();
        if (!courses.isEmpty() || !isCourseSearchActive()) {
            // we already have it or we don't want to fetch it
            return CompletableFuture.supplyAsync(() -> courses);
        }
        URL url = parseUrl(user, code);
        WSRequest request = wsClient.url(url.toString().split("\\?")[0]);
        if (url.getQuery() != null) {
            request = request.setQueryString(url.getQuery());
        }
        RemoteFunction<WSResponse, List<Course>> onSuccess = response -> {
            int status = response.getStatus();
            if (status == HttpServletResponse.SC_OK) {
                return parseCourses(response.asJson());
            }
            Logger.info("Non-OK response received for URL: {}. Status: {}", url, status);
            throw new RemoteException(String.format("sitnet_remote_failure %d %s", status, response.getStatusText()));
        };
        return request.get().thenApplyAsync(onSuccess);
    }

    private static List<GradeScale> getGradeScales(JsonNode src) {
        JsonNode node = src;
        List<GradeScale> scales = new ArrayList<>();
        if (node.has("gradeScale")) {
            node = node.get("gradeScale");
            for (JsonNode scale : node) {
                String type = scale.get("type").asText();
                Optional<GradeScale.Type> scaleType = GradeScale.Type.get(type);
                if (!scaleType.isPresent()) {
                    // not understood
                    Logger.warn("Skipping over unknown grade scale type {}", type);
                }
                else if (scaleType.get().equals(GradeScale.Type.OTHER)) {
                    // This needs custom handling
                    if (!scale.has("code") || !scale.has("name")) {
                        Logger.warn("Skipping over grade scale of type OTHER, required nodes are missing: {}",
                                scale.asText());
                        continue;
                    }
                    Long externalRef = scale.get("code").asLong();
                    GradeScale gs = Ebean.find(GradeScale.class).where().eq("externalRef", externalRef).findUnique();
                    if (gs != null) {
                        scales.add(gs);
                        continue;
                    }
                    gs = new GradeScale();
                    gs.setDescription(GradeScale.Type.OTHER.toString());
                    gs.setExternalRef(externalRef);
                    gs.setDisplayName(scale.get("name").asText());
                    gs.save();
                    for (JsonNode grade : scale.get("grades")) {
                        if (!grade.has("description")) {
                            Logger.warn("Skipping over grade, required nodes are missing: {}", grade.asText());
                            continue;
                        }
                        Grade g = new Grade();
                        g.setName(grade.get("description").asText());
                        g.setGradeScale(gs);
                        g.save();
                    }
                    scales.add(gs);
                } else {
                    scales.add(Ebean.find(GradeScale.class, scaleType.get().getValue()));
                }
            }
        }
        return scales;
    }

    @ActionMethod
    public Result getNewRecords(String startDate) {
        return ok(Json.toJson(getScores(startDate)));
    }

    // for testing purposes
    @ActionMethod
    public Result getNewRecordsAlphabeticKeyOrder(String startDate) {
        try {
            return ok(convertNode(Json.toJson(getScores(startDate))));
        } catch (JsonProcessingException e) {
            return Results.internalServerError(e.getMessage());
        }
    }

    private static Optional<String> getFirstChildNameValue(JsonNode json, String columnName) {
        if (json.has(columnName)) {
            JsonNode array = json.get(columnName);
            if (array.has(0)) {
                JsonNode child = array.get(0);
                if (child.has("name")) {
                    return Optional.of(child.get("name").asText());
                }
            }
        }
        return Optional.empty();
    }

    private static List<ExamScore> getScores(String startDate) {
        DateTime start = ISODateTimeFormat.dateTimeParser().parseDateTime(startDate);
        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
                .fetch("examScore")
                .where()
                .gt("timeStamp", start.toDate())
                .findList();
        return examRecords.stream().map(ExamRecord::getExamScore).collect(Collectors.toList());
    }

    private static Optional<Course> parseCourse(JsonNode node) throws ParseException {
        // check that this is a course node, response can also contain error messages and so on
        if (node.has("identifier") && node.has("courseUnitCode") && node.has("courseUnitTitle") && node.has("institutionName")) {
            Course course = new Course();
            if (node.has("endDate")) {
                Date endDate = DF.parse(node.get("endDate").asText());
                if (endDate.before(new Date())) {
                    return Optional.empty();
                }
                course.setEndDate(endDate);
            }
            if (node.has("startDate")) {
                Date startDate = DF.parse(node.get("startDate").asText());
                if (startDate.after(new Date())) {
                    return Optional.empty();
                }
                course.setStartDate(startDate);
            }
            course.setId(0L); // FIXME: smells like a hack
            course.setIdentifier(node.get("identifier").asText());
            course.setName(node.get("courseUnitTitle").asText());
            course.setCode(node.get("courseUnitCode").asText());
            if (node.has("courseUnitLevel")) {
                course.setLevel(node.get("courseUnitLevel").asText());
            }
            if (node.has("courseUnitType")) {
                course.setCourseUnitType(node.get("courseUnitType").asText());
            }
            if (node.has("courseImplementation")) {
                course.setCourseImplementation(node.get("courseImplementation").asText());
            }
            if (node.has("credits")) {
                course.setCredits(node.get("credits").asDouble());
            }
            String name = node.get("institutionName").asText();
            Organisation organisation = Ebean.find(Organisation.class).where().ieq("name", name).findUnique();
            // TODO: organisations should preexist or not? As a safeguard, lets create these for now if not found.
            if (organisation == null) {
                organisation = new Organisation();
                organisation.setName(name);
                organisation.save();
            }
            course.setOrganisation(organisation);
            List<GradeScale> scales = getGradeScales(node);
            if (!scales.isEmpty()) {
                // For now support just a single scale per course
                course.setGradeScale(scales.get(0));
            }
            // in array form
            course.setCampus(getFirstChildNameValue(node, "campus").orElse(null));
            course.setDegreeProgramme(getFirstChildNameValue(node, "degreeProgramme").orElse(null));
            course.setDepartment(getFirstChildNameValue(node, "department").orElse(null));
            course.setLecturerResponsible(getFirstChildNameValue(node, "lecturerResponsible").orElse(null));
            course.setLecturer(getFirstChildNameValue(node, "lecturer").orElse(null));
            course.setCreditsLanguage(getFirstChildNameValue(node, "creditsLanguage").orElse(null));
            return Optional.of(course);
        }
        return Optional.empty();
    }

    private static List<Course> parseCourses(JsonNode response) throws ParseException {
        List<Course> results = new ArrayList<>();
        if (response.get("status").asText().equals("OK") && response.has("CourseUnitInfo")) {
            JsonNode root = response.get("CourseUnitInfo");
            if (root.isArray()) {
                for (JsonNode node : root) {
                    parseCourse(node).ifPresent(results::add);
                }
            } else {
                parseCourse(root).ifPresent(results::add);
            }
        }
        return results;
    }

    private static String convertNode(JsonNode node) throws JsonProcessingException {
        Object obj = SORTED_MAPPER.treeToValue(node, Object.class);
        return SORTED_MAPPER.writeValueAsString(obj);
    }

    private static boolean isCourseSearchActive() {
        try {
            return ConfigFactory.load().getBoolean("sitnet.integration.courseUnitInfo.active");
        } catch (ConfigException e) {
            Logger.error("Failed to load config", e);
            return false;
        }
    }

}
