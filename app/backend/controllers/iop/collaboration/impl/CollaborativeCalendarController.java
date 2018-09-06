package backend.controllers.iop.collaboration.impl;

import java.util.Collection;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import io.ebean.text.PathProperties;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Result;
import play.mvc.With;
import scala.concurrent.duration.Duration;

import backend.impl.CalendarHandler;
import backend.impl.EmailComposer;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamMachine;
import backend.models.ExamRoom;
import backend.models.Reservation;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.sanitizers.Attrs;
import backend.sanitizers.CalendarReservationSanitizer;
import backend.util.DateTimeUtils;

public class CollaborativeCalendarController extends CollaborationController {

    @Inject
    CalendarHandler calendarHandler;

    @Inject
    EmailComposer emailComposer;

    @Inject
    ActorSystem system;


    @Restrict({@Group("STUDENT")})
    public CompletionStage<Result> getExamInfo(Long id) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }

        ExamEnrolment ee = Ebean.find(ExamEnrolment.class).where()
                .eq("collaborativeExam.id", id)
                .eq("user", getLoggedUser())
                .findOne();
        if (ee == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }

        return downloadExam(ce).thenApplyAsync(
                result -> {
                    if (!result.isPresent()) {
                        return notFound("sitnet_error_exam_not_found");
                    }
                    Exam exam = result.get();
                    return ok(exam, PathProperties.parse("(*, examLanguages(*))"));
                });

    }

    private Optional<Result> checkEnrolment(ExamEnrolment enrolment, Exam exam, User user) {
        // Removal not permitted if old reservation is in the past or if exam is already started
        Reservation oldReservation = enrolment.getReservation();
        if (exam.getState() == Exam.State.STUDENT_STARTED ||
                (oldReservation != null && oldReservation.toInterval().isBefore(DateTime.now()))) {
            return Optional.of(forbidden("sitnet_reservation_in_effect"));
        }
        // No previous reservation or it's in the future
        // If no previous reservation, check if allowed to participate. This check is skipped if user already
        // has a reservation to this exam so that change of reservation is always possible.
        if (oldReservation == null && !isAllowedToParticipate(exam, user, emailComposer)) {
            return Optional.of(forbidden("sitnet_no_trials_left"));
        }
        return Optional.empty();
    }


    @With(CalendarReservationSanitizer.class)
    @Restrict({@Group("STUDENT")})
    public CompletionStage<Result> createReservation() {
        Long roomId = request().attrs().get(Attrs.ROOM_ID);
        Long examId = request().attrs().get(Attrs.EXAM_ID);
        DateTime start = request().attrs().get(Attrs.START_DATE);
        DateTime end = request().attrs().get(Attrs.END_DATE);
        Collection<Integer> aids = request().attrs().get(Attrs.ACCESSABILITES);

        ExamRoom room = Ebean.find(ExamRoom.class, roomId);
        DateTime now = DateTimeUtils.adjustDST(DateTime.now(), room);
        final User user = getLoggedUser();

        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, examId);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }

        final ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .where()
                .eq("user.id", user.getId())
                .eq("collaborativeExam.id", examId)
                .disjunction()
                .isNull("reservation")
                .gt("reservation.startAt", now.toDate())
                .endJunction()
                .findOne();
        if (enrolment == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }

        return downloadExam(ce).thenApplyAsync(
                result -> {
                    if (!result.isPresent()) {
                        return notFound("sitnet_error_exam_not_found");
                    }
                    Exam exam = result.get();
                    Optional<Result> badEnrolment = checkEnrolment(enrolment, exam, user);
                    if (badEnrolment.isPresent()) {
                        return badEnrolment.get();
                    }
                    Optional<ExamMachine> machine = calendarHandler.getRandomMachine(room, exam, start, end, aids);
                    if (!machine.isPresent()) {
                        return forbidden("sitnet_no_machines_available");
                    }
                    // We are good to go :)
                    // Start manual transaction.
                    Ebean.beginTransaction();
                    try {
                        // Take pessimistic lock for user to prevent multiple reservations creating.
                        Ebean.find(User.class).forUpdate().where().eq("id", user.getId()).findOne();
                        Reservation oldReservation = enrolment.getReservation();
                        Reservation reservation = new Reservation();
                        reservation.setEndAt(end);
                        reservation.setStartAt(start);
                        reservation.setMachine(machine.get());
                        reservation.setUser(user);

                        // If this is due in less than a day, make sure we won't send a reminder
                        if (start.minusDays(1).isBeforeNow()) {
                            reservation.setReminderSent(true);
                        }
                        // Nuke the old reservation if any
                        if (oldReservation != null) {
                            enrolment.setReservation(null);
                            enrolment.update();
                            oldReservation.delete();
                        }
                        Result newReservation = makeNewReservation(enrolment, exam, reservation, user);
                        Ebean.commitTransaction();
                        return newReservation;
                    } finally {
                        // End transaction to release lock.
                        Ebean.endTransaction();
                    }
                });
    }

    private Result makeNewReservation(ExamEnrolment enrolment, Exam exam, Reservation reservation, User user) {
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.setReservationCanceled(false);
        enrolment.save();
        // Send some emails asynchronously
        system.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            emailComposer.composeReservationNotification(user, reservation, exam, false);
            Logger.info("Reservation confirmation email sent to {}", user.getEmail());
        }, system.dispatcher());

        return ok();
    }

    @Restrict({@Group("STUDENT")})
    public CompletionStage<Result> getSlots(Long examId, Long roomId, String day, Collection<Integer> aids) {
        User user = getLoggedUser();
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, examId);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        ExamEnrolment enrolment = getEnrolledExam(examId, user);
        if (enrolment == null) {
            return wrapAsPromise(forbidden("sitnet_error_enrolment_not_found"));
        }
        return downloadExam(ce).thenApplyAsync(
                result -> {
                    if (!result.isPresent()) {
                        return notFound("sitnet_error_exam_not_found");
                    }
                    Exam exam = result.get();
                    if (!exam.hasState(Exam.State.PUBLISHED)) {
                        return notFound("sitnet_error_exam_not_found");
                    }
                    return calendarHandler.getSlots(user, exam, roomId, day, aids);
                }
        );
    }

    private ExamEnrolment getEnrolledExam(Long examId, User user) {
        DateTime now = DateTimeUtils.adjustDST(DateTime.now());
        return Ebean.find(ExamEnrolment.class)
                .where()
                .eq("user", user)
                .eq("collaborativeExam.id", examId)
                .disjunction()
                .isNull("reservation")
                .gt("reservation.startAt", now.toDate())
                .endJunction()
                .findOne();
    }

}
