// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.enrolment;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.iop.collaboration.impl.CollaborationController;
import impl.ExternalCourseHandler;
import io.ebean.DB;
import io.ebean.ExpressionList;
import io.ebean.FetchConfig;
import io.ebean.Model;
import io.ebean.text.PathProperties;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import miscellaneous.config.ByodConfigHandler;
import miscellaneous.config.ConfigReader;
import miscellaneous.excel.ExcelBuilder;
import miscellaneous.file.FileHandler;
import miscellaneous.user.UserHandler;
import models.enrolment.ExamEnrolment;
import models.enrolment.ExamParticipation;
import models.enrolment.ExaminationEventConfiguration;
import models.exam.Exam;
import models.exam.ExamExecutionType;
import models.user.User;
import org.joda.time.DateTime;
import play.i18n.MessagesApi;
import play.libs.Json;
import play.libs.concurrent.ClassLoaderExecutionContext;
import play.mvc.Http;
import play.mvc.Result;
import repository.EnrolmentRepository;
import sanitizers.Attrs;
import scala.jdk.javaapi.CollectionConverters;
import scala.jdk.javaapi.FutureConverters;
import security.Authenticated;
import system.interceptors.SensitiveDataPolicy;

@SensitiveDataPolicy(sensitiveFieldNames = { "score", "defaultScore", "correctOption" })
@Restrict({ @Group("STUDENT") })
public class StudentActionsController extends CollaborationController {

    private final boolean permCheckActive;
    private final ClassLoaderExecutionContext ec;
    private final ExternalCourseHandler externalCourseHandler;
    private final EnrolmentRepository enrolmentRepository;
    private final ByodConfigHandler byodConfigHandler;
    private final UserHandler userHandler;
    private final FileHandler fileHandler;
    private final ExcelBuilder excelBuilder;
    private final MessagesApi messagesApi;
    private static final String XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @Inject
    public StudentActionsController(
        ClassLoaderExecutionContext ec,
        ExternalCourseHandler courseHandler,
        EnrolmentRepository enrolmentRepository,
        ConfigReader configReader,
        ByodConfigHandler byodConfigHandler,
        UserHandler userHandler,
        FileHandler fileHandler,
        ExcelBuilder excelBuilder,
        MessagesApi messagesApi
    ) {
        this.ec = ec;
        this.externalCourseHandler = courseHandler;
        this.enrolmentRepository = enrolmentRepository;
        this.byodConfigHandler = byodConfigHandler;
        this.userHandler = userHandler;
        this.fileHandler = fileHandler;
        this.excelBuilder = excelBuilder;
        this.permCheckActive = configReader.isEnrolmentPermissionCheckActive();
        this.messagesApi = messagesApi;
    }

    @Authenticated
    public Result getExamFeedback(Long id, Http.Request request) {
        Exam exam = DB.find(Exam.class)
            .fetch("creator", "firstName, lastName, email")
            .fetch("course", "code, name, credits")
            .fetch("grade")
            .fetch("creditType", "id, type, deprecated")
            .fetch("gradeScale")
            .fetch("executionType")
            .fetch("examFeedback")
            .fetch("examFeedback.attachment")
            .fetch("gradedByUser", "firstName, lastName")
            .fetch("examInspections.user", "firstName, lastName")
            .fetch("parent.examOwners", "firstName, lastName")
            .fetch("languageInspection", "approved, finishedAt")
            .fetch("languageInspection.statement")
            .fetch("languageInspection.statement.attachment")
            .where()
            .eq("id", id)
            .eq("creator", request.attrs().get(Attrs.AUTHENTICATED_USER))
            .disjunction()
            .eq("state", Exam.State.REJECTED)
            .eq("state", Exam.State.GRADED_LOGGED)
            .eq("state", Exam.State.ARCHIVED)
            .conjunction()
            .eq("state", Exam.State.GRADED)
            .isNotNull("autoEvaluationConfig")
            .isNotNull("autoEvaluationNotified")
            .endJunction()
            .endJunction()
            .findOne();
        if (exam == null) {
            return notFound("i18n_error_exam_not_found");
        }
        return ok(exam);
    }

