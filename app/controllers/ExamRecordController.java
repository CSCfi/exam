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

public class ExamRecordController extends SitnetController {

    // Do not update anything else but state to GRADED_LOGGED regarding the exam
    // Instead assure that all required exam fields are set
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result addExamRecord() {
        DynamicForm df = Form.form().bindFromRequest();
        Exam exam = Ebean.find(Exam.class, Long.parseLong(df.get("id")));
        Result failure = validateExamState(exam);
        if (failure != null) {
            return failure;
        }
        exam.setState(Exam.State.GRADED_LOGGED.toString());
        exam.update();

        ExamParticipation participation = Ebean.find(ExamParticipation.class)
                .fetch("user")
                .where()
                .eq("exam.id", exam.getId())
                .findUnique();

        ExamRecord record = createRecord(exam, participation);
        ExamScore score = createScore(record, df.get("additionalInfo"), participation.getEnded());
        score.save();
        record.setExamScore(score);
        record.save();

        if (Boolean.parseBoolean(df.get("sendFeedback"))) {
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

    private static Result validateExamState(Exam exam) {
        if (exam == null) {
            return notFound();
        }
        User user = UserController.getLoggedUser();
        if (!exam.getParent().isCreatedBy(user) && !user.hasRole("ADMIN")) {
            return forbidden("You are not allowed to modify this object");
        }
        if (exam.getGrade() == null || exam.getCreditType() == null || exam.getAnswerLanguage() == null ||
                exam.getGradedByUser() == null) {
            return forbidden("not yet graded by anyone!");
        }
        if (exam.getState().equals(Exam.State.GRADED_LOGGED.name())) {
            return forbidden("sitnet_error_exam_already_graded_logged");
        }
        return null;
    }

    private static ExamRecord createRecord(Exam exam, ExamParticipation participation) {
        User student = participation.getUser();
        User teacher = exam.getGradedByUser();
        ExamRecord record = new ExamRecord();
        record.setExam(exam);
        record.setStudent(student);
        record.setTeacher(teacher);
        record.setTimeStamp(new Date());
        return record;
    }

    private static ExamScore createScore(ExamRecord record, String info, Date examDate) {
        Exam exam = record.getExam();
        ExamScore score = new ExamScore();
        score.setAdditionalInfo(info);
        score.setStudent(record.getStudent().getEppn());
        score.setStudentId(record.getStudent().getUserIdentifier());
        if (exam.getCustomCredit() == null) {
            score.setCredits(exam.getCourse().getCredits().toString());
        } else {
            score.setCredits(exam.getCustomCredit().toString());
        }
        score.setExamScore(exam.getTotalScore().toString());
        score.setLecturer(record.getTeacher().getEppn());
        score.setLecturerId(record.getTeacher().getUserIdentifier());
        score.setLecturerEmployeeNumber(record.getTeacher().getEmployeeNumber());

        SimpleDateFormat sdf = new SimpleDateFormat("ddMMyyyy");
        // Record transfer timestamp (date)
        score.setDate(sdf.format(new Date()));
        // Timestamp for exam
        score.setExamDate(sdf.format(examDate));

        score.setCourseImplementation(exam.getCourse().getCourseImplementation());
        score.setCourseUnitCode(exam.getCourse().getCode());
        score.setCourseUnitLevel(exam.getCourse().getLevel());
        score.setCourseUnitType(exam.getCourse().getCourseUnitType());
        score.setCreditLanguage(exam.getAnswerLanguage());
        score.setCreditType(exam.getCreditType().getType());
        score.setIdentifier(exam.getCourse().getIdentifier());
        score.setGradeScale(exam.getGradeScale().getDescription());
        score.setStudentGrade(exam.getGrade().getName());
        return score;
    }

}
