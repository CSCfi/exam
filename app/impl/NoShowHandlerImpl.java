// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Stream;
import javax.inject.Inject;
import models.Exam;
import models.ExamEnrolment;
import models.ExamInspection;
import models.ExaminationEventConfiguration;
import models.Reservation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import util.config.ConfigReader;

public class NoShowHandlerImpl implements NoShowHandler {

    private final EmailComposer composer;

    private final WSClient wsClient;

    private final ConfigReader configReader;

    private final Logger logger = LoggerFactory.getLogger(NoShowHandlerImpl.class);

    @Inject
    public NoShowHandlerImpl(EmailComposer composer, WSClient wsClient, ConfigReader configReader) {
        this.composer = composer;
        this.wsClient = wsClient;
        this.configReader = configReader;
    }

    private void send(ExamEnrolment enrolment) throws MalformedURLException {
        URL url = parseUrl(enrolment.getReservation().getExternalRef());
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, Void> onSuccess = response -> {
            if (response.getStatus() != Http.Status.OK) {
                logger.error("No success in sending assessment #{} to XM", enrolment.getReservation().getExternalRef());
            } else {
                enrolment.setNoShow(true);
                enrolment.update();
                logger.info("Successfully sent assessment #{} to XM", enrolment.getReservation().getExternalRef());
            }
            return null;
        };
        request.post(Json.newObject()).thenApplyAsync(onSuccess);
    }

    private void send(Reservation reservation) throws MalformedURLException {
        URL url = parseUrl(reservation.getExternalRef());
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, Void> onSuccess = response -> {
            if (response.getStatus() != Http.Status.OK) {
                logger.error("No success in sending no-show #{} to XM", reservation.getExternalRef());
            } else {
                // Reservations without an enrolment meaning remote user didn't turn up at all
                reservation.setSentAsNoShow(true);
                reservation.update();
                logger.info("Successfully sent no-show #{} to XM", reservation.getExternalRef());
            }
            return null;
        };
        request.post(Json.newObject()).thenApplyAsync(onSuccess);
    }

    private URL parseUrl(String reservationRef) throws MalformedURLException {
        return URI.create(
            configReader.getIopHost() + String.format("/api/enrolments/%s/noshow", reservationRef)
        ).toURL();
    }

    private boolean isLocal(ExamEnrolment ee) {
        return (ee.getExam() != null && ee.getExam().hasState(Exam.State.PUBLISHED, Exam.State.INITIALIZED));
    }

    private boolean isCollaborative(ExamEnrolment ee) {
        return ee.getCollaborativeExam() != null && ee.getExam() == null;
    }

    private boolean isNoShow(ExamEnrolment enrolment) {
        return (
            (enrolment.getReservation() != null && enrolment.getReservation().getExternalRef() == null) ||
            enrolment.getExaminationEventConfiguration() != null
        );
    }

    @Override
    public void handleNoShows(List<ExamEnrolment> noShows, List<Reservation> reservations) {
        Stream<ExamEnrolment> locals = noShows
            .stream()
            .filter(this::isNoShow)
            .filter(ns -> isLocal(ns) || isCollaborative(ns));
        locals.forEach(this::handleNoShowAndNotify);
        Stream<ExamEnrolment> externals = noShows
            .stream()
            .filter(
                ns ->
                    ns.getReservation() != null &&
                    ns.getReservation().getExternalRef() != null &&
                    !ns.getReservation().isSentAsNoShow() &&
                    (ns.getUser() == null || ns.getExternalExam() == null || ns.getExternalExam().getStarted() == null)
            );
        // Send to XM for further processing
        // NOTE: Possible performance bottleneck here. It is not impossible that there are a lot of unprocessed
        // no-shows and sending them one by one over network would be inefficient. However, this is not very likely.
        externals.forEach(r -> {
            try {
                send(r);
            } catch (IOException e) {
                logger.error("Failed in sending no-show back", e);
            }
        });
        reservations.forEach(r -> {
            try {
                send(r);
            } catch (IOException e) {
                logger.error("Failed in sending no-show back", e);
            }
        });
    }

    @Override
    public void handleNoShowAndNotify(ExamEnrolment enrolment) {
        Exam exam = enrolment.getExam();
        if (exam != null && exam.isPrivate()) {
            // For no-shows with private examinations we remove the reservation so student can re-reserve.
            // This is needed because student is not able to re-enroll by himself.
            Reservation reservation = enrolment.getReservation();
            ExaminationEventConfiguration eec = enrolment.getExaminationEventConfiguration();
            enrolment.setReservation(null);
            enrolment.setExaminationEventConfiguration(null);
            enrolment.setNoShow(false);
            enrolment.update();
            if (reservation != null) {
                reservation.delete();
            }
            if (eec != null) {
                eec.delete();
            }
        } else {
            enrolment.setNoShow(true);
        }
        enrolment.update();

        String examName = exam == null ? enrolment.getCollaborativeExam().getName() : enrolment.getExam().getName();
        String courseCode = (exam == null || exam.getCourse() == null) ? "" : enrolment.getExam().getCourse().getCode();

        // Notify student
        composer.composeNoShowMessage(enrolment.getUser(), examName, courseCode);
        if (exam != null && exam.isPrivate()) {
            // Notify teachers
            Stream.concat(
                exam.getExamOwners().stream(),
                exam.getExamInspections().stream().map(ExamInspection::getUser)
            ).forEach(teacher -> {
                composer.composeNoShowMessage(teacher, enrolment.getUser(), exam);
                logger.info("Email sent to {}", teacher.getEmail());
            });
        }
    }
}