    @Authenticated
    public Result getExamScore(Long eid, Http.Request request) {
        Exam exam = DB.find(Exam.class)
            .fetch("examSections.sectionQuestions.question")
            .where()
            .eq("id", eid)
            .eq("creator", request.attrs().get(Attrs.AUTHENTICATED_USER))
            .disjunction()
            .eq("state", Exam.State.GRADED_LOGGED)
            .eq("state", Exam.State.ARCHIVED)
            .conjunction()
            .eq("state", Exam.State.GRADED)
            .isNotNull("autoEvaluationConfig")
            .isNotNull("autoEvaluationNotified")
            .endJunction()
            .endJunction()
            .findOne();
        if (exam == null) {
            return notFound("i18n_error_exam_not_found");
        }
        exam.setMaxScore();
        exam.setApprovedAnswerCount();
        exam.setRejectedAnswerCount();
        exam.setTotalScore();
        PathProperties pp = PathProperties.parse("(*)");
        return ok(exam, pp);
    }

    @Authenticated
    public Result getExamScoreReport(Long eid, Http.Request request) {
        Exam exam = DB.find(Exam.class)
            .fetch("examParticipation.user")
            .fetch("examSections.sectionQuestions.question")
            .fetch("examSections.sectionQuestions.clozeTestAnswer")
            .where()
            .eq("id", eid)
            .eq("creator", request.attrs().get(Attrs.AUTHENTICATED_USER))
            .disjunction()
            .eq("state", Exam.State.GRADED_LOGGED)
            .eq("state", Exam.State.ARCHIVED)
            .conjunction()
            .eq("state", Exam.State.GRADED)
            .isNotNull("autoEvaluationConfig")
            .isNotNull("autoEvaluationNotified")
            .endJunction()
            .endJunction()
            .findOne();

        if (exam == null || exam.getExamParticipation() == null || exam.getExamParticipation().getUser() == null) {
            return notFound("i18n_error_exam_not_found");
        }

        User student = exam.getExamParticipation().getUser();
        ByteArrayOutputStream bos;
        try {
            bos = excelBuilder.buildStudentReport(exam, student, messagesApi);
        } catch (IOException e) {
            return internalServerError("i18n_error_creating_excel_file");
        }
        return ok(Base64.getEncoder().encodeToString(bos.toByteArray()))
            .withHeader("Content-Disposition", "attachment; filename=\"exam_records.xlsx\"")
            .as(XLSX_MIME);
    }

    private Set<ExamEnrolment> getNoShows(User user, String filter) {
        ExpressionList<ExamEnrolment> noShows = DB.find(ExamEnrolment.class)
            .fetch("exam", "id, state, name")
            .fetch("exam.course", "code, name")
            .fetch("exam.examOwners", "firstName, lastName, id")
            .fetch("exam.examInspections.user", "firstName, lastName, id")
            .fetch("reservation")
            .where()
            .eq("user", user)
            .isNull("exam.parent")
            .eq("noShow", true);
        if (filter != null) {
            String condition = String.format("%%%s%%", filter);
            noShows = noShows
                .disjunction()
                .ilike("exam.name", condition)
                .ilike("exam.course.code", condition)
                .ilike("exam.examOwners.firstName", condition)
                .ilike("exam.examOwners.lastName", condition)
                .ilike("exam.examInspections.user.firstName", condition)
                .ilike("exam.examInspections.user.lastName", condition)
                .endJunction();
        }
        return noShows.findSet();
    }

