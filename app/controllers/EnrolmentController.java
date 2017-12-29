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
import controllers.iop.api.ExternalReservationHandler;
import impl.EmailComposer;
import impl.ExternalCourseHandler;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import models.Exam;
import models.ExamEnrolment;
import models.ExamExecutionType;
import models.Reservation;
import models.User;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.EnrolmentInformationSanitizer;
import sanitizers.StudentEnrolmentSanitizer;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import validators.JsonValidator;

import javax.inject.Inject;
import java.io.IOException;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

public class EnrolmentController extends BaseController {

    private static final boolean PERM_CHECK_ACTIVE = AppUtil.isEnrolmentPermissionCheckActive();

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
                .findUnique();

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

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result checkIfEnrolled(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return badRequest();
        }
        if (isAllowedToParticipate(exam, getLoggedUser(), emailComposer)) {
            DateTime now = AppUtil.adjustDST(new DateTime());
            List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                    .where()
                    .eq("user", getLoggedUser())
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

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result removeEnrolment(Long id) {
        User user = getLoggedUser();
        ExamEnrolment enrolment;
        if (user.hasRole("STUDENT", getSession())) {
            enrolment = Ebean.find(ExamEnrolment.class).fetch("exam")
                    .where().idEq(id).eq("user", user).findUnique();
        } else {
            enrolment = Ebean.find(ExamEnrolment.class).fetch("exam")
                    .where().idEq(id).findUnique();
        }
        if (enrolment == null) {
            return notFound("enrolment not found");
        }
        // Disallow removing enrolments to private exams created automatically for student
        if (enrolment.getExam().isPrivate()) {
            return forbidden();
        }
        if (enrolment.getReservation() != null) {
            return forbidden("sitnet_cancel_reservation_first");
        }
        enrolment.delete();
        return ok();
    }

    @JsonValidator(schema = "enrolmentInfo")
    @With(EnrolmentInformationSanitizer.class)
    @Restrict({@Group("STUDENT")})
    public Result updateEnrolment(Long id) {
        String info = request().attrs().getOptional(Attrs.ENROLMENT_INFORMATION).orElse(null);
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                .idEq(id)
                .eq("user", getLoggedUser())
                .findUnique();
        if (enrolment == null) {
            return notFound("enrolment not found");
        }
        enrolment.setInformation(info);
        enrolment.update();
        return ok();
    }

    private CompletionStage<Result> doCreateEnrolment(Long eid, ExamExecutionType.Type type, User user) {
        Exam exam = Ebean.find(Exam.class)
                .where()
                .eq("id", eid)
                .disjunction()
                .eq("state", Exam.State.PUBLISHED)
                .ne("executionType.type", ExamExecutionType.Type.PUBLIC.toString())
                .endJunction()
                .eq("executionType.type", type.toString())
                .findUnique();
        if (exam == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                // Either user's id matches or email matches
                .or()
                .and()
                .isNotNull("user.id")
                .eq("user.id", user.getId())
                .endAnd()
                .and()
                .isNull("user.id")
                .eq("user.email", user.getEmail())
                .endAnd()
                .endOr()
                // either exam ID matches OR (exam parent ID matches AND exam is started by student)
                .disjunction()
                .eq("exam.id", exam.getId())
                .disjunction()
                .conjunction()
                .eq("exam.parent.id", exam.getId())
                .eq("exam.state", Exam.State.STUDENT_STARTED)
                .endJunction()
                .endJunction()
                .endJunction()
                .findList();

        for (ExamEnrolment enrolment : enrolments) {
            Reservation reservation = enrolment.getReservation();
            if (reservation == null) {
                // enrolment without reservation already exists, no need to create a new one
                return wrapAsPromise(forbidden("sitnet_error_enrolment_exists"));
            } else if (reservation.toInterval().contains(AppUtil.adjustDST(DateTime.now(), reservation))) {
                // reservation in effect
                if (exam.getState() == Exam.State.STUDENT_STARTED) {
                    // exam for reservation is ongoing
                    return wrapAsPromise(forbidden("sitnet_reservation_in_effect"));
                } else if (exam.getState() == Exam.State.PUBLISHED) {
                    // exam for reservation not started (yet?)
                    return wrapAsPromise(forbidden("sitnet_reservation_in_effect"));
                }
            } else if (reservation.toInterval().isAfterNow()) {
                // reservation in the future, replace it
                // pass this through externalAPI to see if there's something to remove externally also
                return externalReservationHandler.removeReservation(reservation, user).thenApplyAsync(result -> {
                    enrolment.delete();
                    ExamEnrolment newEnrolment = makeEnrolment(exam, user);
                    return ok(newEnrolment);
                });
            }
        }
        ExamEnrolment newEnrolment = makeEnrolment(exam, user);
        return wrapAsPromise(ok(newEnrolment));
    }

    private CompletionStage<Result> checkPermission(Long id, Collection<String> codes, String code, User user) {
        if (codes.contains(code)) {
            return doCreateEnrolment(id, ExamExecutionType.Type.PUBLIC, user);
        } else {
            Logger.warn("Attempt to enroll for a course without permission from {}", user.toString());
            return wrapAsPromise(forbidden("sitnet_error_access_forbidden"));
        }
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public CompletionStage<Result> createEnrolment(final String code, final Long id) throws IOException {
        User user = getLoggedUser();
        if (!PERM_CHECK_ACTIVE) {
            return doCreateEnrolment(id, ExamExecutionType.Type.PUBLIC, user);
        }
        return externalCourseHandler.getPermittedCourses(user)
                .thenApplyAsync(codes -> checkPermission(id, codes, code, user))
                .thenCompose(Function.identity())
                .exceptionally(throwable -> internalServerError(throwable.getMessage()));
    }

    @With(StudentEnrolmentSanitizer.class)
    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public CompletionStage<Result> createStudentEnrolment(Long eid) {
        Optional<Long> uid = request().attrs().getOptional(Attrs.USER_ID);
        Optional<String> email = request().attrs().getOptional(Attrs.EMAIL);
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        ExamExecutionType.Type executionType = ExamExecutionType.Type.valueOf(exam.getExecutionType().getType());

        User user;
        if (uid.isPresent()) {
            user = Ebean.find(User.class, uid.get());
        } else if (email.isPresent()) {
            List<User> users = Ebean.find(User.class).where().eq("email", email.get()).findList();
            if (users.isEmpty()) {
                // Pre-enrolment
                // Check that we will not create duplicate enrolments for same email address
                ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                        .eq("exam.id", eid )
                        .eq("preEnrolledUserEmail", email.get())
                        .findOne();
                if (enrolment == null) {
                    user = new User();
                    user.setEmail(email.get());
                } else {
                    return wrapAsPromise(badRequest("already pre-enrolled"));
                }
            } else if (users.size() == 1){
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
        final User sender = getLoggedUser();
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
                Logger.info("Exam participation notification email sent to {}", receiver.getEmail());
            }, actor.dispatcher());
            return result;
        });
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result removeStudentEnrolment(Long id) {
        User user = getLoggedUser();
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
                .findUnique();
        if (enrolment == null) {
            return forbidden("sitnet_not_possible_to_remove_participant");
        }
        enrolment.delete();
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result getRoomInfoFromEnrolment(String hash) {
        User user = getLoggedUser();
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
        if (user.hasRole("STUDENT", getSession())) {
            query = query.eq("user", user);
        }
        ExamEnrolment enrolment = query.findUnique();
        if (enrolment == null) {
            return notFound();
        } else {
            return ok(enrolment.getReservation().getMachine().getRoom());
        }
    }


}
