/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package backend.controllers;

import akka.actor.ActorSystem;
import backend.controllers.base.BaseController;
import backend.impl.EmailComposer;
import backend.models.Exam;
import backend.models.ExamParticipation;
import backend.models.ExamRecord;
import backend.models.GradeScale;
import backend.models.LanguageInspection;
import backend.models.Organisation;
import backend.models.Permission;
import backend.models.Role;
import backend.models.User;
import backend.models.dto.ExamScore;
import backend.sanitizers.Attrs;
import backend.sanitizers.ExamRecordSanitizer;
import backend.security.Authenticated;
import backend.util.csv.CsvBuilder;
import backend.util.excel.ExcelBuilder;
import backend.util.file.FileHandler;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.util.Base64;
import java.util.Collection;
import java.util.Date;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Logger;
import play.data.DynamicForm;
import play.db.ebean.Transactional;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import scala.concurrent.duration.Duration;

public class ExamRecordController extends BaseController {
    private final EmailComposer emailComposer;

    private CsvBuilder csvBuilder;

    private FileHandler fileHandler;

    private ActorSystem actor;

    private static final String XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final Logger.ALogger logger = Logger.of(ExamRecordController.class);

    @Inject
    public ExamRecordController(
        EmailComposer emailComposer,
        CsvBuilder csvBuilder,
        FileHandler fileHandler,
        ActorSystem actor
    ) {
        this.emailComposer = emailComposer;
        this.csvBuilder = csvBuilder;
        this.fileHandler = fileHandler;
        this.actor = actor;
    }

    // Do not update anything else but state to GRADED_LOGGED regarding the exam
    // Instead assure that all required exam fields are set
    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Transactional
    public Result addExamRecord(Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
        final Optional<Exam> optionalExam = Ebean
            .find(Exam.class)
            .fetch("parent")
            .fetch("parent.creator")
            .fetch("examSections.sectionQuestions.question")
            .where()
            .idEq(Long.parseLong(df.get("id")))
            .findOneOrEmpty();
        if (optionalExam.isEmpty()) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Exam exam = optionalExam.get();
        return validateExamState(exam, true, user)
            .orElseGet(
                () -> {
                    exam.setState(Exam.State.GRADED_LOGGED);
                    exam.update();
                    ExamParticipation participation = Ebean
                        .find(ExamParticipation.class)
                        .fetch("user")
                        .where()
                        .eq("exam.id", exam.getId())
                        .findOne();
                    if (participation == null) {
                        return notFound();
                    }

                    ExamRecord record = createRecord(exam, participation);
                    ExamScore score = createScore(record, participation.getEnded());
                    score.save();
                    record.setExamScore(score);
                    record.save();
                    actor
                        .scheduler()
                        .scheduleOnce(
                            Duration.create(1, TimeUnit.SECONDS),
                            () -> {
                                emailComposer.composeInspectionReady(exam.getCreator(), user, exam);
                                logger.info("Inspection ready notification email sent to {}", user.getEmail());
                            },
                            actor.dispatcher()
                        );
                    return ok();
                }
            );
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result registerExamWithoutRecord(Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
        final Optional<Exam> optionalExam = Ebean
            .find(Exam.class)
            .fetch("languageInspection")
            .fetch("parent")
            .fetch("parent.creator")
            .where()
            .idEq(Long.parseLong(df.get("id")))
            .findOneOrEmpty();
        if (optionalExam.isEmpty()) {
            return notFound("sitnet_error_exam_not_found");
        }
        Exam exam = optionalExam.get();
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return validateExamState(exam, false, user)
            .orElseGet(
                () -> {
                    exam.setState(Exam.State.GRADED_LOGGED);
                    exam.setGrade(null);
                    exam.setGradeless(true);
                    exam.update();
                    return ok();
                }
            );
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result exportExamRecordsAsCsv(Long startDate, Long endDate) {
        File file;
        try {
            file = csvBuilder.build(startDate, endDate);
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_csv_file");
        }
        String contentDisposition = fileHandler.getContentDisposition(file);
        String content = fileHandler.encodeAndDelete(file);
        return ok(content).withHeader("Content-Disposition", contentDisposition);
    }

    @With(ExamRecordSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result exportSelectedExamRecordsAsCsv(Long examId, Http.Request request) {
        Collection<Long> childIds = request.attrs().get(Attrs.ID_COLLECTION);
        File file;
        try {
            file = csvBuilder.build(examId, childIds);
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_csv_file");
        }
        String contentDisposition = fileHandler.getContentDisposition(file);
        String content = fileHandler.encodeAndDelete(file);
        return ok(content).withHeader("Content-Disposition", contentDisposition);
    }

    @With(ExamRecordSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result exportSelectedExamRecordsAsExcel(Long examId, Http.Request request) {
        Collection<Long> childIds = request.attrs().get(Attrs.ID_COLLECTION);
        ByteArrayOutputStream bos;
        try {
            bos = ExcelBuilder.build(examId, childIds);
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_csv_file");
        }
        return ok(Base64.getEncoder().encodeToString(bos.toByteArray()))
            .withHeader("Content-Disposition", "attachment; filename=\"exam_records.xlsx\"")
            .as(XLSX_MIME);
    }

    private boolean isApprovedInLanguageInspection(Exam exam, User user) {
        LanguageInspection li = exam.getLanguageInspection();
        return (
            li != null &&
            li.getApproved() &&
            li.getFinishedAt() != null &&
            user.hasPermission(Permission.Type.CAN_INSPECT_LANGUAGE)
        );
    }

    private boolean isAllowedToRegister(Exam exam, User user) {
        return (
            exam.getParent().isOwnedOrCreatedBy(user) ||
            user.hasRole(Role.Name.ADMIN) ||
            isApprovedInLanguageInspection(exam, user)
        );
    }

    private Optional<Result> validateExamState(Exam exam, boolean gradeRequired, User user) {
        if (exam == null) {
            return Optional.of(notFound());
        }
        if (!isAllowedToRegister(exam, user)) {
            return Optional.of(forbidden("You are not allowed to modify this object"));
        }
        if (exam.getGradedByUser() == null && exam.getAutoEvaluationConfig() != null) {
            // Automatically graded by system, set graded by user at this point.
            exam.setGradedByUser(user);
        }
        if (
            (exam.getGrade() == null && gradeRequired) ||
            exam.getCreditType() == null ||
            exam.getAnswerLanguage() == null ||
            exam.getGradedByUser() == null
        ) {
            return Optional.of(forbidden("not yet graded by anyone!"));
        }
        if (
            exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) ||
            exam.getExamRecord() != null
        ) {
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
        score.setCreditLanguage(exam.getAnswerLanguage());
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
