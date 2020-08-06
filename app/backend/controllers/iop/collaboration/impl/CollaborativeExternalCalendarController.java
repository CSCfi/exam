package backend.controllers.iop.collaboration.impl;

import akka.actor.ActorSystem;
import backend.exceptions.NotFoundException;
import backend.impl.CalendarHandler;
import backend.impl.EmailComposer;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.Reservation;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.sanitizers.Attrs;
import backend.sanitizers.ExternalCalendarReservationSanitizer;
import backend.security.Authenticated;
import backend.util.config.ConfigReader;
import backend.util.datetime.DateTimeUtils;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Collection;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collector;
import javax.inject.Inject;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.Logger;
import play.libs.Json;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import scala.concurrent.duration.Duration;

public class CollaborativeExternalCalendarController extends CollaborativeCalendarController {
    @Inject
    CalendarHandler calendarHandler;

    @Inject
    EmailComposer emailComposer;

    @Inject
    private ConfigReader configReader;

    @Inject
    ActorSystem system;

    private static final Logger.ALogger logger = Logger.of(CollaborativeExternalCalendarController.class);

    @Authenticated
    @With(ExternalCalendarReservationSanitizer.class)
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> requestReservation(Http.Request request) {
        if (!configReader.isVisitingExaminationSupported()) {
            return wrapAsPromise(forbidden("Feature not enabled in the installation"));
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        // Parse request body
        String orgRef = request.attrs().get(Attrs.ORG_REF);
        String roomRef = request.attrs().get(Attrs.ROOM_REF);
        DateTime start = request.attrs().get(Attrs.START_DATE);
        DateTime end = request.attrs().get(Attrs.END_DATE);
        Long examId = request.attrs().get(Attrs.EXAM_ID);
        Collection<Long> sectionIds = request.attrs().get(Attrs.SECTION_IDS);
        DateTime now = DateTimeUtils.adjustDST(DateTime.now());

        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, examId);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        final ExamEnrolment enrolment = Ebean
            .find(ExamEnrolment.class)
            .fetch("reservation")
            .where()
            .eq("user.id", user.getId())
            .eq("collaborativeExam.id", examId)
            .disjunction()
            .isNull("reservation")
            .gt("reservation.startAt", now.toDate())
            .endJunction()
            .findOne();
        if (enrolment == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        return downloadExam(ce)
            .thenComposeAsync(
                result -> {
                    if (result.isEmpty()) {
                        return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
                    }
                    Exam exam = result.get();
                    Optional<Result> badEnrolment = checkEnrolment(enrolment, exam, user);
                    if (badEnrolment.isPresent()) {
                        return wrapAsPromise(badEnrolment.get());
                    }
                    // Make ext request here
                    // Lets do this
                    URL url = null;
                    try {
                        url = parseUrl(orgRef, roomRef);
                    } catch (MalformedURLException e) {
                        throw new RuntimeException(e);
                    }
                    String homeOrgRef = ConfigFactory.load().getString("sitnet.integration.iop.organisationRef");
                    ObjectNode body = Json.newObject();
                    body.put("requestingOrg", homeOrgRef);
                    body.put("start", ISODateTimeFormat.dateTime().print(start));
                    body.put("end", ISODateTimeFormat.dateTime().print(end));
                    body.put("user", user.getEppn());
                    body.set(
                        "optionalSections",
                        sectionIds.stream().collect(Collector.of(Json::newArray, ArrayNode::add, ArrayNode::add))
                    );

                    WSRequest wsRequest = wsClient.url(url.toString());
                    return wsRequest
                        .post(body)
                        .thenComposeAsync(
                            response -> {
                                JsonNode root = response.asJson();
                                if (response.getStatus() != Http.Status.CREATED) {
                                    return wrapAsPromise(
                                        internalServerError(root.get("message").asText("Connection refused"))
                                    );
                                }
                                return calendarHandler
                                    .handleExternalReservation(
                                        enrolment,
                                        root,
                                        start,
                                        end,
                                        user,
                                        orgRef,
                                        roomRef,
                                        sectionIds
                                    )
                                    .thenApplyAsync(
                                        err -> {
                                            if (err.isEmpty()) {
                                                return created(root.get("id"));
                                            }
                                            return internalServerError();
                                        }
                                    );
                            }
                        );
                }
            );
    }

    private Result makeNewReservation(ExamEnrolment enrolment, Exam exam, Reservation reservation, User user) {
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.setReservationCanceled(false);
        enrolment.save();
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

        return ok();
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> requestSlots(
        Long examId,
        String roomRef,
        Optional<String> org,
        Optional<String> date,
        Http.Request request
    ) {
        if (org.isPresent() && date.isPresent()) {
            User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
            CollaborativeExam ce = Ebean.find(CollaborativeExam.class, examId);
            if (ce == null) {
                return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
            }
            ExamEnrolment enrolment = getEnrolledExam(examId, user);
            if (enrolment == null) {
                return wrapAsPromise(forbidden("sitnet_error_enrolment_not_found"));
            }
            return downloadExam(ce)
                .thenComposeAsync(
                    result -> {
                        if (result.isEmpty()) {
                            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
                        }
                        Exam exam = result.get();
                        if (!exam.hasState(Exam.State.PUBLISHED)) {
                            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
                        }
                        // Also sanity check the provided search date
                        try {
                            calendarHandler.parseSearchDate(date.get(), exam, null);
                        } catch (NotFoundException e) {
                            return wrapAsPromise(notFound());
                        }
                        // Ready to shoot
                        String start = ISODateTimeFormat.dateTime().print(new DateTime(exam.getExamActiveStartDate()));
                        String end = ISODateTimeFormat.dateTime().print(new DateTime(exam.getExamActiveEndDate()));
                        Integer duration = exam.getDuration();
                        URL url = parseUrl(org.get(), roomRef, date.get(), start, end, duration);
                        WSRequest wsRequest = wsClient
                            .url(url.toString().split("\\?")[0])
                            .setQueryString(url.getQuery());
                        Function<WSResponse, Result> onSuccess = response -> {
                            JsonNode root = response.asJson();
                            if (response.getStatus() != Http.Status.OK) {
                                return internalServerError(root.get("message").asText("Connection refused"));
                            }
                            Set<CalendarHandler.TimeSlot> slots = calendarHandler.postProcessSlots(
                                root,
                                date.get(),
                                exam,
                                user
                            );
                            return ok(Json.toJson(slots));
                        };
                        return wsRequest.get().thenApplyAsync(onSuccess);
                    }
                );
        }
        return wrapAsPromise(badRequest());
    }

    private ExamEnrolment getEnrolledExam(Long examId, User user) {
        DateTime now = DateTimeUtils.adjustDST(DateTime.now());
        return Ebean
            .find(ExamEnrolment.class)
            .where()
            .eq("user", user)
            .eq("collaborativeExam.id", examId)
            .disjunction()
            .isNull("reservation")
            .gt("reservation.startAt", now.toDate())
            .endJunction()
            .findOne();
    }

    private static URL parseUrl(String orgRef, String facilityRef) throws MalformedURLException {
        return new URL(
            ConfigFactory.load().getString("sitnet.integration.iop.host") +
            String.format("/api/organisations/%s/facilities/%s/reservations", orgRef, facilityRef)
        );
    }

    private static URL parseUrl(
        String orgRef,
        String facilityRef,
        String date,
        String start,
        String end,
        int duration
    ) {
        String url =
            ConfigFactory.load().getString("sitnet.integration.iop.host") +
            String.format("/api/organisations/%s/facilities/%s/slots", orgRef, facilityRef) +
            String.format("?date=%s&startAt=%s&endAt=%s&duration=%d", date, start, end, duration);
        try {
            return new URL(url);
        } catch (MalformedURLException e) {
            throw new RuntimeException(e);
        }
    }
}
