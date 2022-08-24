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

package impl;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Stream;
import javax.inject.Inject;
import models.Exam;
import models.ExamEnrolment;
import models.ExamInspection;
import models.Reservation;
import play.Logger;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import util.config.ConfigReader;

public class NoShowHandlerImpl implements NoShowHandler {

    private final EmailComposer composer;

    private final WSClient wsClient;

    private final ConfigReader configReader;

    private static final Logger.ALogger logger = Logger.of(NoShowHandlerImpl.class);

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
            if (response.getStatus() != 200) {
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

    private URL parseUrl(String reservationRef) throws MalformedURLException {
        return new URL(configReader.getIopHost() + String.format("/api/enrolments/%s/noshow", reservationRef));
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
    public void handleNoShows(List<ExamEnrolment> noShows) {
        Stream<ExamEnrolment> locals = noShows
            .stream()
            .filter(this::isNoShow)
            .filter(ns -> isLocal(ns) || isCollaborative(ns));
        locals.forEach(this::handleNoShowAndNotify);

        Stream<ExamEnrolment> externals = noShows
            .stream()
            .filter(ns ->
                ns.getReservation() != null &&
                ns.getReservation().getExternalRef() != null &&
                (ns.getUser() == null || ns.getExternalExam() == null || ns.getExternalExam().getStarted() == null)
            );
        externals.forEach(r -> {
            // Send to XM for further processing
            // NOTE: Possible performance bottleneck here. It is not impossible that there are a lot of unprocessed
            // no-shows and sending them one by one over network would be inefficient. However, this is not very likely.
            try {
                send(r);
            } catch (IOException e) {
                logger.error("Failed in sending assessment back", e);
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
            enrolment.setReservation(null);
            enrolment.update();
            if (reservation != null) {
                reservation.delete();
            }
        }
        enrolment.setNoShow(true);
        enrolment.update();
        logger.info("Marked enrolment {} as no-show", enrolment.getId());

        String examName = exam == null ? enrolment.getCollaborativeExam().getName() : enrolment.getExam().getName();
        String courseCode = exam == null ? "" : enrolment.getExam().getCourse().getCode();

        // Notify student
        composer.composeNoShowMessage(enrolment.getUser(), examName, courseCode);
        if (exam != null && exam.isPrivate()) {
            // Notify teachers
            Stream
                .concat(exam.getExamOwners().stream(), exam.getExamInspections().stream().map(ExamInspection::getUser))
                .forEach(teacher -> {
                    composer.composeNoShowMessage(teacher, enrolment.getUser(), exam);
                    logger.info("Email sent to {}", teacher.getEmail());
                });
        }
    }
}