    @Authenticated
    public Result getFinishedExams(Optional<String> filter, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExpressionList<ExamParticipation> query = DB.find(ExamParticipation.class)
            .fetch("exam", "id, state, name, autoEvaluationNotified, anonymous, gradingType")
            .fetch("exam.creator", "id")
            .fetch("exam.course", "code, name")
            .fetch("exam.parent.examOwners", "firstName, lastName, id")
            .fetch("exam.examInspections.user", "firstName, lastName, id")
            .where()
            .isNotNull("exam.parent")
            .ne("exam.state", Exam.State.STUDENT_STARTED)
            .ne("exam.state", Exam.State.ABORTED)
            .ne("exam.state", Exam.State.DELETED)
            .eq("exam.creator", user);
        if (filter.isPresent()) {
            String condition = String.format("%%%s%%", filter.get());
            query = query
                .disjunction()
                .ilike("exam.name", condition)
                .ilike("exam.course.code", condition)
                .ilike("exam.parent.examOwners.firstName", condition)
                .ilike("exam.parent.examOwners.lastName", condition)
                .ilike("exam.examInspections.user.firstName", condition)
                .ilike("exam.examInspections.user.lastName", condition)
                .endJunction();
        }
        Set<ExamParticipation> participations = query.findSet();
        Set<ExamEnrolment> noShows = getNoShows(user, filter.orElse(null));
        Set<Model> trials = new HashSet<>();
        trials.addAll(participations);
        trials.addAll(noShows);
        return ok(trials);
    }

    @Authenticated
    public CompletionStage<Result> getEnrolment(Long eid, Http.Request request) throws IOException {
        ExamEnrolment enrolment = DB.find(ExamEnrolment.class)
            .fetch("exam")
            .fetch("externalExam")
            .fetch("collaborativeExam")
            .fetch("exam.course", "name, code")
            .fetch("exam.examOwners", "firstName, lastName", FetchConfig.ofQuery())
            .fetch("exam.examInspections", FetchConfig.ofQuery())
            .fetch("exam.examInspections.user", "firstName, lastName")
            .fetch("user", "id")
            .fetch("reservation", "startAt, endAt")
            .fetch("reservation.machine", "name")
            .fetch(
                "reservation.machine.room",
                "name, roomCode, localTimezone, roomInstruction, roomInstructionEN, roomInstructionSV"
            )
            .fetch("examinationEventConfiguration")
            .fetch("examinationEventConfiguration.examinationEvent")
            .where()
            .idEq(eid)
            .eq("user", request.attrs().get(Attrs.AUTHENTICATED_USER))
            .findOne();
        if (enrolment == null) {
            return wrapAsPromise(notFound());
        }
        PathProperties pp = PathProperties.parse(
            "(*, exam(*, course(name, code), examOwners(firstName, lastName), examInspections(user(firstName, lastName))), " +
            "user(id), reservation(startAt, endAt, machine(name, room(name, roomCode, localTimezone, " +
            "roomInstruction, roomInstructionEN, roomInstructionSV))), " +
            "examinationEventConfiguration(examinationEvent(*)))"
        );
        if (enrolment.getCollaborativeExam() != null) {
            // Collaborative exam, we need to download
            return downloadExam(enrolment.getCollaborativeExam()).thenComposeAsync(result -> {
                    if (result.isPresent()) {
                        // A bit of a hack so that we can pass the external exam as an ordinary one so the UI does not need to care
                        // Works in this particular use case
                        Exam exam = result.get();
                        enrolment.setExam(exam);
                        return wrapAsPromise(ok(enrolment, pp));
                    } else {
                        return wrapAsPromise(notFound());
                    }
                });
        }
        if (enrolment.getExternalExam() != null) {
            // A bit of a hack so that we can pass the external exam as an ordinary one so the UI does not need to care
            // Works in this particular use case
            Exam exam = enrolment.getExternalExam().deserialize();
            enrolment.setExternalExam(null);
            enrolment.setExam(exam);
        }
        return wrapAsPromise(ok(enrolment, pp));
    }

    @Authenticated
    public CompletionStage<Result> getEnrolmentsForUser(Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return enrolmentRepository.getStudentEnrolments(user).thenApplyAsync(this::ok, ec.current());
    }

