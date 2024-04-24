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

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import controllers.iop.transfer.api.ExternalReservationHandler;
import exceptions.NotFoundException;
import impl.CalendarHandler;
import impl.EmailComposer;
import io.ebean.DB;
import io.ebean.Transaction;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import models.Exam;
import models.ExamEnrolment;
import models.ExamMachine;
import models.ExamRoom;
import models.Reservation;
import models.User;
import models.sections.ExamSection;
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
import util.config.ConfigReader;
import util.datetime.DateTimeHandler;

public class CalendarController extends BaseController {

    @Inject
    protected CalendarHandler calendarHandler;

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem system;

    @Inject
    protected ConfigReader configReader;

    @Inject
    protected DateTimeHandler dateTimeHandler;

    @Inject
    protected ExternalReservationHandler externalReservationHandler;

    private final Logger logger = LoggerFactory.getLogger(CalendarController.class);

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result removeReservation(long id, Http.Request request) throws NotFoundException {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        final ExamEnrolment enrolment = DB.find(ExamEnrolment.class)
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
        DateTime now = dateTimeHandler.adjustDST(DateTime.now(), reservation);
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return forbidden("i18n_reservation_in_effect");
        }
        enrolment.setReservation(null);
        enrolment.setReservationCanceled(true);
        DB.save(enrolment);
        DB.delete(Reservation.class, id);

        // send email asynchronously
        final boolean isStudentUser = user.equals(enrolment.getUser());

