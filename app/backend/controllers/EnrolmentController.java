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
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.inject.Inject;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import scala.concurrent.duration.Duration;

import backend.controllers.base.BaseController;
import backend.controllers.iop.transfer.api.ExternalReservationHandler;
import backend.impl.EmailComposer;
import backend.impl.ExternalCourseHandler;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamExecutionType;
import backend.models.Reservation;
import backend.models.Role;
import backend.models.User;
import backend.sanitizers.Attrs;
import backend.sanitizers.EnrolmentCourseInformationSanitizer;
import backend.sanitizers.EnrolmentInformationSanitizer;
import backend.sanitizers.StudentEnrolmentSanitizer;
import backend.security.Authenticated;
import backend.util.config.ConfigUtil;
import backend.util.datetime.DateTimeUtils;
import backend.validators.JsonValidator;

public class EnrolmentController extends BaseController {

    private static final boolean PERM_CHECK_ACTIVE = ConfigUtil.isEnrolmentPermissionCheckActive();
    private static final Logger.ALogger logger = Logger.of(EnrolmentController.class);

    protected final EmailComposer emailComposer;

    private final ExternalCourseHandler externalCourseHandler;

    private final ExternalReservationHandler externalReservationHandler;

    private final ActorSystem actor;

    @Inject
    public EnrolmentController(EmailComposer emailComposer, ExternalCourseHandler externalCourseHandler,
                               ExternalReservationHandler externalReservationHandler,
                               ActorSystem actor) {
        this.emailComposer = emailComposer;
        this.externalCourseHandler = externalCourseHandler;
        this.externalReservationHandler = externalReservationHandler;
        this.actor = actor;
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result enrollExamList(String code) {

        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("creator", "firstName, lastName")
                .fetch("examLanguages")
                .fetch("examOwners", "firstName, lastName")
                .fetch("examInspections.user", "firstName, lastName")
                .fetch("course", "code, name")
                .where()
                .eq("course.code", code)
                .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString())
                .eq("state", Exam.State.PUBLISHED)
                .ge("examActiveEndDate", new Date())
                .findList();

        return ok(exams);
    }

    @Restrict({@Group("ADMIN")})
    public Result enrolmentsByReservation(Long id) {

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
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

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result enrollExamInfo(String code, Long id) {

        Exam exam = Ebean.find(Exam.class)
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
                .where()
                .eq("state", Exam.State.PUBLISHED)
                .eq("course.code", code)
                .idEq(id)
                .findOne();

        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
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
        enrolment.save();
        return enrolment;
    }

    @Authenticated
    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result checkIfEnrolled(Long id, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return badRequest();
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (isAllowedToParticipate(exam, user, emailComposer)) {
            DateTime now = DateTimeUtils.adjustDST(new DateTime());
            List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                    .where()
                    .eq("user", user)
                    .eq("exam.id", id)
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
            if (enrolments.isEmpty()) {
                return notFound("error not found");
            }
            return ok(enrolments);
        }
        return forbidden("sitnet_no_trials_left");
    }

    @Authenticated
    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result removeEnrolment(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment;
        if (user.hasRole(Role.Name.STUDENT)) {
            enrolment = Ebean.find(ExamEnrolment.class).fetch("exam")
                    .where().idEq(id).eq("user", user).findOne();
        } else {
            enrolment = Ebean.find(ExamEnrolment.class).fetch("exam")
                    .where().idEq(id).findOne();
        }
        if (enrolment == null) {
            return notFound("enrolment not found");
        }
        // Disallow removing enrolments to private exams created automatically for student
        if (enrolment.getExam() != null && enrolment.getExam().isPrivate()) {
            return forbidden();
        }
        if (enrolment.getReservation() != null) {
            return forbidden("sitnet_cancel_reservation_first");
        }
        enrolment.delete();
        return ok();
    }

    @Authenticated
    @JsonValidator(schema = "enrolmentInfo")
    @With(EnrolmentInformationSanitizer.class)
    @Restrict({@Group("STUDENT")})
    public Result updateEnrolment(Long id, Http.Request request) {
        String info = request.attrs().getOptional(Attrs.ENROLMENT_INFORMATION).orElse(null);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                .idEq(id)
                .eq("user", user)
                .findOne();
        if (enrolment == null) {
            return notFound("enrolment not found");
        }
        enrolment.setInformation(info);
        enrolment.update();
        return ok();
    }

    private Optional<Exam> getExam(Long eid, ExamExecutionType.Type type) {
        return Ebean.find(Exam.class)
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
        Ebean.beginTransaction();
        try {
            // Take pessimistic lock for user to prevent multiple enrolments creating.
            Ebean.find(User.class).forUpdate().where().eq("id", user.getId()).findOne();
            Optional<Exam> possibleExam = getExam(eid, type);
            if (!possibleExam.isPresent()) {
                return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
            }
            Exam exam = possibleExam.get();

            // Find existing enrolments for exam and user
            List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                    .fetch("reservation")
                    .where()
                    // either user ID or pre-enrolment email address matches
                    .or()
                    .eq("user.id", user.getId())
                    .eq("preEnrolledUserEmail", user.getEmail())
                    .endOr()
                    // either exam id matches or parent exam's id matches
                    .or()
                    .eq("exam.id", exam.getId())
                    .eq("exam.parent.id", exam.getId())
                    .endOr()
                    .findList();

            // already enrolled
            if (enrolments.stream().anyMatch(e -> e.getReservation() == null)) {
                return wrapAsPromise(forbidden("sitnet_error_enrolment_exists"));
            }
            // reservation in effect
            if (enrolments.stream().map(ExamEnrolment::getReservation).anyMatch(r ->
                    r.toInterval().contains(DateTimeUtils.adjustDST(DateTime.now(), r)))) {
                return wrapAsPromise(forbidden("sitnet_reservation_in_effect"));
            }
            List<ExamEnrolment> enrolmentsWithFutureReservations = enrolments.stream()
                    .filter(ee -> ee.getReservation().toInterval().isAfterNow())
                            .collect(Collectors.toList());
            if (enrolmentsWithFutureReservations.size() > 1) {
                logger.error("Several enrolments with future reservations found for user {} and exam {}",
                        user, exam.getId());
                return wrapAsPromise(internalServerError()); // Lets fail right here
            }
            // reservation in the future, replace it
            if (!enrolmentsWithFutureReservations.isEmpty()) {
                ExamEnrolment enrolment = enrolmentsWithFutureReservations.get(0);
                Reservation reservation = enrolment.getReservation();
                return externalReservationHandler.removeReservation(reservation, user).thenApplyAsync(result -> {
                    enrolment.delete();
                    ExamEnrolment newEnrolment = makeEnrolment(exam, user);
                    return ok(newEnrolment);
                });
            }
            ExamEnrolment newEnrolment = makeEnrolment(exam, user);
            Ebean.commitTransaction();
            return wrapAsPromise(ok(newEnrolment));
        } finally {
            // End transaction to release lock.
            Ebean.endTransaction();
        }
    }

    private CompletionStage<Result> checkPermission(Long id, Collection<String> codes, String code, User user) {
        if (codes.contains(code)) {
            return doCreateEnrolment(id, ExamExecutionType.Type.PUBLIC, user);
        } else {
            logger.warn("Attempt to enroll for a course without permission from {}", user.toString());
            return wrapAsPromise(forbidden("sitnet_error_access_forbidden"));
        }
    }

    @Authenticated
    @With(EnrolmentCourseInformationSanitizer.class)
    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public CompletionStage<Result> createEnrolment(final Long id, Http.Request request) throws IOException {
        String code = request.attrs().get(Attrs.COURSE_CODE);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!PERM_CHECK_ACTIVE) {
            return doCreateEnrolment(id, ExamExecutionType.Type.PUBLIC, user);
        }
        return externalCourseHandler.getPermittedCourses(user)
                .thenApplyAsync(codes -> checkPermission(id, codes, code, user))
                .thenCompose(Function.identity())
                .exceptionally(throwable -> internalServerError(throwable.getMessage()));
    }

