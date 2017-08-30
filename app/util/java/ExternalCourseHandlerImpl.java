package util.java;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.annotation.Transactional;
import com.fasterxml.jackson.databind.JsonNode;
import com.typesafe.config.Config;
import com.typesafe.config.ConfigException;
import com.typesafe.config.ConfigFactory;
import models.Course;
import models.Grade;
import models.GradeScale;
import models.Organisation;
import models.User;
import org.springframework.beans.BeanUtils;
import play.Logger;
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
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;


public class ExternalCourseHandlerImpl implements ExternalCourseHandler {

    private static final String COURSE_CODE_PLACEHOLDER = "${course_code}";
    private static final String USER_ID_PLACEHOLDER = "${employee_number}";
    private static final String USER_LANG_PLACEHOLDER = "${employee_lang}";

    private static final DateFormat DF = new SimpleDateFormat("yyyyMMdd");

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

    private WSClient wsClient;

    @Inject
    public ExternalCourseHandlerImpl(WSClient wsClient) {
        this.wsClient = wsClient;
    }

    @Override
    public CompletionStage<List<Course>> getCoursesByCode(User user, String code) throws MalformedURLException {
        final List<Course> localMatches = Ebean.find(Course.class).where()
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
        boolean exactMatchFound = localMatches.stream().map(Course::getCode).anyMatch(x -> x.equalsIgnoreCase(code));
        if (!isCourseSearchActive() || exactMatchFound) {
            // we either don't care about external resources or already have it locally
            return CompletableFuture.supplyAsync(() -> localMatches);
        }
        // hit the remote end for a possible match
        URL url = parseUrl(user.getOrganisation(), code);
        return downloadCourses(url).thenApplyAsync(courses -> {
            courses.forEach(Course::save);
            return Stream.concat(localMatches.stream(), courses.stream()).collect(Collectors.toList());
        });
    }

    private void update(Course local, Course external) {
        BeanUtils.copyProperties(external, local, "id", "objectVersion");
        local.update();
    }

    @Override
    @Transactional
    public CompletionStage<Result> updateCourses() throws MalformedURLException {
        List<Course> locals = Ebean.find(Course.class).where()
                .disjunction()
                .isNull("endDate")
                .gt("endDate", new Date())
                .endJunction()
                .disjunction()
                .isNull("startDate")
                .lt("startDate", new Date())
                .endJunction().findList();
        List<CompletableFuture<List<Course>>> callbacks = new ArrayList<>();
        for (Course local : locals) {
            URL url = parseUrl(local.getOrganisation(), local.getCode());
            callbacks.add(downloadCourses(url).thenApply(courses -> {
                if (courses.isEmpty()) {
                    Logger.warn("No match found for course " + local.getCode());
                } else if (courses.size() > 1) {
                    Logger.warn("Multiple matches found for course " + local.getCode());
                } else {
                    update(local, courses.get(0));
                }
                return null;
            }));
        }
        return CompletableFuture.allOf(callbacks.toArray(new CompletableFuture[0]))
                .thenApplyAsync(r -> Results.ok());
    }

    private CompletableFuture<List<Course>> downloadCourses(URL url) {
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
        return request.get()
                .thenApplyAsync(onSuccess)
                .toCompletableFuture();
    }

    @Override
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


    private static URL parseUrl(Organisation organisation, String courseCode) throws MalformedURLException {
        String urlConfigPrefix = "sitnet.integration.courseUnitInfo.url";
        Config config = ConfigFactory.load();
        String configPath = null;
        if (organisation != null && organisation.getCode() != null) {
            String path = String.format("%s.%s", urlConfigPrefix, organisation.getCode());
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


    private static URL parseUrl(User user) throws MalformedURLException {
        if (user.getUserIdentifier() == null) {
            throw new MalformedURLException("User has no identier number!");
        }
        String url = ConfigFactory.load().getString("sitnet.integration.enrolmentPermissionCheck.url");
        if (url == null || !url.contains(USER_ID_PLACEHOLDER) || !url.contains(USER_LANG_PLACEHOLDER)) {
            throw new MalformedURLException("sitnet.integration.enrolmentPermissionCheck.url is malformed");
        }
        url = url.replace(USER_ID_PLACEHOLDER, user.getUserIdentifier()).replace(USER_LANG_PLACEHOLDER,
                user.getLanguage().getCode());
        return new URL(url);
    }

    private static boolean isCourseSearchActive() {
        try {
            return ConfigFactory.load().getBoolean("sitnet.integration.courseUnitInfo.active");
        } catch (ConfigException e) {
            Logger.error("Failed to load config", e);
            return false;
        }
    }

    private List<GradeScale> getGradeScales(JsonNode src) {
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
                } else if (scaleType.get().equals(GradeScale.Type.OTHER)) {
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
                    Logger.info("saving scale " + externalRef);
                    gs.save();
                    for (JsonNode grade : scale.get("grades")) {
                        if (!grade.has("description")) {
                            Logger.warn("Skipping over grade, required nodes are missing: {}", grade.asText());
                            continue;
                        }
                        Grade g = new Grade();
                        g.setName(grade.get("description").asText());
                        g.setGradeScale(gs);
                        // Dumb JSON API gives us boolean values as strings
                        boolean marksRejection = grade.get("isFailed") != null ?
                                Boolean.valueOf(grade.get("isFailed").asText("false")) :
                                false;
                        g.setMarksRejection(marksRejection);
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

    private Optional<Course> parseCourse(JsonNode node) throws ParseException {
        // check that this is a course node, response can also contain error messages and so on
        if (node.has("identifier") && node.has("courseUnitCode") &&
                node.has("courseUnitTitle") && node.has("institutionName")) {
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
            // TODO: how to identify (external) organisations. Maybe we need some "externalRef" for organisations as well?
            Organisation organisation = Ebean.find(Organisation.class).where().ieq("name", name).findUnique();
            // TODO: should organisations preexist or not? As a safeguard, lets create these for now if not found.
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

    private List<Course> parseCourses(JsonNode response) throws ParseException {
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

}