        system
            .scheduler()
            .scheduleOnce(
                Duration.create(1, TimeUnit.SECONDS),
                () -> {
                    emailComposer.composeReservationCancellationNotification(
                        enrolment.getUser(),
                        reservation,
                        "",
                        isStudentUser,
                        enrolment
                    );
                    logger.info("Reservation cancellation confirmation email sent");
                },
                system.dispatcher()
            );
        return ok();
    }

    protected Optional<Result> checkEnrolment(ExamEnrolment enrolment, User user, Collection<Long> sectionIds) {
        if (enrolment.getExam().getImplementation() != Exam.Implementation.AQUARIUM) {
            return Optional.of(forbidden("SEB exam does not take reservations"));
        }
        // Removal not permitted if old reservation is in the past or if exam is already started
        Reservation oldReservation = enrolment.getReservation();
        if (
            enrolment.getExam().getState() == Exam.State.STUDENT_STARTED ||
            (oldReservation != null && oldReservation.toInterval().isBefore(DateTime.now()))
        ) {
            return Optional.of(forbidden("i18n_reservation_in_effect"));
        }
        // No previous reservation or it's in the future
        // If no previous reservation, check if allowed to participate. This check is skipped if user already
        // has a reservation to this exam so that change of reservation is always possible.
        if (oldReservation == null && !isAllowedToParticipate(enrolment.getExam(), user)) {
            return Optional.of(forbidden("i18n_no_trials_left"));
        }
        // Check that at least one section will end up in the exam
        Set<ExamSection> sections = enrolment.getExam().getExamSections();
        if (sections.stream().allMatch(ExamSection::isOptional)) {
            if (sections.stream().noneMatch(es -> sectionIds.contains(es.getId()))) {
                return Optional.of(forbidden("No optional sections selected. At least one needed"));
            }
        }
        if (
            oldReservation != null &&
            oldReservation.getExternalRef() != null &&
            !oldReservation.getStartAt().isAfter(dateTimeHandler.adjustDST(DateTime.now())) &&
            !enrolment.isNoShow() &&
            enrolment.getExam().getState().equals(Exam.State.PUBLISHED)
        ) {
            // External reservation, assessment not returned yet. We must wait for it to arrive first
            return Optional.of(forbidden("i18n_enrolment_assessment_not_received"));
        }

        return Optional.empty();
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    public Result getCurrentEnrolment(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        DateTime now = dateTimeHandler.adjustDST(DateTime.now());
        Optional<ExamEnrolment> enrolment = DB.find(ExamEnrolment.class)
            .fetch("optionalSections")
            .where()
            .eq("user.id", user.getId())
            .eq("exam.id", id)
            .eq("exam.state", Exam.State.PUBLISHED)
            .gt("reservation.startAt", now.toDate())
            .findOneOrEmpty();
        return enrolment.map(this::ok).orElse(ok());
    }

    @Authenticated
    @With(CalendarReservationSanitizer.class)
    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public CompletionStage<Result> createReservation(Http.Request request) {
        Long roomId = request.attrs().get(Attrs.ROOM_ID);
        Long examId = request.attrs().get(Attrs.EXAM_ID);
        DateTime start = request.attrs().get(Attrs.START_DATE);
        DateTime end = request.attrs().get(Attrs.END_DATE);
        Collection<Integer> aids = request.attrs().get(Attrs.ACCESSABILITES);
        Collection<Long> sectionIds = request.attrs().get(Attrs.SECTION_IDS);

        ExamRoom room = DB.find(ExamRoom.class, roomId);
        DateTime now = dateTimeHandler.adjustDST(DateTime.now(), room);
        final User user = request.attrs().get(Attrs.AUTHENTICATED_USER);

        // Start manual transaction.
        try (Transaction tx = DB.beginTransaction()) {
            // Take pessimistic lock for user to prevent multiple reservations creating.
            DB.find(User.class).forUpdate().where().eq("id", user.getId()).findOne();
            Optional<ExamEnrolment> optionalEnrolment = DB.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("exam.examSections")
                .fetch("exam.examSections.examMaterials")
                .where()
                .eq("user.id", user.getId())
                .eq("exam.id", examId)
                .eq("exam.state", Exam.State.PUBLISHED)
                .disjunction()
                .isNull("reservation")
                .gt("reservation.startAt", now.toDate())
                .endJunction()
                .findOneOrEmpty();
            if (optionalEnrolment.isEmpty()) {
                return wrapAsPromise(forbidden("i18n_error_enrolment_not_found"));
            }
            ExamEnrolment enrolment = optionalEnrolment.get();
            Optional<Result> badEnrolment = checkEnrolment(enrolment, user, sectionIds);
            if (badEnrolment.isPresent()) {
                return wrapAsPromise(badEnrolment.get());
            }

            Optional<ExamMachine> machine = calendarHandler.getRandomMachine(
                room,
                enrolment.getExam(),
                start,
                end,
                aids
            );
            if (machine.isEmpty()) {
                return wrapAsPromise(forbidden("i18n_no_machines_available"));
            }

            // Check that the proposed reservation is (still) doable
            Reservation proposedReservation = new Reservation();
            proposedReservation.setStartAt(start);
            proposedReservation.setEndAt(end);
            proposedReservation.setMachine(machine.get());
            proposedReservation.setUser(user);
            proposedReservation.setEnrolment(enrolment);
            if (!calendarHandler.isDoable(proposedReservation, aids)) {
                return wrapAsPromise(forbidden("i18n_no_machines_available"));
            }

            // We are good to go :)
            Reservation oldReservation = enrolment.getReservation();
            Reservation reservation = calendarHandler.createReservation(start, end, machine.get(), user);

            // Nuke the old reservation if any
            if (oldReservation != null) {
                String externalReference = oldReservation.getExternalRef();
                if (externalReference != null) {
                    return externalReservationHandler
                        .removeReservation(oldReservation, user, "")
                        .thenCompose(result -> {
                            // Refetch enrolment
                            ExamEnrolment updatedEnrolment = DB.find(ExamEnrolment.class)
                                .fetch("exam.executionType")
                                .where()
                                .idEq(enrolment.getId())
                                .findOne();
                            if (updatedEnrolment == null) {
                                return wrapAsPromise(notFound());
                            }
                            return makeNewReservation(updatedEnrolment, reservation, user, sectionIds);
                        });
                } else {
                    enrolment.setReservation(null);
                    enrolment.update();
                    oldReservation.delete();
                }
            }
            final CompletionStage<Result> result = makeNewReservation(enrolment, reservation, user, sectionIds);
            tx.commit();
            return result;
        }
    }

    private CompletionStage<Result> makeNewReservation(
        ExamEnrolment enrolment,
        Reservation reservation,
        User user,
        Collection<Long> sectionIds
    ) {
        DB.save(reservation);
        enrolment.setReservation(reservation);
        enrolment.setReservationCanceled(false);
        enrolment.getOptionalSections().clear();
        enrolment.update();
        if (!sectionIds.isEmpty()) {
            Set<ExamSection> sections = DB.find(ExamSection.class).where().idIn(sectionIds).findSet();
            enrolment.setOptionalSections(sections);
        }
        if (enrolment.getExam().isPrivate()) {
            enrolment.setNoShow(false);
        }
        DB.save(enrolment);
        Exam exam = enrolment.getExam();
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

        return wrapAsPromise(ok());
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result getSlots(Long examId, Long roomId, String day, Optional<List<Integer>> aids, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment ee = getEnrolment(examId, user);
        // Sanity check so that we avoid accidentally getting reservations for SEB exams
        if (ee == null || ee.getExam().getImplementation() != Exam.Implementation.AQUARIUM) {
            return forbidden("i18n_error_enrolment_not_found");
        }
        List<Integer> accessibilityIds = aids.orElse(Collections.emptyList());
        return calendarHandler.getSlots(user, ee.getExam(), roomId, day, accessibilityIds);
    }

    protected ExamEnrolment getEnrolment(Long examId, User user) {
        DateTime now = dateTimeHandler.adjustDST(DateTime.now());
        return DB.find(ExamEnrolment.class)
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
