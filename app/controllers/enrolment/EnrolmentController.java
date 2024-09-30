// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.enrolment;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import controllers.iop.transfer.api.ExternalReservationHandler;
import impl.ExternalCourseHandler;
import impl.mail.EmailComposer;
import io.ebean.DB;
import io.ebean.Transaction;
import java.io.IOException;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.inject.Inject;
import miscellaneous.config.ConfigReader;
import miscellaneous.datetime.DateTimeHandler;
import models.enrolment.ExamEnrolment;
import models.enrolment.ExaminationEvent;
import models.enrolment.ExaminationEventConfiguration;
import models.enrolment.Reservation;
import models.exam.Exam;
import models.exam.ExamExecutionType;
import models.user.Role;
import models.user.User;
import org.apache.pekko.actor.ActorSystem;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.concurrent.ClassLoaderExecutionContext;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import repository.EnrolmentRepository;
import sanitizers.Attrs;
import sanitizers.EnrolmentCourseInformationSanitizer;
import sanitizers.EnrolmentInformationSanitizer;
import sanitizers.StudentEnrolmentSanitizer;
import scala.concurrent.duration.Duration;
import scala.jdk.javaapi.CollectionConverters;
import scala.jdk.javaapi.FutureConverters;
import security.Authenticated;
import validators.JsonValidator;

public class EnrolmentController extends BaseController {

    private final boolean permCheckActive;
    private final Logger logger = LoggerFactory.getLogger(EnrolmentController.class);

    protected final EmailComposer emailComposer;

    private final ExternalCourseHandler externalCourseHandler;

    private final ExternalReservationHandler externalReservationHandler;

    private final EnrolmentRepository enrolmentRepository;

    private final ClassLoaderExecutionContext httpExecutionContext;

    private final ActorSystem actor;

    private final DateTimeHandler dateTimeHandler;

    @Inject
    public EnrolmentController(
        EmailComposer emailComposer,
        ExternalCourseHandler externalCourseHandler,
        ExternalReservationHandler externalReservationHandler,
        EnrolmentRepository enrolmentRepository,
        ClassLoaderExecutionContext httpExecutionContext,
        ActorSystem actor,
        ConfigReader configReader,
        DateTimeHandler dateTimeHandler
    ) {
        this.emailComposer = emailComposer;
        this.externalCourseHandler = externalCourseHandler;
        this.externalReservationHandler = externalReservationHandler;
        this.enrolmentRepository = enrolmentRepository;
        this.httpExecutionContext = httpExecutionContext;
        this.actor = actor;
        this.permCheckActive = configReader.isEnrolmentPermissionCheckActive();
        this.dateTimeHandler = dateTimeHandler;
    }

    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result listEnrolledExams(String code) {
        List<Exam> exams = DB.find(Exam.class)
            .fetch("creator", "firstName, lastName")
            .fetch("examLanguages")
            .fetch("examOwners", "firstName, lastName")
            .fetch("examInspections.user", "firstName, lastName")
            .fetch("course", "code, name")
            .where()
            .eq("course.code", code)
            .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString())
            .eq("state", Exam.State.PUBLISHED)
            .ge("periodEnd", new Date())
            .findList();

