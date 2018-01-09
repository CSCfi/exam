/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

import com.typesafe.config.ConfigFactory;
import models.Exam;
import models.ExamEnrolment;
import models.ExamInspection;
import models.Reservation;
import play.Logger;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;

import javax.inject.Inject;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class NoShowHandlerImpl implements NoShowHandler {

    private final EmailComposer composer;

    private final WSClient wsClient;

    private static final String HOST = ConfigFactory.load().getString("sitnet.integration.iop.host");

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
                Logger.error("No success in sending assessment #{} to XM", reservation.getExternalRef());
            } else {
                reservation.setNoShow(true);
                reservation.update();
                Logger.info("Successfully sent assessment #{} to XM", reservation.getExternalRef());
            }
            return null;
        };
        request.post(Json.newObject()).thenApplyAsync(onSuccess);
    }

    private static URL parseUrl(String reservationRef) throws MalformedURLException {
        return new URL(HOST + String.format("/api/enrolments/%s/noshow", reservationRef));
    }

    @Override
    public void handleNoShows(List<Reservation> noShows) {
        List<Reservation> locals = noShows.stream().filter(ns ->
                ns.getExternalRef() == null &&
                        ns.getEnrolment() != null &&
                        ns.getEnrolment().getExam() != null &&
                        ns.getEnrolment().getExam().getState() == Exam.State.PUBLISHED
        ).collect(Collectors.toList());
        locals.forEach(this::handleNoShowAndNotify);

        List<Reservation> externals = noShows.stream().filter(ns ->
                ns.getExternalRef() != null && (
                        ns.getUser() == null ||
                                ns.getEnrolment() == null ||
                                ns.getEnrolment().getExternalExam() == null ||
                                ns.getEnrolment().getExternalExam().getStarted() == null)
        ).collect(Collectors.toList());
        externals.forEach(r -> {
            // Send to XM for further processing
            // NOTE: Possible performance bottleneck here. It is not impossible that there are a lot of unprocessed
            // no-shows and sending them one by one over network would be inefficient. However, this is not very likely.
            try {
                send(r);
            } catch (IOException e) {
                Logger.error("Failed in sending assessment back", e);
            }
        });
    }

    @Override
    public void handleNoShowAndNotify(Reservation reservation) {
        reservation.setNoShow(true);
        reservation.update();
        Logger.info("Marked reservation {} as no-show",
                reservation.getId());
        ExamEnrolment enrolment = reservation.getEnrolment();
        Exam exam = enrolment.getExam();
        // Notify student
        composer.composeNoShowMessage(reservation.getUser(), exam);
        if (exam.isPrivate()) {
            // Notify teachers
            Stream.concat(
                    exam.getExamOwners().stream(),
                    exam.getExamInspections().stream().map(ExamInspection::getUser)
            ).forEach(teacher -> {
                composer.composeNoShowMessage(teacher, enrolment.getUser(), exam);
                Logger.info("Email sent to {}", teacher.getEmail());
            });
        }
    }
}
