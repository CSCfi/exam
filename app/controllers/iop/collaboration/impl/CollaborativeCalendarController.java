// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.collaboration.impl;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import impl.CalendarHandler;
import impl.mail.EmailComposer;
import io.ebean.DB;
import io.ebean.Transaction;
import io.ebean.text.PathProperties;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import miscellaneous.datetime.DateTimeHandler;
import miscellaneous.enrolment.EnrolmentHandler;
import models.enrolment.ExamEnrolment;
import models.enrolment.Reservation;
import models.exam.Exam;
import models.facility.ExamMachine;
import models.facility.ExamRoom;
import models.iop.CollaborativeExam;
import models.sections.ExamSection;
import models.user.User;
import org.apache.pekko.actor.ActorSystem;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.CalendarReservationSanitizer;
import scala.concurrent.duration.Duration;
import security.Authenticated;

public class CollaborativeCalendarController extends CollaborationController {

    @Inject
    CalendarHandler calendarHandler;

    @Inject
    EmailComposer emailComposer;

    @Inject
    ActorSystem system;

    @Inject
    DateTimeHandler dateTimeHandler;

    @Inject
    EnrolmentHandler enrolmentHandler;

    private final Logger logger = LoggerFactory.getLogger(CollaborativeCalendarController.class);

    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> getExamInfo(Long id) {
        CollaborativeExam ce = DB.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("i18n_error_exam_not_found"));
        }

        return downloadExam(ce).thenApplyAsync(result -> {
                if (result.isEmpty()) {
                    return notFound("i18n_error_exam_not_found");
                }
                Exam exam = result.get();
                return ok(exam, PathProperties.parse("(*, examSections(*, examMaterials(*)), examLanguages(*))"));
            });
    }

    protected Optional<Result> checkEnrolment(ExamEnrolment enrolment, Exam exam, User user) {
        // Removal not permitted if old reservation is in the past or if exam is already started
        Reservation oldReservation = enrolment.getReservation();
        if (
            exam.getState() == Exam.State.STUDENT_STARTED ||
            (oldReservation != null && oldReservation.toInterval().isBefore(DateTime.now()))
        ) {
            return Optional.of(forbidden("i18n_reservation_in_effect"));
        }
        // No previous reservation or it's in the future
        // If no previous reservation, check if allowed to participate. This check is skipped if user already
        // has a reservation to this exam so that change of reservation is always possible.
        if (oldReservation == null && !enrolmentHandler.isAllowedToParticipate(exam, user)) {
            return Optional.of(forbidden("i18n_no_trials_left"));
        }
        return Optional.empty();
    }

    @Authenticated
    @With(CalendarReservationSanitizer.class)
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> createReservation(Http.Request request) {
        Long roomId = request.attrs().get(Attrs.ROOM_ID);
        Long examId = request.attrs().get(Attrs.EXAM_ID);
        DateTime start = request.attrs().get(Attrs.START_DATE);
        DateTime end = request.attrs().get(Attrs.END_DATE);
        Collection<Integer> aids = request.attrs().get(Attrs.ACCESSIBILITIES);
        Collection<Long> sectionIds = request.attrs().get(Attrs.SECTION_IDS);

        ExamRoom room = DB.find(ExamRoom.class, roomId);
        DateTime now = dateTimeHandler.adjustDST(DateTime.now(), room);
        final User user = request.attrs().get(Attrs.AUTHENTICATED_USER);

        CollaborativeExam ce = DB.find(CollaborativeExam.class, examId);
        if (ce == null) {
            return wrapAsPromise(notFound("i18n_error_exam_not_found"));
        }

        final ExamEnrolment enrolment = DB.find(ExamEnrolment.class)
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
            return wrapAsPromise(notFound("i18n_error_exam_not_found"));
        }

        return downloadExam(ce).thenApplyAsync(result -> {
                if (result.isEmpty()) {
                    return notFound("i18n_error_exam_not_found");
                }
                Exam exam = result.get();
                Optional<Result> badEnrolment = checkEnrolment(enrolment, exam, user);
                if (badEnrolment.isPresent()) {
                    return badEnrolment.get();
                }
                Optional<ExamMachine> machine = calendarHandler.getRandomMachine(room, exam, start, end, aids);
                if (machine.isEmpty()) {
                    return forbidden("i18n_no_machines_available");
                }
                // We are good to go :)
                // Start manual transaction.
                try (Transaction tx = DB.beginTransaction()) {
                    // Take pessimistic lock for user to prevent multiple reservations creating.
                    DB.find(User.class).forUpdate().where().eq("id", user.getId()).findOne();
                    Reservation oldReservation = enrolment.getReservation();
                    Reservation reservation = calendarHandler.createReservation(start, end, machine.get(), user);
                    // Nuke the old reservation if any
                    if (oldReservation != null) {
                        enrolment.setReservation(null);
                        enrolment.update();
                        oldReservation.delete();
                    }
                    Result newReservation = makeNewReservation(enrolment, exam, reservation, user, sectionIds);
                    tx.commit();
                    return newReservation;
                }
            });
    }

    private Result makeNewReservation(
        ExamEnrolment enrolment,
        Exam exam,
        Reservation reservation,
        User user,
        Collection<Long> sectionIds
    ) {
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.setReservationCanceled(false);
        Set<ExamSection> sections = sectionIds.isEmpty()
            ? Collections.emptySet()
            : DB.find(ExamSection.class).where().idIn(sectionIds).findSet();
        enrolment.setOptionalSections(sections);
        enrolment.save();
        // Send some emails asynchronously
        system
            .scheduler()
            .scheduleOnce(
                Duration.create(1, TimeUnit.SECONDS),
                () -> {
                    emailComposer.composeReservationNotification(user, reservation, exam, false);
                    logger.info("Reservation confirmation email sent to {}", user.getEmail());
                },
                system.dispatcher()
            );

        return ok();
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> getSlots(
        Long examId,
        Long roomId,
        String day,
        Optional<List<Integer>> aids,
        Http.Request request
    ) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        CollaborativeExam ce = DB.find(CollaborativeExam.class, examId);
        if (ce == null) {
            return wrapAsPromise(notFound("i18n_error_exam_not_found"));
        }
        ExamEnrolment enrolment = getEnrolledExam(examId, user);
        if (enrolment == null) {
            return wrapAsPromise(forbidden("i18n_error_enrolment_not_found"));
        }
        return downloadExam(ce).thenApplyAsync(result -> {
                if (result.isEmpty()) {
                    return notFound("i18n_error_exam_not_found");
                }
                Exam exam = result.get();
                if (!exam.hasState(Exam.State.PUBLISHED)) {
                    return notFound("i18n_error_exam_not_found");
                }
                List<Integer> accessibilityIds = aids.orElse(Collections.emptyList());
                return calendarHandler.getSlots(user, exam, roomId, day, accessibilityIds);
            });
    }

    private ExamEnrolment getEnrolledExam(Long examId, User user) {
        DateTime now = dateTimeHandler.adjustDST(DateTime.now());
        return DB.find(ExamEnrolment.class)
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
