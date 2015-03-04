package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamParticipation;
import models.ExamRecord;
import models.User;
import models.dto.ExamScore;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.mvc.Result;
import util.java.CsvBuilder;
import util.java.EmailComposer;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;

import static util.java.AttachmentUtils.setData;

/**
 * Created by alahtinen on 02/09/14.
 */
public class ExamRecordController extends SitnetController {


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result addExamRecord() {

        Exam form = Form.form(Exam.class).bindFromRequest(
                "id",
                "state",
                "grade",
                "customCredit",
                "totalScore",
                "creditType",
                "answerLanguage",
                "additionalInfo")
                .get();

        Exam exam = Ebean.find(Exam.class, form.getId());
//        if (!SitnetUtil.isOwner(ex) || !UserController.getLoggedUser().hasRole("ADMIN"))
//            return forbidden("You are not allowed to modify this object");
        // if this exam is already logged exit.
        if (exam.getState().equals(Exam.State.GRADED_LOGGED.name())) {
            return forbidden("sitnet_error_exam_already_graded_logged");
        }

        exam.setState(form.getState());
        exam.setGrade(form.getGrade());
        exam.setGradedByUser(UserController.getLoggedUser());
        exam.setCustomCredit(form.getCustomCredit());
        exam.setTotalScore(form.getTotalScore());
        exam.setCreditType(form.getCreditType());
        exam.setAnswerLanguage(form.getAnswerLanguage());
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
        record.setTimeStamp(new Date());

        DynamicForm df = Form.form().bindFromRequest();

        String additionalInfo = df.get("additionalInfo");

        ExamScore score = new ExamScore();

        score.setAdditionalInfo(additionalInfo);
        score.setStudent(student.getEppn());
        score.setStudentId(student.getUserIdentifier());
        if(exam.getCustomCredit() == null) {
            score.setCredits(exam.getCourse().getCredits().toString());
        } else {
            score.setCredits(exam.getCustomCredit().toString());
        }
        score.setExamScore(exam.getTotalScore().toString());

        score.setLecturer(teacher.getEppn());
        score.setLecturerId(teacher.getUserIdentifier());
        score.setLecturerEmployeeNumber(teacher.getEmployeeNumber());

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

        boolean sendFeedback = Boolean.parseBoolean(df.get("sendFeedback"));

        if (sendFeedback) {
            try {
                EmailComposer.composeInspectionReady(exam.getCreator(), UserController.getLoggedUser(), exam);
            } catch (IOException e) {
                Logger.error("Failure to access message template on disk", e);
            }
        }

        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result exportExamRecordsAsCsv(Long startDate, Long endDate) {
        File file;
        try {
            file = CsvBuilder.build(startDate, endDate);
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_csv_file");
        }
        response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");
        String content = com.ning.http.util.Base64.encode(setData(file).toByteArray());
        if (!file.delete()) {
            Logger.warn("Failed to delete temporary file {}", file.getAbsolutePath());
        }
        return ok(content);
    }

}
