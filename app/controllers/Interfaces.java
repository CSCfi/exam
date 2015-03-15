package controllers;


import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.typesafe.config.ConfigException;
import com.typesafe.config.ConfigFactory;
import exceptions.NotFoundException;
import models.Course;
import models.ExamRecord;
import models.GradeScale;
import models.Organisation;
import models.dto.ExamScore;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.Logger;
import play.libs.F;
import play.libs.Json;
import play.libs.WS;
import play.mvc.Result;
import play.mvc.Results;

import java.util.ArrayList;
import java.util.List;

public class Interfaces extends SitnetController {

    private static final ObjectMapper SORTED_MAPPER = new ObjectMapper();
    static {
        SORTED_MAPPER.configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    public static List<Course> getCourseInfo(String code) throws NotFoundException {
        String url = ConfigFactory.load().getString("sitnet.integration.courseUnitInfo.url");
        List<Course> courses = Ebean.find(Course.class).where().like("code", code + "%").orderBy("name desc").findList();
        if (!courses.isEmpty() || !isSearchActive()) {
            // we already have it or we don't want to fetch it
            return courses;
        }
        WS.Response response;
        try {
            response = WS.url(url).setTimeout(10 * 1000).setQueryParameter("courseUnitCode", code).get().get(10 * 1000);
        } catch (RuntimeException e) {
            throw new NotFoundException(e.getMessage());
        }
        if (response.getStatus() != 200) {
            throw new NotFoundException();
        }
        List<Course> results = new ArrayList<>();
        for (JsonNode json : response.asJson()) {
            // if not Course json, failed answer can contain other kind of text like "Opintokohde xxxxxxx ei löytynyt Oodista"
            if (json.has("identifier")) {
                Course course = new Course();
                course.setId(0L); // FIXME: smells like a hack

                if (json.has("courseUnitTitle")) {
                    course.setName(json.get("courseUnitTitle").asText());
                }
                if (json.has("courseUnitCode")) {
                    course.setCode(json.get("courseUnitCode").asText());
                }
                if (json.has("courseUnitType")) {
                    course.setCourseUnitType(json.get("courseUnitType").asText());
                }
                if (json.has("startDate")) {
                    course.setStartDate(json.get("startDate").asText());
                }
                if (json.has("credits")) {
                    course.setCredits(json.get("credits").asDouble());
                }
                if (json.has("identifier")) {
                    course.setIdentifier(json.get("identifier").asText());
                }
                if (json.has("institutionName")) {
                    String name = json.get("institutionName").asText();
                    Organisation organisation = Ebean.find(Organisation.class).where().ieq("name", name).findUnique();
                    // TODO: organisations should preexist or not? As a safeguard, lets create these for now if not found.
                    if (organisation == null) {
                        organisation = new Organisation();
                        organisation.setName(name);
                        organisation.save();
                    }
                    course.setOrganisation(organisation);
                }

                // in array form
                course.setCampus(getFirstChildNameValue(json, "campus"));
                course.setDegreeProgramme(getFirstChildNameValue(json, "degreeProgramme"));
                course.setDepartment(getFirstChildNameValue(json, "department"));
                course.setLecturer(getFirstChildNameValue(json, "lecturer"));
                course.setGradeScale(getGradeScale(getFirstChildNameValue(json, "gradeScale")));
                course.setCreditsLanguage(getFirstChildNameValue(json, "creditsLanguage"));
                results.add(course);
            }
        }
        return results;
    }

    private static GradeScale getGradeScale(String value) {
        if (value == null) {
            return null;
        }
        try {
            GradeScale.Type type = GradeScale.Type.valueOf(value);
            return Ebean.find(GradeScale.class, type.getValue());
        } catch (RuntimeException e) {
            Logger.error("Unsupported grade scale received {}", value);
            return null; // TODO: should we just throw an exception in order to cancel the whole import?
        }
    }

    public static Result getNewRecords(String startDate) {
        return ok(Json.toJson(getScores(startDate)));
    }

    // for testing purposes
    public static Result getNewRecordsAlphabeticKeyOrder(String startDate) {
        try {
            return ok(convertNode(Json.toJson(getScores(startDate))));
        } catch (JsonProcessingException e) {
            return Results.internalServerError(e.getMessage());
        }
    }

    private static String getFirstChildNameValue(JsonNode json, String columnName) {
        if (json.has(columnName)) {
            JsonNode array = json.get(columnName);
            if (array.has(0)) {
                JsonNode child = array.get(0);
                if (child.has("name")) {
                    return child.get("name").asText();
                }
            }
        }
        return null;
    }

    private static List<ExamScore> getScores(String startDate) {
        DateTime start = ISODateTimeFormat.dateTimeParser().parseDateTime(startDate);
        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
                .select("exam_score")
                .where()
                .gt("time_stamp", start.toDate())
                .findList();

        List<ExamScore> examScores = new ArrayList<>();
        for (ExamRecord record : examRecords) {
            examScores.add(record.getExamScore());
        }
        return examScores;
    }

    private static String convertNode(JsonNode node) throws JsonProcessingException {
        Object obj = SORTED_MAPPER.treeToValue(node, Object.class);
        return SORTED_MAPPER.writeValueAsString(obj);
    }

    private static boolean isSearchActive() {
        try {
            return ConfigFactory.load().getBoolean("sitnet.integration.courseUnitInfo.active");
        } catch (ConfigException e) {
            return false;
        }
    }

    // TODO: Is this useful for anything?
    public static F.Promise<Result> getInfo(String code) throws NotFoundException {

        String url = ConfigFactory.load().getString("sitnet.integration.courseUnitInfo.url");
        if (url == null || url.isEmpty()) {
            final List<Course> courses = Ebean.find(Course.class)
                    .where()
                    .eq("code", code)
                    .findList();

            return F.Promise.promise(new F.Function0<Result>() {
                public Result apply() {
                    return Results.ok(Json.toJson(courses));
                }
            });
        }

        try {
            WS.WSRequestHolder ws = WS.url(url)
                    .setTimeout(10 * 1000)
                    .setQueryParameter("courseUnitCode", code);

            return ws.get().map(
                    new F.Function<WS.Response, Result>() {
                        public Result apply(WS.Response response) {
                            JsonNode json = response.asJson();
                            return ok(json);
                        }
                    }
            );
        } catch (Exception ex) {
            throw new NotFoundException(ex.getMessage());
        }
    }




}
