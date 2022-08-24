package controllers.iop.collaboration.impl;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import io.ebean.text.PathProperties;
import io.vavr.control.Either;
import java.net.URL;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.inject.Inject;
import models.Exam;
import models.ExamEnrolment;
import models.ExamExecutionType;
import models.User;
import models.json.CollaborativeExam;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import sanitizers.Attrs;
import security.Authenticated;
import util.datetime.DateTimeHandler;

public class CollaborativeEnrolmentController extends CollaborationController {

    private final DateTimeHandler dateTimeHandler;

    @Inject
    public CollaborativeEnrolmentController(DateTimeHandler dateTimeHandler) {
        this.dateTimeHandler = dateTimeHandler;
    }

    private static final Logger.ALogger logger = Logger.of(CollaborativeEnrolmentController.class);

    private boolean isEnrollable(Exam exam, String homeOrg) {
        if (exam.getOrganisations() != null) {
            String[] organisations = exam.getOrganisations().split(";");
            if (!Arrays.asList(organisations).contains(homeOrg)) {
                return false;
            }
        }
        return (
            exam.getState() == Exam.State.PUBLISHED &&
            exam.getExecutionType().getType().equals(ExamExecutionType.Type.PUBLIC.toString()) &&
            exam.getExamActiveEndDate().isAfterNow()
        );
    }

    private Either<Result, Exam> checkExam(Exam exam, User user) {
        String homeOrg = configReader.getHomeOrganisationRef();
        if (exam == null || !isEnrollable(exam, homeOrg)) {
            return Either.left(notFound("sitnet_error_exam_not_found"));
        }
        if (!isAllowedToParticipate(exam, user)) {
            return Either.left(forbidden("sitnet_no_trials_left"));
        }
        return Either.right(exam);
    }

    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> listExams() {
        Optional<URL> url = parseUrl();
        if (url.isEmpty()) {
            return wrapAsPromise(internalServerError());
        }

        WSRequest request = wsClient.url(url.get().toString());
        String homeOrg = configReader.getHomeOrganisationRef();
        Function<WSResponse, Result> onSuccess = response ->
            findExamsToProcess(response)
                .map(items -> {
                    List<Exam> exams = items
                        .entrySet()
                        .stream()
                        .map(e -> e.getKey().getExam(e.getValue()))
                        .filter(e -> isEnrollable(e, homeOrg))
                        .collect(Collectors.toList());

                    return ok(
                        exams,
                        PathProperties.parse(
                            "(examOwners(firstName, lastName), examInspections(user(firstName, lastName))" +
                            "examLanguages(code, name), id, name, examActiveStartDate, examActiveEndDate, " +
                            "enrollInstruction, implementation, examinationEventConfigurations)"
                        )
                    );
                })
                .getOrElseGet(Function.identity());
        return request.get().thenApplyAsync(onSuccess);
    }

    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> searchExams(final Optional<String> filter) {
        if (filter.isEmpty() || filter.get().isEmpty()) {
            return wrapAsPromise(badRequest());
        }

        Optional<URL> url = parseUrlWithSearchParam(filter.get(), true);
        if (url.isEmpty()) {
            return wrapAsPromise(internalServerError());
        }

        WSRequest request = wsClient.url(url.get().toString());
        String homeOrg = configReader.getHomeOrganisationRef();
        Function<WSResponse, Result> onSuccess = response ->
            findExamsToProcess(response)
                .map(items -> {
                    List<Exam> exams = items
                        .entrySet()
                        .stream()
                        .map(e -> e.getKey().getExam(e.getValue()))
                        .filter(e -> isEnrollable(e, homeOrg))
                        .collect(Collectors.toList());

                    return ok(
                        exams,
                        PathProperties.parse(
                            "(examOwners(firstName, lastName), examInspections(user(firstName, lastName))" +
                            "examLanguages(code, name), id, name, examActiveStartDate, examActiveEndDate, " +
                            "enrollInstruction, implementation, examinationEventConfigurations)"
                        )
                    );
                })
                .getOrElseGet(Function.identity());
        return request.get().thenApplyAsync(onSuccess);
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> checkIfEnrolled(Long id, Http.Request request) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return downloadExam(ce)
            .thenApplyAsync(result ->
                checkExam(result.orElse(null), user)
                    .map(e -> {
                        DateTime now = dateTimeHandler.adjustDST(new DateTime());
                        List<ExamEnrolment> enrolments = Ebean
                            .find(ExamEnrolment.class)
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
        DateTime now = dateTimeHandler.adjustDST(DateTime.now());
        List<ExamEnrolment> enrolmentsWithFutureReservations = enrolments
            .stream()
            .filter(ee -> ee.getReservation().toInterval().isAfter(now))
            .collect(Collectors.toList());
        if (enrolmentsWithFutureReservations.size() > 1) {
            logger.error(
                "Several enrolments with future reservations found for user {} and collab exam {}",
                user,
                ce.getId()
            );
            return Optional.of(internalServerError()); // Let's fail right here
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

            List<ExamEnrolment> enrolments = Ebean
                .find(ExamEnrolment.class)
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
            if (
                enrolments
                    .stream()
                    .map(ExamEnrolment::getReservation)
                    .anyMatch(r -> r.toInterval().contains(dateTimeHandler.adjustDST(DateTime.now(), r)))
            ) {
                return forbidden("sitnet_reservation_in_effect");
            }
            return handleFutureReservations(enrolments, user, ce)
                .orElseGet(() -> {
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
    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public CompletionStage<Result> createEnrolment(Long id, Http.Request request) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return downloadExam(ce)
            .thenApplyAsync(result -> {
                if (result.isEmpty()) {
                    return notFound("sitnet_error_exam_not_found");
                }
                Exam exam = result.get();
                String homeOrg = configReader.getHomeOrganisationRef();
                if (!isEnrollable(exam, homeOrg)) {
                    return notFound("sitnet_error_exam_not_found");
                }
                if (isAllowedToParticipate(exam, user)) {
                    return doCreateEnrolment(ce, user);
                }
                return forbidden();
            });
    }
}
