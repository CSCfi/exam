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

package impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import io.ebean.DB;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import models.Course;
import models.Grade;
import models.GradeScale;
import models.Organisation;
import models.User;
import org.apache.pekko.util.ByteString;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeanUtils;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import util.config.ConfigReader;

public class ExternalCourseHandlerImpl implements ExternalCourseHandler {

    private static final String COURSE_CODE_PLACEHOLDER = "${course_code}";
    private static final String USER_ID_PLACEHOLDER = "${employee_number}";
    private static final String USER_LANG_PLACEHOLDER = "${employee_lang}";
    private static final DateFormat DF = new SimpleDateFormat("yyyyMMdd");
    private static final ByteString BOM = ByteString.fromArray(new byte[] { (byte) 0xEF, (byte) 0xBB, (byte) 0xBF });

    private final Logger logger = LoggerFactory.getLogger(ExternalCourseHandlerImpl.class);

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

    private final WSClient wsClient;
    private final ConfigReader configReader;

    @Inject
    public ExternalCourseHandlerImpl(WSClient wsClient, ConfigReader configReader) {
        this.wsClient = wsClient;
        this.configReader = configReader;
    }

    private Set<Course> getLocalCourses(String code) {
        return DB
            .find(Course.class)
            .where()
            .ilike("code", code + "%")
            .disjunction()
            .isNull("endDate")
            .gt("endDate", new Date())
            .endJunction()
            .orderBy("code")
            .findSet()
            .stream()
            .filter(c ->
                c.getStartDate() == null ||
                configReader.getCourseValidityDate(new DateTime(c.getStartDate())).isBeforeNow()
            )
            .collect(Collectors.toSet());
    }

    @Override
    public CompletionStage<Set<Course>> getCoursesByCode(User user, String code) throws MalformedURLException {
        if (!configReader.isCourseSearchActive()) {
            return CompletableFuture.completedFuture(getLocalCourses(code));
        }
        // Hit the remote end for possible matches. Update local records with matching remote records.
        // Finally return all matches (local & remote)
        URL url = parseUrl(user.getOrganisation(), code);
        return downloadCourses(url)
            .thenApplyAsync(remotes -> {
                remotes.forEach(this::saveOrUpdate);
                Supplier<TreeSet<Course>> supplier = () -> new TreeSet<>(Comparator.comparing(Course::getCode));
                return Stream
                    .concat(getLocalCourses(code).stream(), remotes.stream())
                    .collect(Collectors.toCollection(supplier));
            });
    }

