package controllers;


import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.typesafe.config.ConfigException;
import com.typesafe.config.ConfigFactory;
import exceptions.NotFoundException;
import models.*;
import models.dto.ExamScore;
import play.Logger;
import play.libs.F;
import play.libs.Json;
import play.libs.WS;
import play.mvc.Result;
import play.mvc.Results;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class Interfaces extends SitnetController {

    final static SimpleDateFormat sdf = new SimpleDateFormat("dd.MM.yyyy");

    private static final ObjectMapper SORTED_MAPPER = new ObjectMapper();

    static {
        SORTED_MAPPER.configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

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

    private static boolean isSearchActive() {
        try {
            return ConfigFactory.load().getBoolean("sitnet.integration.courseUnitInfo.active");
        } catch (ConfigException e) {
            return false;
        }
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
                course.setGradeScale(getFirstChildNameValue(json, "gradeScale"));
                course.setCreditsLanguage(getFirstChildNameValue(json, "creditsLanguage"));

                results.add(course);
            }
        }
        return results;
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

    public static Result getNewRecords(String startDate) {

        Date start = null;

        try {
            start = sdf.parse(startDate);
        } catch (ParseException e) {
            return Results.badRequest("date format should be dd.MM.YYYY eg. 17.01.2011");
        }

        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
                .select("exam_score")
                .where()
                .gt("time_stamp", start)
                .findList();

        if (examRecords == null) {
            return Results.ok("no records since: " + startDate);
        }


        List<ExamScore> examScores = new ArrayList<ExamScore>();
        for (ExamRecord record : examRecords) {
            examScores.add(record.getExamScore());
        }
        return ok(Json.toJson(examScores));
    }

    // for testing purposes
    public static Result getNewRecordsAlphabeticKeyOrder(String startDate) {

        Date start = null;

        try {
            start = sdf.parse(startDate);
        } catch (ParseException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        } finally {
            if (start == null) {
                return Results.badRequest("date format should be dd.MM.YYYY eg. 17.01.2011");
            }
        }

        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
                .select("exam_score")
                .where()
                .gt("time_stamp", start)
                .findList();

        if (examRecords == null) {
            return Results.ok("no records since: " + startDate);
        }


        List<ExamScore> examScores = new ArrayList<ExamScore>();
        for (ExamRecord record : examRecords) {
            examScores.add(record.getExamScore());
        }

        String json = null;
        try {
            json = convertNode(Json.toJson(examScores));
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }

        return ok(json);
    }

    // for testing purposes
    private static String convertNode(final JsonNode node) throws JsonProcessingException {
        final Object obj = SORTED_MAPPER.treeToValue(node, Object.class);
        final String json = SORTED_MAPPER.writeValueAsString(obj);
        return json;
    }

    public static Result getRecords(String vatIdNumber, String startDate) {

        //todo: ip limit
        final Organisation organisation = Ebean.find(Organisation.class).where().eq("vatIdNumber", vatIdNumber).findUnique();

        if (organisation == null) {
            return notFound("no such organisation");
        }

        Date start = null;

        try {
            start = sdf.parse(startDate);
        } catch (ParseException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        } finally {
            if (start == null) {
                return Results.badRequest("date format should be dd.MM.YYYY eg. 17.01.2011");
            }
        }

        final List<User> students = Ebean.find(User.class).where().eq("organisation", organisation).eq("roles.name", "STUDENT").findList();

        List<ExamScore> examScores = new ArrayList<ExamScore>();

        for (User student : students) {
            for (ExamParticipation participation : student.getParticipations()) {

                final Exam exam = participation.getExam();
                Logger.info(exam.toString());
                if (exam.getState().equals("GRADED")) {

                    /*
                    //todo:
                    if(exam.getAnswerderDate().isBefore(startDate)) {
                        continue;
                    }
                    */

                    ExamScore examScore = new ExamScore();
                    examScore.setIdentifier(student.getIdentifier());
                    examScore.setCourseUnitCode(exam.getCourse().getCode());
                    //todo: see this!
                    examScore.setExamDate(sdf.format(exam.getModified()));
                    examScore.setCredits(exam.getCourse().getCredits().toString());
                    examScore.setCreditLanguage(exam.getAnswerLanguage());
                    examScore.setStudentGrade(exam.getGrade());
                    examScore.setGradeScale(exam.getGrading());
/*
                    List<String> scores = examScore.getExamScore();
                    if(scores == null)
                        scores = new ArrayList<String>();

                    scores.add(exam.getTotalScore().toString());

                    examScore.setExamScore(scores);

*/
                    examScore.setCourseUnitLevel(exam.getCourse().getLevel());
//                    examScore.setCourseUnitType(exam.getCourse().getType().getName());
                    //todo: fix this!
                    examScore.setCreditType("");
                    examScore.setLecturer("");
                    examScore.setLecturerId("");
                    examScore.setDate(sdf.format(new Date()));
                    //todo: implementation
                    examScore.setCourseImplementation("");
                    examScores.add(examScore);
                }

            }

        }
        return ok(Json.toJson(examScores));
    }
}
