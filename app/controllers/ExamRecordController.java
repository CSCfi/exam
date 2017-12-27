/*
 * Copyright (c) 2017 Exam Consortium
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

package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import impl.EmailComposer;
import io.ebean.Ebean;
import models.*;
import models.dto.ExamScore;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Logger;
import play.data.DynamicForm;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.ExamRecordSanitizer;
import scala.concurrent.duration.Duration;
import util.CsvBuilder;
import util.ExcelBuilder;

import javax.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.util.Base64;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;


public class ExamRecordController extends BaseController {

    protected final EmailComposer emailComposer;

    protected final ActorSystem actor;

    @Inject
    public ExamRecordController(EmailComposer emailComposer, ActorSystem actor) {
        this.emailComposer = emailComposer;
        this.actor = actor;
    }

    // Do not update anything else but state to GRADED_LOGGED regarding the exam
    // Instead assure that all required exam fields are set
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addExamRecord() throws IOException {
        DynamicForm df = formFactory.form().bindFromRequest();
        final Exam exam = Ebean.find(Exam.class)
                .fetch("parent")
                .fetch("parent.creator")
                .fetch("examSections.sectionQuestions.question")
                .where()
                .idEq(Long.parseLong(df.get("id")))
                .findUnique();
        return validateExamState(exam, true).orElseGet(() -> {
            exam.setState(Exam.State.GRADED_LOGGED);
            exam.update();
            ExamParticipation participation = Ebean.find(ExamParticipation.class)
                    .fetch("user")
                    .where()
                    .eq("exam.id", exam.getId())
                    .findUnique();
            if (participation == null) {
                return notFound();
            }

            ExamRecord record = createRecord(exam, participation);
            ExamScore score = createScore(record, participation.getEnded());
            score.save();
            record.setExamScore(score);
            record.save();
            final User user = getLoggedUser();
            final Set<User> examinators = exam.getExecutionType().getType().equals(
                    ExamExecutionType.Type.MATURITY.toString())
                    ? exam.getParent().getExamOwners() : Collections.emptySet();
            actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
                emailComposer.composeInspectionReady(exam.getCreator(), user, exam, examinators);
                Logger.info("Inspection ready notification email sent");
            }, actor.dispatcher());
            return ok();
        });
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result registerExamWithoutRecord() throws IOException {
        DynamicForm df = formFactory.form().bindFromRequest();
        final Exam exam = Ebean.find(Exam.class)
                .fetch("languageInspection")
                .fetch("parent")
                .fetch("parent.creator")
                .where()
                .idEq(Long.parseLong(df.get("id"))).findUnique();
        return validateExamState(exam, false).orElseGet(() -> {
            exam.setState(Exam.State.GRADED_LOGGED);
            exam.setGrade(null);
            exam.setGradeless(true);
            exam.update();
            return ok();
        });
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
        String content = Base64.getEncoder().encodeToString(setData(file).toByteArray());
        if (!file.delete()) {
            Logger.warn("Failed to delete temporary file {}", file.getAbsolutePath());
        }
        return ok(content);
    }

    private Result sendFile(File file) {
        response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");
        String content = Base64.getEncoder().encodeToString(setData(file).toByteArray());
        if (!file.delete()) {
            Logger.warn("Failed to delete temporary file {}", file.getAbsolutePath());
        }
        return ok(content);
    }

    @With(ExamRecordSanitizer.class)
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result exportSelectedExamRecordsAsCsv(Long examId) {
        Collection<Long> childIds = request().attrs().get(Attrs.ID_COLLECTION);
        File file;
        try {
            file = CsvBuilder.build(examId, childIds);
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_csv_file");
        }
        return sendFile(file);
    }

    @With(ExamRecordSanitizer.class)
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result exportSelectedExamRecordsAsExcel(Long examId) {
        Collection<Long> childIds = request().attrs().get(Attrs.ID_COLLECTION);
        ByteArrayOutputStream bos;
        try {
            bos = ExcelBuilder.build(examId, childIds);
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_csv_file");
        }
        response().setHeader("Content-Disposition", "attachment; filename=\"exam_records.xlsx\"");
        return ok(Base64.getEncoder().encodeToString(bos.toByteArray()));
    }

    private boolean isApprovedInLanguageInspection(Exam exam, User user) {
        LanguageInspection li = exam.getLanguageInspection();
        return li != null && li.getApproved() && li.getFinishedAt() != null &&
                user.hasPermission(Permission.Type.CAN_INSPECT_LANGUAGE);
    }

    private boolean isAllowedToRegister(Exam exam, User user) {
        return exam.getParent().isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession()) ||
                isApprovedInLanguageInspection(exam, user);
    }

    private Optional<Result> validateExamState(Exam exam, boolean gradeRequired) {
        if (exam == null) {
            return Optional.of(notFound());
        }
        User user = getLoggedUser();
        if (!isAllowedToRegister(exam, user)) {
            return Optional.of(forbidden("You are not allowed to modify this object"));
        }
        if (exam.getGradedByUser() == null && exam.getAutoEvaluationConfig() != null) {
            // Automatically graded by system, set graded by user at this point.
            exam.setGradedByUser(user);
        }
        if ((exam.getGrade() == null && gradeRequired) || exam.getCreditType() == null || exam.getAnswerLanguage() == null ||
                exam.getGradedByUser() == null) {
            return Optional.of(forbidden("not yet graded by anyone!"));
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) ||
                exam.getExamRecord() != null) {
            return Optional.of(forbidden("sitnet_error_exam_already_graded_logged"));
        }
        return Optional.empty();
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

    private static ExamScore createScore(ExamRecord record, DateTime examDate) {
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
        score.setLecturerFirstName(record.getTeacher().getFirstName());
        score.setLecturerLastName(record.getTeacher().getLastName());

        DateTimeFormatter dtf = DateTimeFormat.forPattern("yyyy-MM-dd");
        // Record transfer timestamp (date)
        score.setRegistrationDate(dtf.print(DateTime.now()));
        score.setExamDate(dtf.print(examDate));

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
        Organisation organisation = exam.getCourse().getOrganisation();
        score.setInstitutionName(organisation == null ? null : organisation.getName());
        return score;
    }

}
