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

package backend.controllers.iop.transfer.impl;

import akka.actor.ActorSystem;
import backend.controllers.iop.transfer.api.ExternalReservationHandler;
import backend.impl.EmailComposer;
import backend.models.ExamEnrolment;
import backend.models.Reservation;
import backend.models.User;
import backend.models.iop.ExternalReservation;
import backend.util.datetime.DateTimeUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import javax.inject.Inject;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;
import scala.concurrent.duration.Duration;

public class ExternalReservationHandlerImpl implements ExternalReservationHandler {
    @Inject
    WSClient wsClient;

    @Inject
    ActorSystem system;

    @Inject
    EmailComposer emailComposer;

    private static final Logger.ALogger logger = Logger.of(ExternalReservationHandlerImpl.class);

    private static URL parseUrl(String orgRef, String facilityRef, String reservationRef) throws MalformedURLException {
        StringBuilder sb = new StringBuilder(ConfigFactory.load().getString("sitnet.integration.iop.host"));
        sb.append(String.format("/api/organisations/%s/facilities/%s/reservations", orgRef, facilityRef));
        if (reservationRef != null) {
            sb.append("/").append(reservationRef);
        }
        return new URL(sb.toString());
    }

    @Override
    public CompletionStage<Optional<Integer>> removeExternalReservation(Reservation reservation) {
        ExternalReservation external = reservation.getExternalReservation();
        URL url;
        try {
            url = parseUrl(external.getOrgRef(), external.getRoomRef(), reservation.getExternalRef());
        } catch (MalformedURLException e) {
            return CompletableFuture.completedFuture(Optional.of(Http.Status.INTERNAL_SERVER_ERROR));
        }
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, Optional<Integer>> onSuccess = response -> {
            if (response.getStatus() != Http.Status.OK) {
                return Optional.of(Http.Status.INTERNAL_SERVER_ERROR);
            }
            return Optional.empty();
        };
        return request.delete().thenApplyAsync(onSuccess);
    }

    private CompletionStage<Result> requestRemoval(String ref, User user, String msg) throws IOException {
        final ExamEnrolment enrolment = Ebean
            .find(ExamEnrolment.class)
            .fetch("reservation")
            .fetch("reservation.machine")
            .fetch("reservation.machine.room")
            .where()
            .eq("user.id", user.getId())
            .eq("reservation.externalRef", ref)
            .findOne();
        if (enrolment == null) {
            return CompletableFuture.completedFuture(
                Results.notFound(String.format("No reservation with ref %s for current user.", ref))
            );
        }
        // Removal not permitted if reservation is in the past or ongoing
        final Reservation reservation = enrolment.getReservation();
        DateTime now = DateTimeUtils.adjustDST(DateTime.now(), reservation.getExternalReservation());
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return CompletableFuture.completedFuture(Results.forbidden("sitnet_reservation_in_effect"));
        }
        // good to go
        ExternalReservation external = reservation.getExternalReservation();
        URL url = parseUrl(external.getOrgRef(), external.getRoomRef(), ref);
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, Result> onSuccess = response -> {
            if (response.getStatus() != Http.Status.OK) {
                JsonNode root = response.asJson();
                return Results.internalServerError(root.get("message").asText("Connection refused"));
            }
            enrolment.setReservation(null);
            enrolment.setReservationCanceled(true);
            Ebean.save(enrolment);
            reservation.delete();

            // send email asynchronously
            boolean isStudentUser = user.equals(enrolment.getUser());
            system
                .scheduler()
                .scheduleOnce(
                    Duration.create(1, TimeUnit.SECONDS),
                    () -> {
                        emailComposer.composeReservationCancellationNotification(
                            enrolment.getUser(),
                            reservation,
                            msg,
                            isStudentUser,
                            enrolment
                        );
                        logger.info("Reservation cancellation confirmation email sent");
                    },
                    system.dispatcher()
                );

            return Results.ok();
        };
        return request.delete().thenApplyAsync(onSuccess);
    }

    // remove reservation on external side, initiated by reservation holder
    @Override
    public CompletionStage<Result> removeReservation(Reservation reservation, User user, String msg) {
        if (reservation.getExternalReservation() == null) {
            return CompletableFuture.completedFuture(Results.ok());
        }
        try {
            return requestRemoval(reservation.getExternalRef(), user, msg);
        } catch (IOException e) {
            return CompletableFuture.completedFuture(Results.internalServerError(e.getMessage()));
        }
    }
}
