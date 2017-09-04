package controllers.iop;

import akka.actor.ActorSystem;
import com.fasterxml.jackson.databind.JsonNode;
import com.typesafe.config.ConfigFactory;
import controllers.iop.api.ExternalReservationHandler;
import io.ebean.Ebean;
import models.ExamEnrolment;
import models.Reservation;
import models.User;
import models.iop.ExternalReservation;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;
import play.mvc.Results;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

public class ExternalReservationHandlerImpl implements ExternalReservationHandler {

    @Inject
    WSClient wsClient;

    @Inject
    ActorSystem system;

    @Inject
    EmailComposer emailComposer;


    private static URL parseUrl(String orgRef, String facilityRef, String reservationRef)
            throws MalformedURLException {
        StringBuilder sb = new StringBuilder(ConfigFactory.load().getString("sitnet.integration.iop.host"));
        sb.append(String.format("/api/organisations/%s/facilities/%s/reservations", orgRef, facilityRef));
        if (reservationRef != null) {
            sb.append("/").append(reservationRef);
        }
        return new URL(sb.toString());
    }

    private CompletionStage<Result> requestRemoval(String ref, User user) throws IOException {
        final ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("user.id", user.getId())
                .eq("reservation.externalRef", ref)
                .findUnique();
        if (enrolment == null) {
            return CompletableFuture.supplyAsync(() -> Results.notFound(String.format("No reservation with ref %s for current user.", ref)));
        }
        // Removal not permitted if reservation is in the past or ongoing
        final Reservation reservation = enrolment.getReservation();
        DateTime now = AppUtil.adjustDST(DateTime.now(), reservation.getExternalReservation());
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return CompletableFuture.supplyAsync(() -> Results.forbidden("sitnet_reservation_in_effect"));
        }
        // good to go
        ExternalReservation external = reservation.getExternalReservation();
        URL url = parseUrl(external.getOrgRef(), external.getRoomRef(), ref);
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, Result> onSuccess = response -> {
            if (response.getStatus() != 200) {
                JsonNode root = response.asJson();
                return Results.internalServerError(root.get("message").asText("Connection refused"));
            }
            enrolment.setReservation(null);
            enrolment.setReservationCanceled(true);
            Ebean.save(enrolment);
            reservation.delete();

            // send email asynchronously
            boolean isStudentUser = user.equals(enrolment.getUser());
            system.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
                emailComposer.composeReservationCancellationNotification(enrolment.getUser(), reservation, "", isStudentUser, enrolment);
                Logger.info("Reservation cancellation confirmation email sent");
            }, system.dispatcher());

            return Results.ok();
        };
        return request.delete().thenApplyAsync(onSuccess);
    }

    @Override
    public CompletionStage<Result> removeReservation(Reservation reservation, User user) {
        if (reservation.getExternalReservation() == null) {
            return CompletableFuture.supplyAsync(Results::ok);
        }
        try {
            return requestRemoval(reservation.getExternalRef(), user);
        } catch (IOException e) {
            return CompletableFuture.supplyAsync(() -> Results.internalServerError(e.getMessage()));
        }
    }
}