    @Override
    public CompletionStage<Collection<String>> getPermittedCourses(User user) throws MalformedURLException {
        URL url = parseUrl(user);
        WSRequest request = wsClient.url(url.toString().split("\\?")[0]);
        if (url.getQuery() != null) {
            request = request.setQueryString(url.getQuery());
        }
        if (configReader.isApiKeyUsed()) {
            request = request.addHeader(configReader.getApiKeyName(), configReader.getApiKeyValue());
        }
        RemoteFunction<WSResponse, Collection<String>> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (root.has("exception")) {
                throw new RemoteException(root.get("exception").asText());
            } else if (root.has("data")) {
                return StreamSupport
                    .stream(root.get("data").spliterator(), false)
                    .filter(c -> c.has("course_code") || c.has("courseUnitCode"))
                    .map(c -> c.has("course_code") ? c.get("course_code").asText() : c.get("courseUnitCode").asText())
                    .collect(Collectors.toSet());
            } else {
                logger.warn("Unexpected content {}", root.asText());
                throw new RemoteException("sitnet_request_timed_out");
            }
        };
        return request.get().thenApplyAsync(onSuccess);
    }

    private void saveOrUpdate(Course external) {
        DB
            .find(Course.class)
            .where()
            .eq("code", external.getCode())
            .findOneOrEmpty()
            .ifPresentOrElse(
                local -> {
                    // Existing course
                    if (external.getCourseImplementation() != null) {
                        // update only those courses that specify an implementation
                        BeanUtils.copyProperties(external, local, "id", "objectVersion");
                        local.update();
                    }
                    external.setId(local.getId());
                },
                external::save
            );
    }

    private JsonNode stripBom(WSResponse response) throws RemoteException {
        var bomCandidate = response.getBodyAsBytes().splitAt(3);
        if (bomCandidate._1.equals(BOM)) {
            logger.warn("BOM character detected in the beginning of response body");
            ObjectReader reader = new ObjectMapper().reader();
            try (ByteArrayInputStream bis = new ByteArrayInputStream(bomCandidate._2.toArray())) {
                return reader.readTree(bis);
            } catch (IOException e) {
                throw new RemoteException("Response contained a BOM character and we were unable to strip it out");
            }
        } else {
            return response.asJson();
        }
    }

    private CompletionStage<List<Course>> downloadCourses(URL url) {
        WSRequest request = wsClient.url(url.toString().split("\\?")[0]);
        if (url.getQuery() != null) {
            request = request.setQueryString(url.getQuery());
        }
        if (configReader.isApiKeyUsed()) {
            request = request.addHeader(configReader.getApiKeyName(), configReader.getApiKeyValue());
        }
        RemoteFunction<WSResponse, List<Course>> onSuccess = response -> {
            int status = response.getStatus();
            if (status == Http.Status.OK) {
                return parseCourses(stripBom(response));
            }
            logger.info("Non-OK response received for URL: {}. Status: {}", url, status);
            throw new RemoteException(String.format("sitnet_remote_failure %d %s", status, response.getStatusText()));
        };
        return request
            .get()
            .thenApplyAsync(onSuccess)
            .exceptionally(t -> {
                logger.error("Connection error occurred", t);
                return Collections.emptyList();
            });
    }

    private URL parseUrl(Organisation organisation, String courseCode) throws MalformedURLException {
        String urlConfigPrefix = "sitnet.integration.courseUnitInfo.url";
        String configPath = null;
        if (organisation != null && organisation.getCode() != null) {
            String path = String.format("%s.%s", urlConfigPrefix, organisation.getCode());
            if (configReader.hasPath(path)) {
                configPath = path;
            }
        }
        if (configPath == null) {
            String path = String.format("%s.%s", urlConfigPrefix, "default");
            if (configReader.hasPath(path)) {
                configPath = path;
            } else {
                throw new RuntimeException("sitnet.integration.courseUnitInfo.url holds no suitable URL for user");
            }
        }
        String url = configReader.getString(configPath);
        if (url == null || !url.contains(COURSE_CODE_PLACEHOLDER)) {
            throw new RuntimeException("sitnet.integration.courseUnitInfo.url is malformed");
        }
        url = url.replace(COURSE_CODE_PLACEHOLDER, courseCode);
        return URI.create(url).toURL();
    }

    private URL parseUrl(User user) throws MalformedURLException {
        if (
            configReader.getPermissionCheckUserIdentifier().equals("userIdentifier") && user.getUserIdentifier() == null
        ) {
            throw new MalformedURLException("User has no identier number!");
        }
        String url = configReader.getPermissionCheckUrl();
        if (url == null || !url.contains(USER_ID_PLACEHOLDER)) {
            throw new MalformedURLException("sitnet.integration.enrolmentPermissionCheck.url is malformed");
        }
        String identifier = URLEncoder.encode(
            configReader.getPermissionCheckUserIdentifier().equals("userIdentifier")
                ? user.getUserIdentifier()
                : user.getEppn(),
            StandardCharsets.UTF_8
        );
        url = url.replace(USER_ID_PLACEHOLDER, identifier).replace(USER_LANG_PLACEHOLDER, user.getLanguage().getCode());
        return URI.create(url).toURL();
    }

    private Optional<GradeScale> importScale(JsonNode node) {
        String externalRef = node.get("code").asText();
        Optional<GradeScale> ogs = DB.find(GradeScale.class).where().eq("externalRef", externalRef).findOneOrEmpty();
        if (ogs.isPresent()) {
            return ogs;
        }
        GradeScale gs = new GradeScale();
        gs.setDescription(GradeScale.Type.OTHER.toString());
        gs.setExternalRef(externalRef);
        gs.setDisplayName(node.get("name").asText());
        logger.info("saving scale " + externalRef);
        gs.save();
        Stream<JsonNode> gradesNode = StreamSupport
            .stream(node.get("grades").spliterator(), false)
            .filter(n -> n.has("description"));
        Set<Grade> grades = gradesNode
            .map(n -> {
                Grade grade = new Grade();
                grade.setName(n.get("description").asText());
                grade.setGradeScale(gs);
                // Dumb JSON API gives us boolean values as strings
                boolean marksRejection =
                    n.get("isFailed") != null && Boolean.parseBoolean(n.get("isFailed").asText("false"));
                grade.setMarksRejection(marksRejection);
                grade.save();
                return grade;
            })
            .collect(Collectors.toSet());
        gs.setGrades(grades);
        return Optional.of(gs);
    }

    private List<GradeScale> getGradeScales(JsonNode src) {
        JsonNode scaleNode = src.path("gradeScale");
        if (!scaleNode.isEmpty()) {
            Set<JsonNode> scales;
            if (scaleNode.isArray()) {
                scales =
                    StreamSupport
                        .stream(scaleNode.spliterator(), false)
                        .filter(s -> s.has("type"))
                        .collect(Collectors.toSet());
            } else {
                scales = Set.of(scaleNode);
            }
            Stream<GradeScale> externals = scales
                .stream()
                .filter(s -> {
                    String type = s.get("type").asText();
                    Optional<GradeScale.Type> gst = GradeScale.Type.get(type);
                    return gst.isPresent() && gst.get() == GradeScale.Type.OTHER;
                })
                .filter(n -> n.has("code") && n.has("name"))
                .map(this::importScale)
                .flatMap(Optional::stream);
            Stream<GradeScale> locals = scales
                .stream()
                .filter(s -> {
                    String type = s.get("type").asText();
                    Optional<GradeScale.Type> gst = GradeScale.Type.get(type);
                    return gst.isPresent() && gst.get() != GradeScale.Type.OTHER;
                })
                .map(n -> DB.find(GradeScale.class).where().eq("type", n.get("type").asText()).findOne());
            return Stream.concat(externals, locals).toList();
        }
        return Collections.emptyList();
    }

    private Optional<Course> parseCourse(JsonNode node) throws ParseException {
        // check that this is a course node, response can also contain error messages and so on
        if (
            node.has("identifier") &&
            node.has("courseUnitCode") &&
            node.has("courseUnitTitle") &&
            node.has("institutionName")
        ) {
            Course course = new Course();
            if (node.has("endDate") && node.get("endDate").isTextual()) {
                Date endDate = DF.parse(node.get("endDate").asText());
                if (endDate.before(new Date())) {
                    return Optional.empty();
                }
                course.setEndDate(endDate);
            }
            if (node.has("startDate") && node.get("startDate").isTextual()) {
                DateTime startDate = new DateTime(DF.parse(node.get("startDate").asText()));
                DateTime validityDate = configReader.getCourseValidityDate(startDate);
                if (validityDate.isAfterNow()) {
                    return Optional.empty();
                }
                course.setStartDate(startDate.toDate());
            }
            course.setIdentifier(node.get("identifier").asText());
            course.setName(node.get("courseUnitTitle").asText());
            course.setCode(node.get("courseUnitCode").asText());
            if (node.has("courseUnitImplementation") || node.has("courseImplementation")) {
                String impl = node.has("courseImplementation")
                    ? node.get("courseImplementation").asText()
                    : node.get("courseUnitImplementation").asText();
                course.setCourseImplementation(impl);
            }
            if (node.has("courseUnitLevel")) {
                course.setLevel(node.get("courseUnitLevel").asText());
            }
            if (node.has("courseUnitType")) {
                course.setCourseUnitType(node.get("courseUnitType").asText());
            }
            if (node.has("credits")) {
                course.setCredits(node.get("credits").asDouble());
            }
            String name = node.get("institutionName").asText();
            // TODO: how to identify (external) organisations. Maybe we need some "externalRef" for organisations as well?
            Organisation organisation = DB.find(Organisation.class).where().ieq("name", name).findOne();
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
            course.setCampus(getFirstName(node, "campus"));
            course.setDegreeProgramme(getFirstName(node, "degreeProgramme"));
            course.setDepartment(getFirstName(node, "department"));
            course.setLecturerResponsible(getFirstName(node, "lecturerResponsible"));
            course.setLecturer(getFirstName(node, "lecturer"));
            course.setCreditsLanguage(getFirstName(node, "creditsLanguage"));
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

    private String getFirstName(JsonNode json, String columnName) {
        JsonNode node = json.path(columnName);
        JsonNode name = node.isArray() ? node.path(0).path("name") : node.path("name");
        return name.isMissingNode() ? null : name.asText();
    }
}