    @Authenticated
    @With(StudentEnrolmentSanitizer.class)
    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public CompletionStage<Result> createStudentEnrolment(Long eid, Http.Request request) {
        Optional<Long> uid = request.attrs().getOptional(Attrs.USER_ID);
        Optional<String> email = request.attrs().getOptional(Attrs.EMAIL);
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        ExamExecutionType.Type executionType = ExamExecutionType.Type.valueOf(exam.getExecutionType().getType());

        User user;
        if (uid.isPresent()) {
            user = Ebean.find(User.class, uid.get());
        } else if (email.isPresent()) {
            List<User> users = Ebean.find(User.class).where()
                    .or()
                    .eq("email", email.get())
                    .eq("eppn", email.get()) // CSCEXAM-34
                    .endOr()
                    .findList();
            if (users.isEmpty()) {
                // Pre-enrolment
                // Check that we will not create duplicate enrolments for same email address
                ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                        .eq("exam.id", eid)
                        .eq("preEnrolledUserEmail", email.get())
                        .findOne();
                if (enrolment == null) {
                    user = new User();
                    user.setEmail(email.get());
                } else {
                    return wrapAsPromise(badRequest("already pre-enrolled"));
                }
            } else if (users.size() == 1) {
                // User with email already exists
                user = users.get(0);
            } else {
                // Multiple users with same email -> not good
                return wrapAsPromise(internalServerError("multiple users found for email"));
            }
        } else {
            return wrapAsPromise(badRequest());
        }

        final User receiver = user;
        final User sender = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return doCreateEnrolment(eid, executionType, user).thenApplyAsync(result -> {
            if (receiver == null) {
                return result;
            }
            if (exam.getState() != Exam.State.PUBLISHED) {
                return result;
            }
            if (result.status() != Http.Status.OK) {
                return result;
            }
            actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
                emailComposer.composePrivateExamParticipantNotification(receiver, sender, exam);
                logger.info("Exam participation notification email sent to {}", receiver.getEmail());
            }, actor.dispatcher());
            return result;
        });
    }

    @Authenticated
    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result removeStudentEnrolment(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
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
            return forbidden("sitnet_not_possible_to_remove_participant");
        }
        enrolment.delete();
        return ok();
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result getRoomInfoFromEnrolment(String hash, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExpressionList<ExamEnrolment> query = Ebean.find(ExamEnrolment.class)
                .fetch("user", "id")
                .fetch("user.language")
                .fetch("reservation.machine.room", "roomInstruction, roomInstructionEN, roomInstructionSV")
                .where()
                .disjunction()
                .eq("exam.hash", hash)
                .eq("externalExam.hash", hash)
                .endJunction()
                .isNotNull("reservation.machine.room");
        if (user.hasRole(Role.Name.STUDENT)) {
            query = query.eq("user", user);
        }
        ExamEnrolment enrolment = query.findOne();
        if (enrolment == null) {
            return notFound();
        } else {
            return ok(enrolment.getReservation().getMachine().getRoom());
        }
    }


}