    @Authenticated
    public Result getExamConfigFile(Long enrolmentId, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Optional<ExamEnrolment> oee = DB.find(ExamEnrolment.class)
            .where()
            .idEq(enrolmentId)
            .eq("user", user)
            .eq("exam.implementation", Exam.Implementation.CLIENT_AUTH)
            .in("exam.state", Exam.State.PUBLISHED, Exam.State.STUDENT_STARTED)
            .isNotNull("examinationEventConfiguration")
            .findOneOrEmpty();
        if (oee.isEmpty()) {
            return forbidden();
        } else {
            String examName = oee.get().getExam().getName();
            ExaminationEventConfiguration eec = oee.get().getExaminationEventConfiguration();
            String fileName = examName.replace(" ", "-");
            String quitPassword = byodConfigHandler.getPlaintextPassword(
                eec.getEncryptedQuitPassword(),
                eec.getQuitPasswordSalt()
            );
            File file;
            try {
                file = File.createTempFile(fileName, ".seb");
                FileOutputStream fos = new FileOutputStream(file);
                byte[] data = byodConfigHandler.getExamConfig(
                    eec.getHash(),
                    eec.getEncryptedSettingsPassword(),
                    eec.getSettingsPasswordSalt(),
                    quitPassword
                );
                fos.write(data);
                fos.close();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
            String contentDisposition = fileHandler.getContentDisposition(file);
            byte[] data = fileHandler.read(file);
            String body = Base64.getEncoder().encodeToString(data);
            return ok(body).withHeader("Content-Disposition", contentDisposition);
        }
    }

    @Authenticated
    public Result getExamInfo(Long eid, Http.Request request) {
        Exam exam = DB.find(Exam.class)
            .fetch("course", "code, name")
            .fetch("examSections")
            .fetch("examSections.examMaterials")
            .where()
            .idEq(eid)
            .eq("state", Exam.State.PUBLISHED)
            .eq("examEnrolments.user", request.attrs().get(Attrs.AUTHENTICATED_USER))
            .findOne();
        if (exam == null) {
            return notFound("i18n_error_exam_not_found");
        }

        return ok(exam);
    }

    @Authenticated
    public CompletionStage<Result> listAvailableExams(final Optional<String> filter, Http.Request request)
        throws IOException {
        if (!permCheckActive) {
            return wrapAsPromise(listExams(filter.orElse(null), Collections.emptyList()));
        }
        var future = externalCourseHandler.getPermittedCourses(request.attrs().get(Attrs.AUTHENTICATED_USER));
        return FutureConverters.asJava(future)
            .thenApplyAsync(codes -> {
                if (codes.isEmpty()) {
                    return ok(Json.toJson(Collections.<Exam>emptyList()));
                } else {
                    return listExams(filter.orElse(null), CollectionConverters.asJava(codes));
                }
            })
            .exceptionally(throwable -> internalServerError(throwable.getMessage()));
    }

    private Result listExams(String filter, Collection<String> courseCodes) {
        ExpressionList<Exam> query = DB.find(Exam.class)
            .select("id, name, duration, periodStart, periodEnd, enrollInstruction, implementation")
            .fetch("course", "code, name")
            .fetch("examOwners", "firstName, lastName")
            .fetch("examInspections.user", "firstName, lastName")
            .fetch("examLanguages", "code, name", FetchConfig.ofQuery())
            .fetch("creator", "firstName, lastName")
            .fetch("examinationEventConfigurations.examinationEvent")
            .where()
            .eq("state", Exam.State.PUBLISHED)
            .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString())
            .gt("periodEnd", DateTime.now().toDate());
        if (!courseCodes.isEmpty()) {
            query.in("course.code", courseCodes);
        }
        if (filter != null) {
            String condition = String.format("%%%s%%", filter);
            query = query.disjunction();
            query = userHandler.applyNameSearch("examOwners", query, filter);
            query = userHandler.applyNameSearch("examInspections.user", query, filter);
            query = query
                .ilike("name", condition)
                .ilike("course.code", condition)
                .ilike("course.name", condition)
                .endJunction();
        }
        List<Exam> exams = query
            .orderBy("course.code")
            .findList()
            .stream()
            .filter(
                e ->
                    e.getImplementation() == Exam.Implementation.AQUARIUM ||
                    e
                        .getExaminationEventConfigurations()
                        .stream()
                        .map(ExaminationEventConfiguration::getExaminationEvent)
                        .anyMatch(ee -> ee.getStart().isAfter(DateTime.now()))
            )
            .toList();
        return ok(exams);
    }
}
