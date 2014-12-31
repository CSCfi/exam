package controllers;


import Exceptions.NotFoundException;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.typesafe.config.ConfigFactory;
import models.*;
import models.dto.ExamScore;
import org.apache.commons.lang3.StringUtils;
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
import java.util.Iterator;
import java.util.List;

public class Interfaces extends SitnetController {

    final static SimpleDateFormat sdf = new SimpleDateFormat("dd.MM.yyyy");


    public static F.Promise<Result> getInfo(String code) throws NotFoundException {

//        String url = organisation.getCourseUnitInfoUrl();
        String url= ConfigFactory.load().getString("sitnet.integration.courseUnitInfo.url");

        if (url == null || url.isEmpty()) {
            final List<Course> list = Ebean.find(Course.class)
                    .where()
                    .eq("code", code)
                    .findList();

            return F.Promise.promise(new F.Function0<Result>() {
                public Result apply() {
                    return Results.ok(Json.toJson(list));
                }
            });
        }

        try {
            WS.WSRequestHolder ws = WS.url(url)
                    .setTimeout(10 * 1000)
                    .setQueryParameter("courseUnitCode", code);

            final F.Promise<Result> reply = ws.get().map( new F.Function<WS.Response, Result>() {
                        public Result apply(WS.Response response) {
                            JsonNode json = response.asJson();
                            return ok(json);
                        }
                    }
            );

            return reply;

        } catch (Exception ex) {
            throw new NotFoundException(ex.getMessage());
        }
    }

    public static List<Course> getCourseInfo(String code) throws NotFoundException {

        String url= ConfigFactory.load().getString("sitnet.integration.courseUnitInfo.url");
        boolean isActive;

        try {
            isActive = ConfigFactory.load().getBoolean("sitnet.integration.courseUnitInfo.active");
        } catch(Exception e) {
            isActive = false;
        }


        List<Course> list = Ebean.find(Course.class).where().like("code", code + "%").orderBy("name desc").findList();

        // check if alreaqdy exits in local
        if(list != null && list.size() > 0) {
            return list;
        }
        list = new ArrayList<>();

        if(isActive) {
            try {
                WS.WSRequestHolder ws = WS.url(url)
                        .setTimeout(10 * 1000)
                        .setQueryParameter("courseUnitCode", code);


                final F.Promise<WS.Response> reply = ws.get();
                final WS.Response response = reply.get(1000 * 10);

                if (response != null && response.getStatus() == 200) {

                    for (JsonNode json : response.asJson()) {

                        // if not Course json, failed answer can contain other kind of text like "Opintokohde xxxxxxx ei löytynyt Oodista"
                        if (json.has("identifier")) {

                            if (Logger.isDebugEnabled()) {
                                Logger.debug("*** returned object ***");
                                Iterator i = json.fieldNames();
                                while (i.hasNext()) {
                                    String s = (String) i.next();
                                    Logger.debug("*   " + s + ": " + json.get(s));
                                }
                                Logger.debug("***********************");
                            }

                            Course course = new Course();

                            course.setId(0L);

                            // will throw nullpointer if column missing, check all columns
                            try {
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
                                    course.setInstitutionName(json.get("institutionName").asText());
                                }

                                // in array form
                                course.setCampus(getFirstChildNameValue(json, "campus"));
                                course.setDegreeProgramme(getFirstChildNameValue(json, "degreeProgramme"));
                                course.setDepartment(getFirstChildNameValue(json, "department"));
                                course.setLecturer(getFirstChildNameValue(json, "lecturer"));
                                course.setGradeScale(getFirstChildNameValue(json, "gradeScale"));
                                course.setCreditsLanguage(getFirstChildNameValue(json, "creditsLanguage"));

                            } catch (Exception e) {
                                Logger.error("error in interface course mapping", e);
                            }

                            list.add(course);
                        }

                    }
                }

            } catch (Exception ex) {
                throw new NotFoundException(ex.getMessage());
            }
        }

        return list;
    }

    private static String getFirstChildNameValue(JsonNode json, String columnName) {
        if(json.has(columnName)){
            JsonNode array = json.get(columnName);
            if(array.has(0)) {
                JsonNode child = array.get(0);
                if(child.has("name")) {
                    return child.get("name").asText();
                }
            }
        }
        return StringUtils.EMPTY;
    }

    public static Result getNewRecords(String startDate) {

        Date start = null;

        try {
            start = sdf.parse(startDate);
        } catch (ParseException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        } finally {
            if(start == null) {
                return Results.badRequest("date format should be dd.MM.YYYY eg. 17.01.2011");
            }
        }

        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
                .select("exam_score")
                .where()
                .gt("time_stamp", start)
                .findList();

        if(examRecords == null) {
            return Results.ok("no records since: " + startDate);
        }


        List<ExamScore> examScores = new ArrayList<ExamScore>();
        for (ExamRecord record : examRecords) {
            examScores.add(record.getExamScore());
        }

        return ok(Json.toJson(examScores));
    }


    public static Result getRecords(String vatIdNumber, String startDate) {

        //todo: ip limit
        final Organisation organisation = Ebean.find(Organisation.class).where().eq("vatIdNumber", vatIdNumber).findUnique();

        if(organisation == null) {
            return notFound("no such organisation");
        }

        Date start = null;

        try {
            start = sdf.parse(startDate);
        } catch (ParseException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        } finally {
            if(start == null) {
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
                    examScore.setCreditLanguage(exam.getExamLanguage());
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
