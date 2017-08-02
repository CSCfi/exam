package controllers;


import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.FetchConfig;
import com.avaje.ebean.text.PathProperties;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.api.ExternalAPI;
import controllers.base.ActionMethod;
import controllers.base.BaseController;
import models.Exam;
import models.ExamEnrolment;
import models.ExamExecutionType;
import models.ExamInspection;
import models.ExamParticipation;
import models.User;
import org.joda.time.DateTime;
import play.libs.Json;
import play.mvc.Result;
import system.interceptors.SensitiveDataPolicy;
import util.AppUtil;

import javax.inject.Inject;
import java.net.MalformedURLException;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletionStage;

@SensitiveDataPolicy(sensitiveFieldNames = {"score", "defaultScore", "correctOption"})
@Restrict({@Group("STUDENT")})
public class StudentActionsController extends BaseController {

    private static final boolean PERM_CHECK_ACTIVE = AppUtil.isEnrolmentPermissionCheckActive();

    @Inject
    private ExternalAPI externalAPI;


    @ActionMethod
    public Result getExamFeedback(Long id) {
        Exam exam = Ebean.find(Exam.class)
                .fetch("creator", "firstName, lastName, email")
                .fetch("course", "code, name, credits")
                .fetch("grade")
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
                .eq("creator", getLoggedUser())
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
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        return ok(exam);
    }

    @ActionMethod
    public Result getExamScore(Long eid) {
        Exam exam = Ebean.find(Exam.class)
                .fetch("examSections.sectionQuestions.question")
                .where()
                .eq("id", eid)
                .eq("creator", getLoggedUser())
                .disjunction()
                .eq("state", Exam.State.GRADED_LOGGED)
                .eq("state", Exam.State.ARCHIVED)
                .conjunction()
                .eq("state", Exam.State.GRADED)
                .isNotNull("autoEvaluationConfig")
                .isNotNull("autoEvaluationNotified")
                .endJunction()
                .endJunction()
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        exam.setMaxScore();
        exam.setApprovedAnswerCount();
        exam.setRejectedAnswerCount();
        exam.setTotalScore();
        PathProperties pp  = PathProperties.parse("(*)");
        return ok(exam, pp);
    }

    @ActionMethod
    public Result getFinishedExams(Optional<String> filter) {
        User user = getLoggedUser();
        ExpressionList<ExamParticipation> query = Ebean.find(ExamParticipation.class)
                .select("ended")
                .fetch("exam", "id, state, name")
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
            query = query.disjunction()
                    .ilike("exam.name", condition)
                    .ilike("exam.course.code", condition)
                    .ilike("exam.parent.examOwners.firstName", condition)
                    .ilike("exam.parent.examOwners.lastName", condition)
                    .ilike("exam.examInspections.user.firstName", condition)
                    .ilike("exam.examInspections.user.lastName", condition)
                    .endJunction();
        }
        return ok(query.findSet());
    }

    @ActionMethod
    public Result getEnrolment(Long eid) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("exam.course", "name, code")
                .fetch("exam.examOwners", "firstName, lastName")
                .fetch("exam.examInspections.user", "firstName, lastName")
                .fetch("user", "id")
                .fetch("reservation", "startAt, endAt")
                .fetch("reservation.machine", "name")
                .fetch("reservation.machine.room", "name, roomCode, localTimezone")
                .where()
                .idEq(eid)
                .eq("user", getLoggedUser())
                .findUnique();

        // IF EXTERNAL EXAM, NO FETCHING THROUGH SQL, DESERIALIZE EXAM AND PASS AS JSON

        if (enrolment == null) {
            return notFound();
        } else {
            return ok(enrolment);
        }
    }

    @ActionMethod
    public Result getEnrolmentsForUser() {
        DateTime now = AppUtil.adjustDST(new DateTime());
        User user = getLoggedUser();
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("exam.executionType")
                .fetch("exam.course", "name, code")
                .fetch("exam.examLanguages")
                .fetch("exam.examOwners", "firstName, lastName")
                .fetch("exam.examInspections.user", "firstName, lastName")
                .fetch("reservation", "startAt, endAt, externalRef")
                .fetch("reservation.externalReservation")
                .fetch("reservation.machine", "name")
                .fetch("reservation.machine.room", "name, roomCode, localTimezone")
                .where()
                .eq("user", user)
                .gt("exam.examActiveEndDate", now.toDate())
                .disjunction()
                .gt("reservation.endAt", now.toDate())
                .isNull("reservation")
                .endJunction()
                .disjunction()
                .eq("exam.state", Exam.State.PUBLISHED)
                .eq("exam.state", Exam.State.STUDENT_STARTED)
                .endJunction()
                .findList();
        return ok(enrolments);
    }

    @ActionMethod
    public Result getReservationInstructions(Long eid) {
        Exam exam = Ebean.find(Exam.class).where().eq("id", eid).findUnique();
        if (exam == null) {
            return notFound();
        }
        ObjectNode node = Json.newObject();
        node.put("enrollInstructions", exam.getEnrollInstruction());
        return ok(Json.toJson(node));
    }

    @ActionMethod
    public Result getExamInspectors(Long id) {
        List<ExamInspection> inspections = Ebean.find(ExamInspection.class)
                .select("id")
                .fetch("user", "firstName, lastName")
                .fetch("exam", "id")
                .where()
                .eq("exam.id", id)
                .findList();

        if (inspections == null) {
            return notFound();
        } else {
            return ok(inspections);
        }
    }

    @ActionMethod
    public Result getExamInfo(Long eid) {
        Exam exam = Ebean.find(Exam.class).fetch("course", "code, name")
                .where()
                .idEq(eid)
                .eq("state", Exam.State.PUBLISHED)
                .eq("examEnrolments.user", getLoggedUser())
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        return ok(exam);
    }

    @ActionMethod
    public CompletionStage<Result> listAvailableExams(final Optional<String> filter) throws MalformedURLException {
        if (!PERM_CHECK_ACTIVE) {
            return wrapAsPromise(listExams(filter.orElse(null), Collections.emptyList()));
        }
        return externalAPI.getPermittedCourses(getLoggedUser())
                .thenApplyAsync(codes ->
                        {
                            if (codes.isEmpty()) {
                                return ok(Json.toJson(Collections.<Exam>emptyList()));
                            } else {
                                return listExams(filter.orElse(null), codes);
                            }
                        }
                ).exceptionally(throwable -> internalServerError(throwable.getMessage()));
    }

    private Result listExams(String filter, Collection<String> courseCodes) {
        ExpressionList<Exam> query = Ebean.find(Exam.class)
                .select("id, name, examActiveStartDate, examActiveEndDate, enrollInstruction")
                .fetch("course", "code, name")
                .fetch("examOwners", "firstName, lastName")
                .fetch("examInspections.user", "firstName, lastName")
                .fetch("examLanguages", "code, name", new FetchConfig().query())
                .fetch("creator", "firstName, lastName")
                .where()
                .eq("state", Exam.State.PUBLISHED)
                .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString())
                .gt("examActiveEndDate", DateTime.now().toDate());
        if (!courseCodes.isEmpty()) {
            query.in("course.code", courseCodes);
        }
        if (filter != null) {
            String condition = String.format("%%%s%%", filter);
            query = query.disjunction();
            applyUserFilter("examOwners", query, filter);
            applyUserFilter("examInspections.user", query, filter);
            query = query
                    .ilike("name", condition)
                    .ilike("course.code", condition)
                    .endJunction();
        }
        List<Exam> exams = query.orderBy("course.code").findList();
        return ok(exams);
    }




}
