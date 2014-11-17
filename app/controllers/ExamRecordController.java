package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.*;
import models.dto.ExamScore;
import play.data.DynamicForm;
import play.data.Form;
import play.mvc.Result;
import util.java.EmailComposer;

import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;

/**
 * Created by alahtinen on 02/09/14.
 */
public class ExamRecordController extends SitnetController {


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result addExamRecord() throws MalformedDataException {

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

        Exam ex = Ebean.find(Exam.class)
                .select("state, creator")
                .where()
                .eq("id", exam.getId())
                .findUnique();

//        if (!SitnetUtil.isOwner(ex) || !UserController.getLoggedUser().hasRole("ADMIN"))
//            return forbidden("You are not allowed to modify this object");
            // if this exam is already logged exit.
        if(ex.getState().equals(Exam.State.GRADED_LOGGED.name()))
            return forbidden("sitnet_error_exam_already_graded_logged");

        exam.update();

        ExamParticipation participation = Ebean.find(ExamParticipation.class)
                .fetch("user")
                .where()
                .eq("exam.id", exam.getId())
                .findUnique();

        ExamRecord record = new ExamRecord();

        User student = participation.getUser();
        User teacher = exam.getGradedByUser();

        record.setExam(exam);
        record.setStudent(student);
        record.setTeacher(teacher);
        record.setTimeStamp(new Timestamp(new Date().getTime()));


        ExamScore score = new ExamScore();

        score.setStudent(student.getEppn());
        score.setStudentId(student.getUserIdentifier());
        score.setCredits(exam.getCourse().getCredits().toString());
        score.setExamScore(exam.getTotalScore().toString());

        score.setLecturer(teacher.getEppn());
        score.setLecturerId(teacher.getUserIdentifier());

        SimpleDateFormat sdf = new SimpleDateFormat("ddMMyyyy");
        // Record transfer timestamp (date)
        score.setDate(sdf.format(new Date()));
        // Timestamp for exam
        score.setExamDate(sdf.format(participation.getEnded()));

        score.setCourseImplementation(exam.getCourse().getCourseImplementation());
        score.setCourseUnitCode(exam.getCourse().getCode());
        score.setCourseUnitLevel(exam.getCourse().getLevel());
        score.setCourseUnitType(exam.getCourse().getCourseUnitType());
        score.setCreditLanguage(exam.getAnswerLanguage());
        score.setCreditType(exam.getCreditType());
        score.setIdentifier(exam.getCourse().getIdentifier());
        score.setGradeScale(exam.getGrading());
        score.setStudentGrade(exam.getGrade());

        score.save();
        record.setExamScore(score);
        record.save();

        DynamicForm df = Form.form().bindFromRequest();
        boolean sendFeedback = Boolean.parseBoolean(df.get("sendFeedback"));

        if(sendFeedback) {
            EmailComposer.composeInspectionReady(exam.getCreator(), UserController.getLoggedUser(), exam);
        }

        return ok();
    }

    private static String getAttribute(String attrName, List<HakaAttribute> attrs) {

        for (HakaAttribute ha : attrs) {

            if (ha.getKey().equals(attrName)) {
                return ha.getValue();
            }
        }
        return null;
    }
}
