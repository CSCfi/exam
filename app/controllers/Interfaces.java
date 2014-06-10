package controllers;


import Exceptions.NotFoundException;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import models.Exam;
import models.ExamParticipation;
import models.Organisation;
import models.User;
import models.dto.CourseUnitInfo;
import models.dto.ExamScore;
import play.Logger;
import play.libs.F;
import play.libs.Json;
import play.libs.WS;
import play.mvc.Result;
import play.mvc.Results;

import java.net.URI;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class Interfaces extends SitnetController {

    final static SimpleDateFormat sdf = new SimpleDateFormat("dd.MM.yyyy");


    public static F.Promise<Result> getInfo(String organisationId, String id) throws NotFoundException {

        Organisation organisation = Ebean.find(Organisation.class).select("courseUnitInfoUrl").where().eq("id", organisationId).findUnique();

        String url = organisation.getCourseUnitInfoUrl();


        if (url == null || url.isEmpty()) {
            final List<CourseUnitInfo> list = Ebean.find(CourseUnitInfo.class).where().eq("organisation", organisationId).eq("identifier", id).findList();

            return F.Promise.promise(new F.Function0<Result>() {
                public Result apply() {
                    return Results.ok(Json.toJson(list));
                }
            });

        }

        try {
            URI uri = null;
            if (url != null) {
                uri = new URI(url);

            }
            WS.WSRequestHolder ws = WS.url(url)
                    .setTimeout(10 * 1000)
                    .setQueryParameter("courseId", id);

            final F.Promise<Result> reply = ws.get().map(
                    new F.Function<WS.Response, Result>() {
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
                if (exam.getState().equals("REVIEWED")) {

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
                    examScore.setExamScore(Double.toString(exam.getTotalScore()));
                    examScore.setCourseUnitLevel(exam.getCourse().getLevel());
                    examScore.setCourseUnitType(exam.getCourse().getType().getName());
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