        return ok(exams);
    }

    @Restrict({ @Group("ADMIN") })
    public Result enrolmentsByReservation(Long id) {
        List<ExamEnrolment> enrolments = DB.find(ExamEnrolment.class)
            .fetch("user", "firstName, lastName, email")
            .fetch("exam")
            .fetch("exam.course", "code, name")
            .fetch("exam.examOwners", "firstName, lastName")
            .fetch("reservation", "id, startAt, endAt")
            .where()
            .eq("reservation.id", id)
            .findList();
        return ok(enrolments);
    }

    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result getEnrolledExamInfo(String code, Long id) {
        Exam exam = DB.find(Exam.class)
            .fetch("course")
            .fetch("course.organisation")
            .fetch("course.gradeScale")
            .fetch("gradeScale")
            .fetch("creator", "firstName, lastName, email")
            .fetch("examLanguages")
            .fetch("examOwners", "firstName, lastName")
            .fetch("examInspections")
            .fetch("examInspections.user")
            .fetch("examType")
            .fetch("executionType")
            .fetch("examinationEventConfigurations")
            .fetch("examinationEventConfigurations.examinationEvent")
            .where()
            .eq("state", Exam.State.PUBLISHED)
            .eq("course.code", code)
            .idEq(id)
            .findOne();

        if (exam == null) {
            return notFound("i18n_error_exam_not_found");
        }
        return ok(exam);
    }

    private static ExamEnrolment makeEnrolment(Exam exam, User user) {
        ExamEnrolment enrolment = new ExamEnrolment();
        enrolment.setEnrolledOn(DateTime.now());
        if (user.getId() == null) {
            enrolment.setPreEnrolledUserEmail(user.getEmail());
        } else {
            enrolment.setUser(user);
        }
        enrolment.setExam(exam);
        enrolment.setRandomDelay();
        enrolment.save();
        return enrolment;
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result checkIfEnrolled(Long id, Http.Request request) {
        Exam exam = DB.find(Exam.class, id);
        if (exam == null) {
            return badRequest();
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (isAllowedToParticipate(exam, user)) {
            DateTime now = dateTimeHandler.adjustDST(new DateTime());
            List<ExamEnrolment> enrolments = DB.find(ExamEnrolment.class)
                .where()
                .eq("user", user)
                .eq("exam.id", id)
                .gt("exam.periodEnd", now.toDate())
                .disjunction()
                .eq("exam.state", Exam.State.PUBLISHED)
                .eq("exam.state", Exam.State.STUDENT_STARTED)
                .endJunction()
                .findList()
                .stream()
                .filter(this::isActive)
                .collect(Collectors.toList());
            return ok(enrolments);
        }
        return unauthorized("i18n_no_trials_left");
    }

    private boolean isActive(ExamEnrolment enrolment) {
        DateTime now = dateTimeHandler.adjustDST(new DateTime());
        Exam exam = enrolment.getExam();
        if (exam == null || exam.getImplementation() == Exam.Implementation.AQUARIUM) {
            Reservation reservation = enrolment.getReservation();
            return reservation == null || reservation.getEndAt().isAfter(now);
        }
        ExaminationEventConfiguration examinationEventConfiguration = enrolment.getExaminationEventConfiguration();
        return (
            examinationEventConfiguration == null ||
            examinationEventConfiguration.getExaminationEvent().getStart().plusMinutes(exam.getDuration()).isAfter(now)
        );
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result removeEnrolment(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment;
        if (user.hasRole(Role.Name.STUDENT)) {
            enrolment = DB.find(ExamEnrolment.class).fetch("exam").where().idEq(id).eq("user", user).findOne();
        } else {
            enrolment = DB.find(ExamEnrolment.class).fetch("exam").where().idEq(id).findOne();
        }
        if (enrolment == null) {
            return notFound("enrolment not found");
        }
        // Disallow removing enrolments to private exams created automatically for student
        if (enrolment.getExam() != null && enrolment.getExam().isPrivate()) {
            return forbidden();
        }
        if (enrolment.getReservation() != null || enrolment.getExaminationEventConfiguration() != null) {
            return forbidden("i18n_cancel_reservation_first");
        }
        enrolment.delete();
        return ok();
    }

    @Authenticated
    @JsonValidator(schema = "enrolmentInfo")
    @With(EnrolmentInformationSanitizer.class)
    @Restrict({ @Group("STUDENT") })
    public Result updateEnrolment(Long id, Http.Request request) {
        String info = request.attrs().getOptional(Attrs.ENROLMENT_INFORMATION).orElse(null);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment = DB.find(ExamEnrolment.class).where().idEq(id).eq("user", user).findOne();
        if (enrolment == null) {
            return notFound("enrolment not found");
        }
        enrolment.setInformation(info);
        enrolment.update();
        return ok();
    }

    private Optional<Exam> getExam(Long eid, ExamExecutionType.Type type) {
        return DB.find(Exam.class)
            .where()
            .eq("id", eid)
            .disjunction()
            .eq("state", Exam.State.PUBLISHED)
            .ne("executionType.type", ExamExecutionType.Type.PUBLIC.toString())
            .endJunction()
            .eq("executionType.type", type.toString())
            .findOneOrEmpty();
    }

    private CompletionStage<Result> doCreateEnrolment(Long eid, ExamExecutionType.Type type, User user) {
        // Begin manual transaction
        try (Transaction tx = DB.beginTransaction()) {
            // Take pessimistic lock for user to prevent multiple enrolments creating.
            DB.find(User.class).forUpdate().where().eq("id", user.getId()).findOne();
            Optional<Exam> possibleExam = getExam(eid, type);
            if (possibleExam.isEmpty()) {
                return wrapAsPromise(notFound("i18n_error_exam_not_found"));
            }
            Exam exam = possibleExam.get();

            // Find existing enrolments for exam and user
            List<ExamEnrolment> enrolments = DB.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("examinationEventConfiguration")
                .fetch("examinationEventConfiguration.examinationEvent")
                .where()
                // either exam id matches or parent exam's id matches
                .or()
                .eq("exam.id", exam.getId())
                .eq("exam.parent.id", exam.getId())
                .endOr()
                .findList()
                .stream()
                .filter(
                    ee ->
                        (ee.getUser() != null && ee.getUser().equals(user)) ||
                        (ee.getPreEnrolledUserEmail() != null && ee.getPreEnrolledUserEmail().equals(user.getEmail()))
                )
                .toList();

            // already enrolled (regular examination)
            if (
                enrolments
                    .stream()
                    .anyMatch(
                        e ->
                            e.getExam().getImplementation() == Exam.Implementation.AQUARIUM &&
                            e.getReservation() == null
                    )
            ) {
                return wrapAsPromise(forbidden("i18n_error_enrolment_exists"));
            }
            // already enrolled (BYOD examination)
            if (
                enrolments
                    .stream()
                    .anyMatch(
                        e ->
                            e.getExam().getImplementation() != Exam.Implementation.AQUARIUM &&
                            e.getExaminationEventConfiguration() == null
                    )
            ) {
                return wrapAsPromise(forbidden("i18n_error_enrolment_exists"));
            }
            // reservation in effect
            if (
                enrolments
                    .stream()
                    .map(ExamEnrolment::getReservation)
                    .anyMatch(r -> r != null && r.toInterval().contains(dateTimeHandler.adjustDST(DateTime.now(), r)))
            ) {
                return wrapAsPromise(forbidden("i18n_reservation_in_effect"));
            }
            // examination event in effect
            if (
                enrolments
                    .stream()
                    .anyMatch(
                        e ->
                            e.getExaminationEventConfiguration() != null &&
                            e
                                .getExaminationEventConfiguration()
                                .getExaminationEvent()
                                .toInterval(e.getExam())
                                .contains(dateTimeHandler.adjustDST(DateTime.now()))
                    )
            ) {
                return wrapAsPromise(forbidden("i18n_reservation_in_effect"));
            }
            List<ExamEnrolment> enrolmentsWithFutureReservations = enrolments
                .stream()
                .filter(
                    ee ->
                        ee.getReservation() != null &&
                        ee.getReservation().toInterval().isAfter(dateTimeHandler.adjustDST(DateTime.now()))
                )
                .toList();
            if (enrolmentsWithFutureReservations.size() > 1) {
                logger.error(
                    "Several enrolments with future reservations found for user {} and exam {}",
                    user,
                    exam.getId()
                );
                return wrapAsPromise(internalServerError()); // Let's fail right here
            }
            // reservation in the future, replace it
            if (!enrolmentsWithFutureReservations.isEmpty()) {
                ExamEnrolment enrolment = enrolmentsWithFutureReservations.getFirst();
                Reservation reservation = enrolment.getReservation();
                return externalReservationHandler
                    .removeReservation(reservation, user, "")
                    .thenApplyAsync(result -> {
                        enrolment.delete();
                        ExamEnrolment newEnrolment = makeEnrolment(exam, user);
                        return ok(newEnrolment);
                    });
            }
            List<ExamEnrolment> enrolmentsWithFutureExaminationEvents = enrolments
                .stream()
                .filter(
                    e ->
                        e.getExaminationEventConfiguration() != null &&
                        e.getExaminationEventConfiguration().getExaminationEvent().toInterval(e.getExam()).isAfterNow()
                )
                .toList();
            if (enrolmentsWithFutureExaminationEvents.size() > 1) {
                logger.error(
                    "Several enrolments with future examination events found for user {} and exam {}",
                    user,
                    exam.getId()
                );
                return wrapAsPromise(internalServerError()); // Let's fail right here
            }
            // examination event in the future, replace it
            if (!enrolmentsWithFutureExaminationEvents.isEmpty()) {
                ExamEnrolment enrolment = enrolmentsWithFutureExaminationEvents.getFirst();
                enrolment.delete();
                ExamEnrolment newEnrolment = makeEnrolment(exam, user);
                return wrapAsPromise(ok(newEnrolment));
            }
            if (enrolments.size() == 1) {
                ExamEnrolment enrolment = enrolments.getFirst();
                Reservation reservation = enrolment.getReservation();
                if (
                    reservation != null &&
                    reservation.getExternalRef() != null &&
                    !reservation.getStartAt().isAfter(dateTimeHandler.adjustDST(DateTime.now())) &&
                    !enrolment.isNoShow() &&
                    enrolment.getExam().getState().equals(Exam.State.PUBLISHED)
                ) {
                    // External reservation, assessment not returned yet. We must wait for it to arrive first
                    return wrapAsPromise(forbidden("i18n_enrolment_assessment_not_received"));
                }
            }
            ExamEnrolment newEnrolment = makeEnrolment(exam, user);
            tx.commit();
            return wrapAsPromise(ok(newEnrolment));
        }
    }

    private CompletionStage<Result> checkPermission(Long id, Collection<String> codes, String code, User user) {
        if (codes.contains(code)) {
            return doCreateEnrolment(id, ExamExecutionType.Type.PUBLIC, user);
        } else {
            logger.warn("Attempt to enroll for a course without permission from {}", user.toString());
            return wrapAsPromise(forbidden("i18n_error_access_forbidden"));
        }
    }

    @Authenticated
    @With(EnrolmentCourseInformationSanitizer.class)
    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public CompletionStage<Result> createEnrolment(final Long id, Http.Request request) throws IOException {
        String code = request.attrs().get(Attrs.COURSE_CODE);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!permCheckActive) {
            return doCreateEnrolment(id, ExamExecutionType.Type.PUBLIC, user);
        }
        var future = externalCourseHandler.getPermittedCourses(user);
        return FutureConverters.asJava(future)
            .thenApplyAsync(codes -> checkPermission(id, CollectionConverters.asJava(codes), code, user))
            .thenCompose(Function.identity())
            .exceptionally(throwable -> internalServerError(throwable.getMessage()));
    }

    @Authenticated
    @With(StudentEnrolmentSanitizer.class)
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public CompletionStage<Result> createStudentEnrolment(Long eid, Http.Request request) {
        Optional<Long> uid = request.attrs().getOptional(Attrs.USER_ID);
        Optional<String> email = request.attrs().getOptional(Attrs.EMAIL);
        Exam exam = DB.find(Exam.class, eid);
        if (exam == null) {
            return wrapAsPromise(notFound("i18n_error_exam_not_found"));
        }
        ExamExecutionType.Type executionType = ExamExecutionType.Type.valueOf(exam.getExecutionType().getType());

        User user;
        if (uid.isPresent()) {
            user = DB.find(User.class, uid.get());
            if (user == null) {
                return wrapAsPromise(badRequest("user not found"));
            }
        } else if (email.isPresent()) {
            List<User> users = DB.find(User.class)
                .where()
                .or()
                .ieq("email", email.get())
                .ieq("eppn", email.get()) // CSCEXAM-34
                .endOr()
                .findList();
            if (users.isEmpty()) {
                // Pre-enrolment
                // Check that we will not create duplicate enrolments for same email address
                List<ExamEnrolment> enrolments = DB.find(ExamEnrolment.class)
                    .where()
                    .eq("exam.id", eid)
                    .ieq("preEnrolledUserEmail", email.get())
                    .findList();
                if (enrolments.isEmpty()) {
                    user = new User();
                    user.setEmail(email.get());
                } else {
                    return wrapAsPromise(badRequest("already pre-enrolled"));
                }
            } else if (users.size() == 1) {
                // User with email already exists
                user = users.getFirst();
            } else {
                // Multiple users with same email -> not good
                return wrapAsPromise(internalServerError("multiple users found for email"));
            }
        } else {
            return wrapAsPromise(badRequest());
        }

        final User sender = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return doCreateEnrolment(eid, executionType, user).thenApplyAsync(result -> {
            if (exam.getState() != Exam.State.PUBLISHED) {
                return result;
            }
            if (result.status() != Http.Status.OK) {
                return result;
            }
            actor
                .scheduler()
                .scheduleOnce(
                    Duration.create(1, TimeUnit.SECONDS),
                    () -> {
                        emailComposer.composePrivateExamParticipantNotification(user, sender, exam);
                        logger.info("Exam participation notification email sent to {}", user.getEmail());
                    },
                    actor.dispatcher()
                );
            return result;
        });
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public Result removeStudentEnrolment(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment = DB.find(ExamEnrolment.class)
            .where()
            .idEq(id)
            .ne("exam.executionType.type", ExamExecutionType.Type.PUBLIC.toString())
            .isNull("reservation")
            .disjunction()
            .eq("exam.state", Exam.State.DRAFT)
            .eq("exam.state", Exam.State.SAVED)
            .endJunction()
            .disjunction()
            .eq("exam.examOwners", user)
            .eq("exam.creator", user)
            .endJunction()
            .findOne();
        if (enrolment == null) {
            return forbidden("i18n_not_possible_to_remove_participant");
        }
        enrolment.delete();
        return ok();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    public CompletionStage<Result> getRoomInfoFromEnrolment(String hash, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return enrolmentRepository
            .getRoomInfoForEnrolment(hash, user)
            .thenComposeAsync(
                room -> wrapAsPromise(room == null ? notFound() : ok(room)),
                httpExecutionContext.current()
            );
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result addExaminationEventConfig(Long enrolmentId, Long configId, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Optional<ExamEnrolment> oee = DB.find(ExamEnrolment.class)
            .where()
            .idEq(enrolmentId)
            .eq("user", user)
            .eq("exam.state", Exam.State.PUBLISHED)
            .findOneOrEmpty();
        if (oee.isEmpty()) {
            return notFound("enrolment not found");
        }
        ExamEnrolment enrolment = oee.get();
        Optional<ExaminationEventConfiguration> optionalConfig = DB.find(ExaminationEventConfiguration.class)
            .fetch("examEnrolments")
            .where()
            .idEq(configId)
            .gt("examinationEvent.start", DateTime.now())
            .eq("exam", enrolment.getExam())
            .findOneOrEmpty();
        if (optionalConfig.isEmpty()) {
            return notFound("config not found");
        }
        ExaminationEventConfiguration config = optionalConfig.get();
        ExaminationEvent event = config.getExaminationEvent();
        if (config.getExamEnrolments().size() + 1 > event.getCapacity()) {
            return forbidden("i18n_error_max_enrolments_reached");
        }
        enrolment.setExaminationEventConfiguration(config);
        enrolment.update();
        actor
            .scheduler()
            .scheduleOnce(
                Duration.create(1, TimeUnit.SECONDS),
                () -> {
                    emailComposer.composeExaminationEventNotification(user, enrolment, false);
                    logger.info("Examination event notification email sent to {}", user.getEmail());
                },
                actor.dispatcher()
            );
        return ok();
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result removeExaminationEventConfig(Long enrolmentId, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Optional<ExamEnrolment> oee = DB.find(ExamEnrolment.class)
            .where()
            .idEq(enrolmentId)
            .eq("user", user)
            .eq("exam.state", Exam.State.PUBLISHED)
            .isNotNull("examinationEventConfiguration")
            .findOneOrEmpty();
        if (oee.isEmpty()) {
            return notFound("enrolment not found");
        }
        ExamEnrolment enrolment = oee.get();
        ExaminationEvent event = enrolment.getExaminationEventConfiguration().getExaminationEvent();
        enrolment.setExaminationEventConfiguration(null);
        enrolment.update();
        actor
            .scheduler()
            .scheduleOnce(
                Duration.create(1, TimeUnit.SECONDS),
                () -> {
                    emailComposer.composeExaminationEventCancellationNotification(user, enrolment.getExam(), event);
                    logger.info("Examination event cancellation notification email sent to {}", user.getEmail());
                },
                actor.dispatcher()
            );
        return ok();
    }

    @Restrict({ @Group("ADMIN") })
    public Result removeExaminationEvent(Long configId) {
        ExaminationEventConfiguration config = DB.find(ExaminationEventConfiguration.class, configId);
        if (config == null) {
            return badRequest();
        }
        if (config.getExaminationEvent().getStart().isBeforeNow()) {
            return forbidden();
        }
        ExaminationEvent event = config.getExaminationEvent();
        Exam exam = config.getExam();
        Set<ExamEnrolment> enrolments = DB.find(ExamEnrolment.class)
            .fetch("user")
            .where()
            .eq("examinationEventConfiguration.id", configId)
            .eq("exam.state", Exam.State.PUBLISHED)
            .findSet();
        enrolments.forEach(e -> {
            e.setExaminationEventConfiguration(null);
            e.update();
        });
        config.delete();
        event.delete();
        var users = enrolments.stream().map(ExamEnrolment::getUser).collect(Collectors.toSet());
        actor
            .scheduler()
            .scheduleOnce(
                Duration.create(1, TimeUnit.SECONDS),
                () -> {
                    emailComposer.composeExaminationEventCancellationNotification(
                        CollectionConverters.asScala(users).toSet(),
                        exam,
                        event
                    );
                    logger.info(
                        "Examination event cancellation notification email sent to {} participants",
                        enrolments.size()
                    );
                },
                actor.dispatcher()
            );
        return ok();
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result permitRetrial(Long id) {
        ExamEnrolment enrolment = DB.find(ExamEnrolment.class, id);
        if (enrolment == null) {
            return notFound("i18n_not_found");
        }
        enrolment.setRetrialPermitted(true);
        enrolment.update();
        return ok();
    }
}
