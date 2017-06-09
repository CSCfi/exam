package util.java;

import com.typesafe.config.ConfigFactory;
import models.Exam;
import models.ExamEnrolment;
import models.ExamInspection;
import models.Reservation;
import models.User;
import play.Logger;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;

import javax.inject.Inject;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

public class NoShowHandlerUtil implements NoShowHandler {

    @Inject
    private EmailComposer composer;

    @Inject
    private WSClient wsClient;

    private static final String HOST = ConfigFactory.load().getString("sitnet.integration.iop.host");

    private void send(Reservation reservation) throws MalformedURLException {
        URL url = parseUrl(reservation.getExternalRef());
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, Void> onSuccess = response -> {
            if (response.getStatus() != 200) {
                Logger.error("Failed in sending the exam to XM");
            } else {
                reservation.setNoShow(true);
                reservation.update();
            }
            return null;
        };
        request.post(Json.newObject()).thenApplyAsync(onSuccess);
    }

    private static URL parseUrl(String reservationRef) throws MalformedURLException {
        return new URL(HOST + String.format("/api/enrolments/%s/noshow", reservationRef));
    }

    @Override
    public void handleNoShows(List<ExamEnrolment> noShows, Class<?> sender) {
        for (ExamEnrolment enrolment : noShows) {
            handleNoShow(enrolment);
            if (sender != null) {
                Logger.info("{}: ... marked reservation {} as no-show", sender.getCanonicalName(),
                        enrolment.getReservation().getId());
            }
        }
    }

    @Override
    public void handleNoShow(ExamEnrolment enrolment) {
        Reservation reservation = enrolment.getReservation();
        if (reservation.getExternalRef() != null && reservation.getExternalReservation() == null) {
            // Send to XM for further processing
            // NOTE: Possible performance bottleneck here. It is not impossible that there are a lot of unprocessed
            // no-shows and sending them one by one over network would be inefficient. However, this is not very likely.
            try {
                send(reservation);
            } catch (MalformedURLException e) {
                Logger.error("Failed to init sending no-show!", e);
            }
        } else if (reservation.getExternalReservation() == null) {
            handleNoShowAndNotify(enrolment);
        }
    }

    @Override
    public void handleNoShowAndNotify(ExamEnrolment enrolment) {
        Reservation reservation = enrolment.getReservation();
        reservation.setNoShow(true);
        reservation.update();
        Exam exam = enrolment.getExam();
        if (exam.isPrivate()) {
            // Notify teachers
            Set<User> recipients = new HashSet<>();
            recipients.addAll(exam.getExamOwners());
            recipients.addAll(exam.getExamInspections().stream().map(
                    ExamInspection::getUser).collect(Collectors.toSet()));
            for (User r : recipients) {
                composer.composeNoShowMessage(r, enrolment.getUser(), exam);
                Logger.info("Email sent to {}", r.getEmail());
            }
        }

    }
}
