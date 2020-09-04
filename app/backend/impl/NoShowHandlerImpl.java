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

package backend.impl;

import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamInspection;
import backend.models.Reservation;
import com.typesafe.config.ConfigFactory;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Stream;
import javax.inject.Inject;
import play.Logger;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;

public class NoShowHandlerImpl implements NoShowHandler {
    private final EmailComposer composer;

    private final WSClient wsClient;

    private static final String HOST = ConfigFactory.load().getString("sitnet.integration.iop.host");

    private static final Logger.ALogger logger = Logger.of(NoShowHandlerImpl.class);

    @Inject
    public NoShowHandlerImpl(EmailComposer composer, WSClient wsClient) {
        this.composer = composer;
        this.wsClient = wsClient;
    }

    private void send(Reservation reservation) throws MalformedURLException {
        URL url = parseUrl(reservation.getExternalRef());
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, Void> onSuccess = response -> {
            if (response.getStatus() != 200) {
                logger.error("No success in sending assessment #{} to XM", reservation.getExternalRef());
            } else {
                reservation.setNoShow(true);
                reservation.update();
                logger.info("Successfully sent assessment #{} to XM", reservation.getExternalRef());
            }
            return null;
        };
        request.post(Json.newObject()).thenApplyAsync(onSuccess);
    }

    private static URL parseUrl(String reservationRef) throws MalformedURLException {
        return new URL(HOST + String.format("/api/enrolments/%s/noshow", reservationRef));
    }

    private boolean isLocal(ExamEnrolment ee) {
        return (ee.getExam() != null && ee.getExam().getState() == Exam.State.PUBLISHED);
    }

    private boolean isCollaborative(ExamEnrolment ee) {
        return ee.getCollaborativeExam() != null && ee.getExam() == null;
    }

    @Override
    public void handleNoShows(List<Reservation> noShows) {
        Stream<Reservation> locals = noShows
            .stream()
            .filter(ns -> ns.getExternalRef() == null && ns.getEnrolment() != null)
            .filter(ns -> isLocal(ns.getEnrolment()) || isCollaborative(ns.getEnrolment()));
        locals.forEach(this::handleNoShowAndNotify);

        Stream<Reservation> externals = noShows
            .stream()
            .filter(
                ns ->
                    ns.getExternalRef() != null &&
                    (
                        ns.getUser() == null ||
                        ns.getEnrolment() == null ||
                        ns.getEnrolment().getExternalExam() == null ||
                        ns.getEnrolment().getExternalExam().getStarted() == null
                    )
            );
        externals.forEach(
            r -> {
                // Send to XM for further processing
                // NOTE: Possible performance bottleneck here. It is not impossible that there are a lot of unprocessed
                // no-shows and sending them one by one over network would be inefficient. However, this is not very likely.
                try {
                    send(r);
                } catch (IOException e) {
                    logger.error("Failed in sending assessment back", e);
                }
            }
        );
    }

    @Override
    public void handleNoShowAndNotify(Reservation reservation) {
        ExamEnrolment enrolment = reservation.getEnrolment();
        Exam exam = enrolment.getExam();
        if (exam != null && exam.isPrivate()) {
            // For no-shows with private examinations we remove the reservation so student can re-reserve.
            // This is needed because student is not able to re-enroll by himself.
            enrolment.setReservation(null);
            enrolment.update();
            reservation.delete();
        } else {
            reservation.setNoShow(true);
            reservation.update();
        }
        logger.info("Marked reservation {} as no-show", reservation.getId());

        String examName = exam == null ? enrolment.getCollaborativeExam().getName() : enrolment.getExam().getName();
        String courseCode = exam == null ? "" : enrolment.getExam().getCourse().getCode();

        // Notify student
        composer.composeNoShowMessage(reservation.getUser(), examName, courseCode);
        if (exam != null && exam.isPrivate()) {
            // Notify teachers
            Stream
                .concat(exam.getExamOwners().stream(), exam.getExamInspections().stream().map(ExamInspection::getUser))
                .forEach(
                    teacher -> {
                        composer.composeNoShowMessage(teacher, enrolment.getUser(), exam);
                        logger.info("Email sent to {}", teacher.getEmail());
                    }
                );
        }
    }
}
