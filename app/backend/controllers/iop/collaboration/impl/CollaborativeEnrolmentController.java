package backend.controllers.iop.collaboration.impl;

import java.net.URL;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Collectors;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import io.ebean.text.PathProperties;
import io.vavr.control.Either;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;

import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamExecutionType;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.sanitizers.Attrs;
import backend.security.Authenticated;
import backend.util.datetime.DateTimeUtils;

public class CollaborativeEnrolmentController extends CollaborationController {

    private static final Logger.ALogger logger = Logger.of(CollaborativeEnrolmentController.class);

    private boolean isEnrollable(Exam exam) {
        return exam.getState() == Exam.State.PUBLISHED &&
                exam.getExecutionType().getType().equals(ExamExecutionType.Type.PUBLIC.toString()) &&
                exam.getExamActiveEndDate().isAfterNow();
    }

    private Either<Result, Exam> checkExam(Exam exam, User user) {
        if (exam == null || !isEnrollable(exam)) {
            return Either.left(notFound("sitnet_error_exam_not_found"));
        }
        if (!isAllowedToParticipate(exam, user)) {
            return Either.left(forbidden("sitnet_no_trials_left"));
        }
        return Either.right(exam);

    }

    @Restrict({@Group("STUDENT")})
    public CompletionStage<Result> listExams() {
        Optional<URL> url = parseUrl();
        if (url.isEmpty()) {
            return wrapAsPromise(internalServerError());
        }

        WSRequest request = wsClient.url(url.get().toString());
        Function<WSResponse, Result> onSuccess = response -> findExamsToProcess(response).map(items -> {
            List<Exam> exams = items.entrySet().stream().map(e -> e.getKey().getExam(e.getValue()))
                    .filter(this::isEnrollable).collect(Collectors.toList());

            return ok(exams, PathProperties.parse(
                    "(examOwners(firstName, lastName), examInspections(user(firstName, lastName))" +
                            "examLanguages(code, name), id, name, examActiveStartDate, examActiveEndDate, " +
                            "enrollInstruction)"));
        }).getOrElseGet(Function.identity());
        return request.get().thenApplyAsync(onSuccess);
    }

    @Restrict({@Group("STUDENT")})
    public CompletionStage<Result> searchExams(final Optional<String> filter) {

        if(filter.isEmpty() || filter.get().isEmpty()) {
            return wrapAsPromise(badRequest());
        }

        Optional<URL> url = parseUrlWithSearchParam(filter.get());
        if (url.isEmpty()) {
            return wrapAsPromise(internalServerError());
        }

        WSRequest request = wsClient.url(url.get().toString());
        Function<WSResponse, Result> onSuccess = response -> findExamsToProcess(response).map(items -> {
            List<Exam> exams = items.entrySet().stream().map(e -> e.getKey().getExam(e.getValue()))
                    .filter(this::isEnrollable).collect(Collectors.toList());

            return ok(exams, PathProperties.parse(
                    "(examOwners(firstName, lastName), examInspections(user(firstName, lastName))" +
                            "examLanguages(code, name), id, name, examActiveStartDate, examActiveEndDate, " +
                            "enrollInstruction)"));
        }).getOrElseGet(Function.identity());
        return request.get().thenApplyAsync(onSuccess);
    }

    @Authenticated
    @Restrict({@Group("STUDENT")})
    public CompletionStage<Result> checkIfEnrolled(Long id, Http.Request request) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return downloadExam(ce).thenApplyAsync(
                result -> checkExam(result.orElse(null), user)
                        .map(e -> {
                            DateTime now = DateTimeUtils.adjustDST(new DateTime());
                            List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                                    .where()
                                    .eq("user", user)
                                    .eq("collaborativeExam.id", id)
                                    .disjunction()
                                    .gt("reservation.endAt", now.toDate())
                                    .isNull("reservation")
                                    .endJunction()
                                    .or()
                                    .isNull("exam")
                                    .eq("exam.state", Exam.State.STUDENT_STARTED)
                                    .endOr()
                                    .findList();

                            if (enrolments.isEmpty()) {
                                return notFound("error not found");
                            }
                            return ok(enrolments);
                        })
                        .getOrElseGet(Function.identity())
        );
    }

    private static ExamEnrolment makeEnrolment(CollaborativeExam exam, User user) {
        ExamEnrolment enrolment = new ExamEnrolment();
        enrolment.setEnrolledOn(DateTime.now());
        enrolment.setUser(user);
        enrolment.setCollaborativeExam(exam);
        enrolment.save();
        return enrolment;
    }

    private Optional<Result> handleFutureReservations(List<ExamEnrolment> enrolments, User user, CollaborativeExam ce) {
        List<ExamEnrolment> enrolmentsWithFutureReservations = enrolments.stream()
                .filter(ee -> ee.getReservation().toInterval().isAfterNow())
                .collect(Collectors.toList());
        if (enrolmentsWithFutureReservations.size() > 1) {
            logger.error("Several enrolments with future reservations found for user {} and collab exam {}",
                    user, ce.getId());
            return Optional.of(internalServerError()); // Lets fail right here
        }
        // reservation in the future, replace it
        if (!enrolmentsWithFutureReservations.isEmpty()) {
            enrolmentsWithFutureReservations.get(0).delete();
            ExamEnrolment newEnrolment = makeEnrolment(ce, user);
            return Optional.of(ok(newEnrolment));
        }
        return Optional.empty();
    }

    private Result doCreateEnrolment(CollaborativeExam ce, User user) {
        // Begin manual transaction
        Ebean.beginTransaction();
        try {
            // Take pessimistic lock for user to prevent multiple enrolments creating.
            Ebean.find(User.class).forUpdate().where().eq("id", user.getId()).findOne();

            List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                    .fetch("reservation")
                    .where()
                    .eq("user.id", user.getId())
                    .eq("collaborativeExam.id", ce.getId())
                    .findList();
            // already enrolled
            if (enrolments.stream().anyMatch(e -> e.getReservation() == null)) {
                return forbidden("sitnet_error_enrolment_exists");
            }
            // reservation in effect
            if (enrolments.stream().map(ExamEnrolment::getReservation).anyMatch(r ->
                    r.toInterval().contains(DateTimeUtils.adjustDST(DateTime.now(), r)))) {
                return forbidden("sitnet_reservation_in_effect");
            }
            return handleFutureReservations(enrolments, user, ce).orElseGet(() -> {
                ExamEnrolment newEnrolment = makeEnrolment(ce, user);
                Ebean.commitTransaction();
                return ok(newEnrolment);
            });
        } finally {
            // End transaction to release lock.
            Ebean.endTransaction();
        }
    }

    @Authenticated
    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public CompletionStage<Result> createEnrolment(Long id, Http.Request request) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return downloadExam(ce).thenApplyAsync(
                result -> {
                    if (result.isEmpty()) {
                        return notFound("sitnet_error_exam_not_found");
                    }
                    Exam exam = result.get();
                    if (!isEnrollable(exam)) {
                        return notFound("sitnet_error_exam_not_found");
                    }
                    if (isAllowedToParticipate(exam, user)) {
                        return doCreateEnrolment(ce, user);
                    }
                    return forbidden();
                });

    }

}
