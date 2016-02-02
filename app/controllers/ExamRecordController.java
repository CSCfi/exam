package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.ning.http.util.Base64;
import models.*;
import models.dto.ExamScore;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.java.CsvBuilder;
import util.java.EmailComposer;
import util.java.ExcelBuilder;

import javax.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static util.java.AttachmentUtils.setData;

public class ExamRecordController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;

    // Do not update anything else but state to GRADED_LOGGED regarding the exam
    // Instead assure that all required exam fields are set
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addExamRecord() throws IOException {
        DynamicForm df = Form.form().bindFromRequest();
        final Exam exam = Ebean.find(Exam.class)
                .fetch("parent")
                .fetch("parent.creator")
                .fetch("examSections.sectionQuestions.question")
                .where()
                .idEq(Long.parseLong(df.get("id")))
                .findUnique();
        Result failure = validateExamState(exam);
        if (failure != null) {
            return failure;
        }
        exam.setState(Exam.State.GRADED_LOGGED);
        exam.update();

        ExamParticipation participation = Ebean.find(ExamParticipation.class)
                .fetch("user")
                .where()
                .eq("exam.id", exam.getId())
                .findUnique();

        ExamRecord record = createRecord(exam, participation);
        ExamScore score = createScore(record, participation.getEnded());
        score.save();
        record.setExamScore(score);
        record.save();
        final User user = getLoggedUser();
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            emailComposer.composeInspectionReady(exam.getCreator(), user, exam);
            Logger.info("Inspection ready notification email sent");
        }, actor.dispatcher());
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result exportExamRecordsAsCsv(Long startDate, Long endDate) {
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

    private static List<Long> getChildIds() {
        String[] ids = request().queryString().get("childIds");
        List<Long> childIds = new ArrayList<>();
        if (ids != null) {
            for (String s : ids) {
                childIds.add(Long.parseLong(s));
            }
        }
        return childIds;
    }

    private static Result sendFile(File file) {
        response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");
        String content = Base64.encode(setData(file).toByteArray());
        if (!file.delete()) {
            Logger.warn("Failed to delete temporary file {}", file.getAbsolutePath());
        }
        return ok(content);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result exportSelectedExamRecordsAsCsv(Long examId) {
        List<Long> childIds = getChildIds();
        File file;
        try {
            file = CsvBuilder.build(examId, childIds);
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_csv_file");
        }
        return sendFile(file);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result exportSelectedExamRecordsAsExcel(Long examId) {
        List<Long> childIds = getChildIds();
        ByteArrayOutputStream bos;
        try {
            bos = ExcelBuilder.build(examId, childIds);
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_csv_file");
        }
        response().setHeader("Content-Disposition", "attachment; filename=\"exam_records.xlsx\"");
        return ok(Base64.encode(bos.toByteArray()));
    }

    private Result validateExamState(Exam exam) {
        if (exam == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (!exam.getParent().isOwnedOrCreatedBy(user) && !user.hasRole("ADMIN", getSession())) {
            return forbidden("You are not allowed to modify this object");
        }
        if (exam.getGrade() == null || exam.getCreditType() == null || exam.getAnswerLanguage() == null ||
                exam.getGradedByUser() == null) {
            return forbidden("not yet graded by anyone!");
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) ||
                exam.getExamRecord() != null) {
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

    //FIXME: exam's answerLanguage should be a FK to Language. In the mean time lets have this hack in place.
    private static String getLanguageCode(String language) {
        String code;
        switch (language.toLowerCase()) {
            case "fi":
            case "suomi":
            case "finska":
            case "finnish":
                code = "fi";
                break;
            case "en":
            case "englanti":
            case "engelska":
            case "english":
                code = "en";
                break;
            case "sv":
            case "ruotsi":
            case "svenska":
            case "swedish":
                code = "sv";
                break;
            default:
                code = "en";
        }
        return code;
    }

    private static ExamScore createScore(ExamRecord record, Date examDate) {
        Exam exam = record.getExam();
        ExamScore score = new ExamScore();
        score.setAdditionalInfo(exam.getAdditionalInfo());
        score.setStudent(record.getStudent().getEppn());
        score.setStudentId(record.getStudent().getUserIdentifier());
        if (exam.getCustomCredit() == null) {
            score.setCredits(exam.getCourse().getCredits().toString());
        } else {
            score.setCredits(exam.getCustomCredit().toString());
        }
        score.setExamScore(Double.toString(exam.getTotalScore()));
        score.setLecturer(record.getTeacher().getEppn());
        score.setLecturerId(record.getTeacher().getUserIdentifier());
        score.setLecturerEmployeeNumber(record.getTeacher().getEmployeeNumber());

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
        // Record transfer timestamp (date)
        score.setRegistrationDate(sdf.format(new Date()));
        score.setExamDate(sdf.format(examDate));

        score.setCourseImplementation(exam.getCourse().getCourseImplementation());
        score.setCourseUnitCode(exam.getCourse().getCode());
        score.setCourseUnitLevel(exam.getCourse().getLevel());
        score.setCourseUnitType(exam.getCourse().getCourseUnitType());
        score.setCreditLanguage(getLanguageCode(exam.getAnswerLanguage()));
        score.setCreditType(exam.getCreditType().getType());
        score.setIdentifier(exam.getCourse().getIdentifier());
        GradeScale scale = exam.getGradeScale() == null ? exam.getCourse().getGradeScale() : exam.getGradeScale();
        if (scale.getExternalRef() != null) {
            score.setGradeScale(scale.getExternalRef().toString());
        } else {
            score.setGradeScale(scale.getDescription());
        }
        score.setStudentGrade(exam.getGrade().getName());
        return score;
    }

}
