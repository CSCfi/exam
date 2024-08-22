// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl;

import com.fasterxml.jackson.databind.JsonNode;
import controllers.iop.transfer.api.ExternalReservationHandler;
import impl.mail.EmailComposer;
import io.ebean.DB;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import javax.inject.Inject;
import miscellaneous.config.ConfigReader;
import miscellaneous.datetime.DateTimeHandler;
import models.enrolment.ExamEnrolment;
import models.enrolment.ExternalReservation;
import models.enrolment.Reservation;
import models.user.User;
import org.apache.pekko.actor.ActorSystem;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;
import scala.concurrent.duration.Duration;
import scala.jdk.javaapi.OptionConverters;

public class ExternalReservationHandlerImpl implements ExternalReservationHandler {

    @Inject
    WSClient wsClient;

    @Inject
    ActorSystem system;

    @Inject
    EmailComposer emailComposer;

    @Inject
    DateTimeHandler dateTimeHandler;

    @Inject
    ConfigReader configReader;

    private final Logger logger = LoggerFactory.getLogger(ExternalReservationHandlerImpl.class);

    private URL parseUrl(String orgRef, String facilityRef, String reservationRef) throws MalformedURLException {
        StringBuilder sb = new StringBuilder(configReader.getIopHost());
        sb.append(String.format("/api/organisations/%s/facilities/%s/reservations", orgRef, facilityRef));
        if (reservationRef != null) {
            sb.append("/").append(reservationRef);
        }
        return URI.create(sb.toString()).toURL();
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
        final ExamEnrolment enrolment = DB.find(ExamEnrolment.class)
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
        DateTime now = dateTimeHandler.adjustDST(DateTime.now(), reservation.getExternalReservation());
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return CompletableFuture.completedFuture(Results.forbidden("i18n_reservation_in_effect"));
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
            DB.save(enrolment);
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
                            OptionConverters.toScala(Optional.of(msg)),
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
