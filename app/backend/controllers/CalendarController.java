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

import java.util.Collection;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Result;
import play.mvc.With;
import scala.concurrent.duration.Duration;

import backend.controllers.base.BaseController;
import backend.controllers.iop.transfer.api.ExternalReservationHandler;
import backend.exceptions.NotFoundException;
import backend.impl.CalendarHandler;
import backend.impl.EmailComposer;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamMachine;
import backend.models.ExamRoom;
import backend.models.Reservation;
import backend.models.User;
import backend.sanitizers.Attrs;
import backend.sanitizers.CalendarReservationSanitizer;
import backend.util.DateTimeUtils;


public class CalendarController extends BaseController {

    @Inject
    protected CalendarHandler calendarHandler;

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem system;

    @Inject
    protected ExternalReservationHandler externalReservationHandler;


    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result removeReservation(long id) throws NotFoundException {
        User user = getLoggedUser();
        final ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("user.id", user.getId())
                .eq("reservation.id", id)
                .findOne();
        if (enrolment == null) {
            throw new NotFoundException(String.format("No reservation with id %d for current user.", id));
        }
        // Removal not permitted if reservation is in the past or ongoing
        final Reservation reservation = enrolment.getReservation();
        DateTime now = DateTimeUtils.adjustDST(DateTime.now(), reservation);
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return forbidden("sitnet_reservation_in_effect");
        }
        enrolment.setReservation(null);
        enrolment.setReservationCanceled(true);
        Ebean.save(enrolment);
        Ebean.delete(Reservation.class, id);

        // send email asynchronously
        final boolean isStudentUser = user.equals(enrolment.getUser());
        system.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            emailComposer.composeReservationCancellationNotification(enrolment.getUser(), reservation, "", isStudentUser, enrolment);
            Logger.info("Reservation cancellation confirmation email sent");
        }, system.dispatcher());
        return ok("removed");
    }

    protected Optional<Result> checkEnrolment(ExamEnrolment enrolment, User user) {
        if (enrolment == null) {
            return Optional.of(forbidden("sitnet_error_enrolment_not_found"));
        }
        // Removal not permitted if old reservation is in the past or if exam is already started
        Reservation oldReservation = enrolment.getReservation();
        if (enrolment.getExam().getState() == Exam.State.STUDENT_STARTED ||
                (oldReservation != null && oldReservation.toInterval().isBefore(DateTime.now()))) {
            return Optional.of(forbidden("sitnet_reservation_in_effect"));
        }
        // No previous reservation or it's in the future
        // If no previous reservation, check if allowed to participate. This check is skipped if user already
        // has a reservation to this exam so that change of reservation is always possible.
        if (oldReservation == null && !isAllowedToParticipate(enrolment.getExam(), user, emailComposer)) {
            return Optional.of(forbidden("sitnet_no_trials_left"));
        }
        return Optional.empty();
    }

    @With(CalendarReservationSanitizer.class)
    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public CompletionStage<Result> createReservation() {
        Long roomId = request().attrs().get(Attrs.ROOM_ID);
        Long examId = request().attrs().get(Attrs.EXAM_ID);
        DateTime start = request().attrs().get(Attrs.START_DATE);
        DateTime end = request().attrs().get(Attrs.END_DATE);
        Collection<Integer> aids = request().attrs().get(Attrs.ACCESSABILITES);

        ExamRoom room = Ebean.find(ExamRoom.class, roomId);
        DateTime now = DateTimeUtils.adjustDST(DateTime.now(), room);
        final User user = getLoggedUser();
        // Start manual transaction.
        Ebean.beginTransaction();
        try {
            // Take pessimistic lock for user to prevent multiple reservations creating.
            Ebean.find(User.class).forUpdate().where().eq("id", user.getId()).findOne();
            Optional<ExamEnrolment> optionalEnrolment = Ebean.find(ExamEnrolment.class)
                    .fetch("reservation")
                    .where()
                    .eq("user.id", user.getId())
                    .eq("exam.id", examId)
                    .eq("exam.state", Exam.State.PUBLISHED)
                    .disjunction()
                    .isNull("reservation")
                    .gt("reservation.startAt", now.toDate())
                    .endJunction()
                    .findOneOrEmpty();
            if (!optionalEnrolment.isPresent()) {
                return wrapAsPromise(notFound());
            }
            ExamEnrolment enrolment = optionalEnrolment.get();
            Optional<Result> badEnrolment = checkEnrolment(enrolment, user);
            if (badEnrolment.isPresent()) {
                return wrapAsPromise(badEnrolment.get());
            }
            Optional<ExamMachine> machine =
                    calendarHandler.getRandomMachine(room, enrolment.getExam(), start, end, aids);
            if (!machine.isPresent()) {
                return wrapAsPromise(forbidden("sitnet_no_machines_available"));
            }

            // We are good to go :)
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
                String externalReference = oldReservation.getExternalRef();
                if (externalReference != null) {
                    return externalReservationHandler.removeReservation(oldReservation, user)
                            .thenCompose(result -> {
                                // Refetch enrolment
                                ExamEnrolment updatedEnrolment = Ebean.find(ExamEnrolment.class, enrolment.getId());
                                if (updatedEnrolment == null) {
                                    return wrapAsPromise(notFound());
                                }
                                return makeNewReservation(updatedEnrolment, reservation, user);
                            });
                } else {
                    enrolment.setReservation(null);
                    enrolment.update();
                    oldReservation.delete();
                }
            }
            final CompletionStage<Result> result = makeNewReservation(enrolment, reservation, user);
            Ebean.commitTransaction();
            return result;
        } finally {
            // End transaction to release lock.
            Ebean.endTransaction();
        }
    }

    private CompletionStage<Result> makeNewReservation(ExamEnrolment enrolment, Reservation reservation, User user) {
        Ebean.save(reservation);
        enrolment.setReservation(reservation);
        enrolment.setReservationCanceled(false);
        Ebean.save(enrolment);
        Exam exam = enrolment.getExam();
        // Send some emails asynchronously
        system.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            emailComposer.composeReservationNotification(user, reservation, exam, false);
            Logger.info("Reservation confirmation email sent to {}", user.getEmail());
        }, system.dispatcher());

        return wrapAsPromise(ok("ok"));
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result getSlots(Long examId, Long roomId, String day, Collection<Integer> aids) {
        User user = getLoggedUser();
        ExamEnrolment ee = getEnrolment(examId, user);
        if (ee == null) {
            return forbidden("sitnet_error_enrolment_not_found");
        }
        return calendarHandler.getSlots(user, ee.getExam(), roomId, day, aids);
    }

    protected ExamEnrolment getEnrolment(Long examId, User user) {
        DateTime now = DateTimeUtils.adjustDST(DateTime.now());
        return Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where()
                .eq("user", user)
                .eq("exam.id", examId)
                .eq("exam.state", Exam.State.PUBLISHED)
                .disjunction()
                .isNull("reservation")
                .gt("reservation.startAt", now.toDate())
                .endJunction()
                .findOne();
    }

}
