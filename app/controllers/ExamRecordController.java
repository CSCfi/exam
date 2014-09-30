package controllers;

import Exceptions.MalformedDataException;
import com.avaje.ebean.Ebean;
import models.*;
import models.dto.ExamScore;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;
import util.java.EmailComposer;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;

/**
 * Created by alahtinen on 02/09/14.
 */
public class ExamRecordController extends SitnetController {

    static public Result getJson() {

        List<ExamRecord> ers = Ebean.find(ExamRecord.class).findList();

        return ok(Json.toJson(ers.get(0)));
    }

    static public Result addExamRecord() throws MalformedDataException {

         Exam exam = Form.form(Exam.class).bindFromRequest(
                                                         "id",
                                                         "instruction",
                                                         "name",
                                                         "shared",
                                                         "state",
                                                         "room",
                                                         "duration",
                                                         "grading",
                                                         "otherGrading",
                                                         "totalScore",
                                                         "examLanguage",
                                                         "answerLanguage",
                                                         "grade",
                                                         "creditType",
                                                         "expanded")
                                                        .get();

        exam.update();

        ExamParticipation participation = Ebean.find(ExamParticipation.class)
                .fetch("user")
                .where()
                .eq("exam.id", exam.getId())
                .findUnique();

        ExamRecord er = new ExamRecord();

        User student = participation.getUser();
        er.setExam(exam);
        er.setStudent(student);

        // TODO Remember to change graded by user thingy
        // This could be redundant anyway.
        er.setTeacher(exam.getGradedByUser());

        ExamScore score = new ExamScore();

        System.out.println(student);
        List<HakaAttribute> attrs = student.getAttributes();

        score.setCredits(exam.getCourse().getCredits().toString());
        score.setExamScore(exam.getTotalScore().toString());

        // TODO: attr might be null
        if(attrs == null) {
            score.setStudent("");
            score.setStudentId("");
        }
        else {
            score.setStudent(getAttribute("eduPersonPrincipalName", attrs));
            score.setStudentId(getAttribute("schacPersonalUniqueCode", attrs));
        }

        SimpleDateFormat sdf = new SimpleDateFormat("ddMMyyyy");
        // Record transfer timestamp (date)
        score.setDate(sdf.format(new Date()));
        // Timestamp for exam
        score.setExamDate(sdf.format(participation.getEnded()));

        // TODO Change getGradedByUser if necessary
        User lecturer = exam.getGradedByUser();
        System.out.println(lecturer);
        score.setLecturer(getAttribute("eduPersonPrincipalName", lecturer.getAttributes()));
        score.setLecturerId(getAttribute("schacPersonalUniqueCode", lecturer.getAttributes()));


        // TODO s
        score.setCourseImplementation("");
        score.setCourseUnitCode("");
        score.setCourseUnitLevel("");
        score.setCourseUnitType("");
        score.setCreditLanguage("");
        score.setCreditType("");
        score.setIdentifier("");

        score.setGradeScale(exam.getGrading());
        // What's this? The grade?
        score.setStudentGrade(exam.getGrade());

        score.save();

        er.setExamScore(score);
        er.save();

        DynamicForm df = Form.form().bindFromRequest();

        boolean sendFeedback = Boolean.parseBoolean(df.get("sendFeedback"));

        if(sendFeedback) {
            EmailComposer.composeInspectionReady(exam.getCreator(), UserController.getLoggedUser(), exam);
        }

        return ok();
    }

    private static String getAttribute(String attrName, List<HakaAttribute> attrs) {

        for (HakaAttribute ha : attrs) {

            if (ha.getKey() == attrName) {
                return ha.getValue();
            }
        }
        return new String("");
    }
}
