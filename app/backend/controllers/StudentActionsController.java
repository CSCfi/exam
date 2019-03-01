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


import java.io.IOException;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;
import javax.inject.Inject;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.FetchConfig;
import io.ebean.text.PathProperties;
import org.joda.time.DateTime;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;

import backend.controllers.iop.collaboration.impl.CollaborationController;
import backend.impl.ExternalCourseHandler;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamExecutionType;
import backend.models.ExamParticipation;
import backend.models.User;
import backend.models.api.CountsAsTrial;
import backend.models.json.CollaborativeExam;
import backend.sanitizers.Attrs;
import backend.security.Authenticated;
import backend.system.interceptors.SensitiveDataPolicy;
import backend.util.config.ConfigUtil;
import backend.util.datetime.DateTimeUtils;

@SensitiveDataPolicy(sensitiveFieldNames = {"score", "defaultScore", "correctOption"})
@Restrict({@Group("STUDENT")})
public class StudentActionsController extends CollaborationController {

    private static final boolean PERM_CHECK_ACTIVE = ConfigUtil.isEnrolmentPermissionCheckActive();

    @Inject
    private ExternalCourseHandler externalCourseHandler;

    @Authenticated
    public Result getExamFeedback(Long id, Http.Request request) {
        Exam exam = Ebean.find(Exam.class)
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
            return notFound("sitnet_error_exam_not_found");
        }
        return ok(exam);
    }

    @Authenticated
    public Result getExamScore(Long eid, Http.Request request) {
        Exam exam = Ebean.find(Exam.class)
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
            return notFound("sitnet_error_exam_not_found");
        }
        exam.setMaxScore();
        exam.setApprovedAnswerCount();
        exam.setRejectedAnswerCount();
        exam.setTotalScore();
        PathProperties pp = PathProperties.parse("(*)");
        return ok(exam, pp);
    }

    private Set<ExamEnrolment> getNoShows(User user, String filter) {
        ExpressionList<ExamEnrolment> noShows = Ebean.find(ExamEnrolment.class)
                .fetch("exam", "id, state, name")
                .fetch("exam.course", "code, name")
                .fetch("exam.examOwners", "firstName, lastName, id")
                .fetch("exam.examInspections.user", "firstName, lastName, id")
                .fetch("reservation")
                .where()
                .eq("user", user)
                .isNull("exam.parent")
                .eq("reservation.noShow", true);
        if (filter != null) {
            String condition = String.format("%%%s%%", filter);
            noShows = noShows.disjunction()
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
        ExpressionList<ExamParticipation> query = Ebean.find(ExamParticipation.class)
                .select("ended")
                .fetch("exam", "id, state, name, autoEvaluationNotified, anonymous")
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
        Set<ExamParticipation> participations = query.findSet();
        Set<ExamEnrolment> noShows = getNoShows(user, filter.orElse(null));
        Set<CountsAsTrial> trials = new HashSet<>();
        trials.addAll(participations);
        trials.addAll(noShows);
        return ok(trials);
    }

    @Authenticated
    public CompletionStage<Result> getEnrolment(Long eid, Http.Request request) throws IOException {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("externalExam")
                .fetch("collaborativeExam")
                .fetch("exam.course", "name, code")
                .fetch("exam.examOwners", "firstName, lastName", new FetchConfig().query())
                .fetch("exam.examInspections", new FetchConfig().query())
                .fetch("exam.examInspections.user", "firstName, lastName")
                .fetch("user", "id")
                .fetch("reservation", "startAt, endAt")
                .fetch("reservation.machine", "name")
                .fetch("reservation.machine.room", "name, roomCode, localTimezone, roomInstruction, roomInstructionEN, roomInstructionSV")
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
                        "roomInstruction, roomInstructionEN, roomInstructionSV))))"
        );
        if (enrolment.getCollaborativeExam() != null) {
            // Collaborative exam, we need to download
            return downloadExam(enrolment.getCollaborativeExam()).thenComposeAsync(result -> {
                if (result.isPresent()) {
                    // Bit of a hack so that we can pass the external exam as an ordinary one so the UI does not need to care
                    // Works in this particular use case
                    Exam exam = result.get();
                    enrolment.setExam(exam);
                    return wrapAsPromise(ok(enrolment, pp));
                } else {
                    return wrapAsPromise(notFound());
                }
            });
        }
        if (enrolment.getExternalExam() == null) {
            return wrapAsPromise(ok(enrolment, pp));
        } else {
            // Bit of a hack so that we can pass the external exam as an ordinary one so the UI does not need to care
            // Works in this particular use case
            Exam exam = enrolment.getExternalExam().deserialize();
            enrolment.setExternalExam(null);
            enrolment.setExam(exam);
            return wrapAsPromise(ok(enrolment, pp));
        }
    }

    @Authenticated
    public Result getEnrolmentsForUser(Http.Request request) {
        DateTime now = DateTimeUtils.adjustDST(new DateTime());
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("collaborativeExam")
                .fetch("exam.executionType")
                .fetch("exam.course", "name, code")
                .fetch("exam.examLanguages")
                .fetch("exam.examOwners", "firstName, lastName")
                .fetch("exam.examInspections.user", "firstName, lastName")
                .fetch("reservation", "startAt, endAt, externalRef")
                .fetch("reservation.externalReservation")
                .fetch("reservation.optionalSections")
                .fetch("reservation.optionalSections.examMaterials")
                .fetch("reservation.machine", "name")
                .fetch("reservation.machine.room", "name, roomCode, localTimezone, " +
                        "roomInstruction, roomInstructionEN, roomInstructionSV")
                .where()
                .eq("user", user)
                .disjunction()
                .gt("reservation.endAt", now.toDate())
                .isNull("reservation")
                .endJunction()
                .findList();
        return ok(enrolments.stream().filter(ee -> {
            Exam exam = ee.getExam();
            if (exam != null) {
                return exam.getExamActiveEndDate().isAfterNow() && exam.hasState(Exam.State.PUBLISHED, Exam.State.STUDENT_STARTED);
            }
            CollaborativeExam ce = ee.getCollaborativeExam();
            return ce != null && ce.getExamActiveEndDate().isAfterNow();
        }).collect(Collectors.toList()));
    }

    @Authenticated
    public Result getExamInfo(Long eid, Http.Request request) {
        Exam exam = Ebean.find(Exam.class)
                .fetch("course", "code, name")
                .fetch("examSections")
                .fetch("examSections.examMaterials")
                .where()
                .idEq(eid)
                .eq("state", Exam.State.PUBLISHED)
                .eq("examEnrolments.user", request.attrs().get(Attrs.AUTHENTICATED_USER))
                .findOne();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        return ok(exam);
    }

    @Authenticated
    public CompletionStage<Result> listAvailableExams(final Optional<String> filter, Http.Request request)
            throws IOException {
        if (!PERM_CHECK_ACTIVE) {
            return wrapAsPromise(listExams(filter.orElse(null), Collections.emptyList()));
        }
        return externalCourseHandler.getPermittedCourses(request.attrs().get(Attrs.AUTHENTICATED_USER))
                .thenApplyAsync(codes -> {
                    if (codes.isEmpty()) {
                        return ok(Json.toJson(Collections.<Exam>emptyList()));
                    } else {
                        return listExams(filter.orElse(null), codes);
                    }
                }).exceptionally(throwable -> internalServerError(throwable.getMessage()));
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
