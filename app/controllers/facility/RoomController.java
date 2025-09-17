// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.facility;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import controllers.base.BaseController;
import controllers.iop.transfer.api.ExternalFacilityAPI;
import io.ebean.DB;
import io.ebean.ExpressionList;
import io.ebean.text.PathProperties;
import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import miscellaneous.config.ConfigReader;
import miscellaneous.datetime.DateTimeHandler;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import models.facility.Accessibility;
import models.facility.ExamMachine;
import models.facility.ExamRoom;
import models.facility.ExamStartingHour;
import models.facility.MailAddress;
import models.user.Role;
import models.user.User;
import org.apache.pekko.actor.ActorSystem;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import org.joda.time.format.ISODateTimeFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.Form;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import sanitizers.Attrs;
import scala.concurrent.duration.Duration;
import security.Authenticated;
import system.interceptors.SensitiveDataPolicy;

public class RoomController extends BaseController {

    private final boolean examVisitActivated;
    private final String defaultTimeZoneId;
    private final ExternalFacilityAPI externalApi;
    protected ActorSystem system;
    private final DateTimeHandler dateTimeHandler;
    private final Logger logger = LoggerFactory.getLogger(RoomController.class);
    private static final int EPOCH = 1970;

    @Inject
    public RoomController(
        ExternalFacilityAPI externalFacilityAPI,
        ActorSystem actorSystem,
        ConfigReader configReader,
        DateTimeHandler dateTimeHandler
    ) {
        this.externalApi = externalFacilityAPI;
        this.system = actorSystem;
        this.examVisitActivated = configReader.isVisitingExaminationSupported();
        this.defaultTimeZoneId = configReader.getDefaultTimeZone().getID();
        this.dateTimeHandler = dateTimeHandler;
    }

    private CompletionStage<Result> updateRemote(ExamRoom room) throws MalformedURLException {
        if (room.getExternalRef() != null && examVisitActivated) {
            return externalApi
                .updateFacility(room)
                .thenApplyAsync(x -> ok(Json.newObject()))
                .exceptionally(throwable -> internalServerError(Json.newObject().put("error", throwable.getMessage())));
        } else {
            return wrapAsPromise(ok());
        }
    }

    private void asyncUpdateRemote(ExamRoom room) {
        // Handle remote updates in dedicated threads
        if (room.getExternalRef() != null && examVisitActivated) {
            system
                .scheduler()
                .scheduleOnce(
                    Duration.create(1, TimeUnit.SECONDS),
                    () -> {
                        try {
                            externalApi.updateFacility(room);
                        } catch (MalformedURLException e) {
                            logger.error("Remote update of exam room #{} failed", room.getExternalRef());
                        }
                    },
                    system.dispatcher()
                );
        }
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("SUPPORT"), @Group("ADMIN"), @Group("STUDENT") })
    @SensitiveDataPolicy(sensitiveFieldNames = { "internalPassword", "externalPassword" })
    public Result getExamRooms(Http.Request request) {
        ExpressionList<ExamRoom> query = DB.find(ExamRoom.class)
            .fetch("accessibilities")
            .fetch("examMachines")
            .fetch("defaultWorkingHours")
            .fetch("calendarExceptionEvents")
            .fetch("examStartingHours")
            .where();
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!user.hasRole(Role.Name.ADMIN)) {
            query = query.ne("state", ExamRoom.State.INACTIVE.toString());
        }
        List<ExamRoom> rooms = query.findList();
        for (ExamRoom room : rooms) {
            room.getExamMachines().removeIf(ExamMachine::isArchived);
            room.setInternalPasswordRequired(room.getInternalPassword() != null);
            room.setExternalPasswordRequired(room.getExternalPassword() != null);
        }
        PathProperties props = PathProperties.parse(
            "(*, mailAddress(*), accessibilities(*), defaultWorkingHours(*), calendarExceptionEvents(*), examStartingHours(*), examMachines(*, softwareInfo(*)))"
        );
        return ok(rooms, props);
    }

    @Restrict(@Group("ADMIN"))
    public Result getExamRoom(Long id) {
        ExamRoom examRoom = DB.find(ExamRoom.class, id);
        if (examRoom == null) {
            return notFound("room not found");
        }
        PathProperties props = PathProperties.parse(
            "(*, defaultWorkingHours(*), calendarExceptionEvents(*), accessibilities(*), mailAddress(*), examStartingHours(*), examMachines(*))"
        );
        return ok(examRoom, props);
    }

    @Restrict(@Group({ "ADMIN" }))
    public Result createExamRoomDraft() {
        ExamRoom examRoom = new ExamRoom();
        examRoom.setState("SAVED");
        examRoom.setLocalTimezone(defaultTimeZoneId);
        examRoom.setMailAddress(new MailAddress());
        examRoom.save();
        return ok(Json.toJson(examRoom));
    }

    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result validatePassword(Long roomId, Http.Request request) {
        ExamRoom room = DB.find(ExamRoom.class, roomId);
        if (room == null) {
            return notFound("room not found");
        }

        if (room.getInternalPassword() == null) {
            return badRequest("room does not require internal password");
        }
        JsonNode body = request.body().asJson();
        boolean isExternal = body.get("external").asBoolean();
        String validPassword = isExternal ? room.getExternalPassword() : room.getInternalPassword();
        if (validPassword.equals(body.get("password").asText())) {
            return ok();
        } else {
            return forbidden();
        }
    }

    @Restrict(@Group({ "ADMIN" }))
    public CompletionStage<Result> updateExamRoom(Long id, Http.Request request) throws MalformedURLException {
        ExamRoom room = formFactory
            .form(ExamRoom.class)
            .bindFromRequest(
                request,
                "name",
                "roomCode",
                "buildingName",
                "campus",
                "accessibilityInfo",
                "accessible",
                "roomInstruction",
                "roomInstructionEN",
                "roomInstructionSV",
                "contactPerson",
                "videoRecordingsURL",
                "examMachineCount",
                "statusComment",
                "outOfService",
                "state",
                "internalPassword",
                "externalPassword"
            )
            .get();
        ExamRoom existing = DB.find(ExamRoom.class, id);
        if (existing == null) {
            return wrapAsPromise(notFound());
        }
        existing.setName(room.getName());
        existing.setRoomCode(room.getRoomCode());
        existing.setBuildingName(room.getBuildingName());
        existing.setCampus(room.getCampus());
        existing.setAccessible(room.getAccessible());
        existing.setRoomInstruction(room.getRoomInstruction());
        existing.setRoomInstructionEN(room.getRoomInstructionEN());
        existing.setRoomInstructionSV(room.getRoomInstructionSV());
        existing.setContactPerson(room.getContactPerson());
        existing.setVideoRecordingsURL(room.getVideoRecordingsURL());
        existing.setStatusComment(room.getStatusComment());
        existing.setOutOfService(room.getOutOfService());
        existing.setState(room.getState());
        existing.setInternalPassword(room.getInternalPassword());
        existing.setExternalPassword(room.getExternalPassword());

        existing.update();

        return updateRemote(existing);
    }

    @Restrict(@Group({ "ADMIN" }))
    public CompletionStage<Result> updateExamRoomAddress(Long id, Http.Request request) throws MalformedURLException {
        MailAddress address = bindAddress(request);
        MailAddress existing = DB.find(MailAddress.class, id);
        if (existing == null) {
            return wrapAsPromise(notFound());
        }
        Optional<ExamRoom> room = DB.find(ExamRoom.class).where().eq("mailAddress", existing).findOneOrEmpty();
        if (room.isEmpty()) {
            return wrapAsPromise(notFound());
        }
        existing.setCity(address.getCity());
        existing.setStreet(address.getStreet());
        existing.setZip(address.getZip());
        existing.update();
        return updateRemote(room.get());
    }

    private MailAddress bindAddress(Http.Request request) {
        final Form<MailAddress> form = formFactory.form(MailAddress.class);
        return form.bindFromRequest(request).get();
    }

    private DefaultWorkingHours parseWorkingHours(JsonNode root) {
        JsonNode node = root.get("workingHours");
        DateTimeFormatter formatter = ISODateTimeFormat.dateTimeParser();
        DefaultWorkingHours dwh = new DefaultWorkingHours();
        dwh.setWeekday(node.get("weekday").asText());
        // Deliberately use Jan to have no DST in effect
        DateTime startTime = DateTime.parse(node.get("startTime").asText(), formatter).withDayOfYear(1).withYear(EPOCH);
        DateTime endTime = DateTime.parse(node.get("endTime").asText(), formatter).withDayOfYear(1).withYear(EPOCH);
        dwh.setStartTime(startTime);
        dwh.setEndTime(endTime);
        return dwh;
    }

    @Restrict(@Group({ "ADMIN" }))
    public Result updateExamRoomWorkingHours(Http.Request request) {
        JsonNode root = request.body().asJson();
        List<Long> roomIds = new ArrayList<>();
        for (JsonNode roomId : root.get("roomIds")) {
            roomIds.add(roomId.asLong());
        }
        List<ExamRoom> rooms = DB.find(ExamRoom.class).where().idIn(roomIds).findList();
        DefaultWorkingHours hours = parseWorkingHours(root);
        for (ExamRoom examRoom : rooms) {
            // Find out if there's overlap. Remove those
            List<DefaultWorkingHours> existing = DB.find(DefaultWorkingHours.class)
                .where()
                .eq("room", examRoom)
                .eq("weekday", hours.getWeekday())
                .findList();
            List<DefaultWorkingHours> overlapping = existing
                .stream()
                .filter(dwh -> dwh.overlaps(hours))
                .toList();
            DB.deleteAll(overlapping);
            examRoom.getDefaultWorkingHours().removeAll(overlapping);

            hours.setRoom(examRoom);
            DateTime end = new DateTime(hours.getEndTime());
            int offset = DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(end);
            int endMillisOfDay = dateTimeHandler.resolveEndWorkingHourMillis(end, offset) - offset;
            hours.setEndTime(end.withMillisOfDay(endMillisOfDay));
            hours.setTimezoneOffset(offset);
            hours.save();
            examRoom.getDefaultWorkingHours().add(hours);
            asyncUpdateRemote(examRoom);
        }
        return ok(Json.newObject().put("id", hours.getId()));
    }

    @Restrict(@Group({ "ADMIN" }))
    public Result removeExamRoomWorkingHours(Long roomId, Long id) {
        DefaultWorkingHours dwh = DB.find(DefaultWorkingHours.class, id);
        ExamRoom room = DB.find(ExamRoom.class, roomId);
        if (dwh == null || room == null) {
            return forbidden();
        }
        dwh.delete();
        room.getDefaultWorkingHours().remove(dwh);
        asyncUpdateRemote(room);
        return ok();
    }

    @Restrict(@Group({ "ADMIN" }))
    public Result updateExamStartingHours(Http.Request request) {
        JsonNode root = request.body().asJson();
        List<Long> roomIds = new ArrayList<>();
        for (JsonNode roomId : root.get("roomIds")) {
            roomIds.add(roomId.asLong());
        }

        List<ExamRoom> rooms = DB.find(ExamRoom.class).where().idIn(roomIds).findList();

        for (ExamRoom examRoom : rooms) {
            if (examRoom == null) {
                return notFound();
            }
            List<ExamStartingHour> previous = DB.find(ExamStartingHour.class)
                .where()
                .eq("room.id", examRoom.getId())
                .findList();
            DB.deleteAll(previous);

            JsonNode node = request.body().asJson();
            DateTimeFormatter formatter = DateTimeFormat.forPattern("dd.MM.yyyy HH:mmZZ");
            for (JsonNode hours : node.get("hours")) {
                ExamStartingHour esh = new ExamStartingHour();
                esh.setRoom(examRoom);
                // Deliberately use first/second of Jan to have no DST in effect
                DateTime startTime = DateTime.parse(hours.asText(), formatter).withDayOfYear(1);
                esh.setStartingHour(startTime.toDate());
                esh.setTimezoneOffset(DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(startTime));

                esh.save();
            }
            asyncUpdateRemote(examRoom);
        }
        return ok();
    }

    private ExceptionWorkingHours parse(JsonNode node) {
        DateTime startDate = ISODateTimeFormat.dateTime().parseDateTime(node.get("start").asText());
        DateTime endDate = ISODateTimeFormat.dateTime().parseDateTime(node.get("end").asText());
        ExceptionWorkingHours hours = new ExceptionWorkingHours();
        hours.setStartDate(startDate.toDate());
        hours.setEndDate(endDate.toDate());
        hours.setOutOfService(node.get("outOfService").asBoolean(true));
        return hours;
    }

    @Restrict(@Group({ "ADMIN" }))
    public Result addRoomExceptionHours(Http.Request request) {
        final JsonNode exceptionsNode = request.body().asJson().get("exceptions");
        final JsonNode ids = request.body().asJson().get("roomIds");

        List<Long> roomIds = StreamSupport.stream(ids.spliterator(), false).map(JsonNode::asLong).toList();
        List<ExamRoom> rooms = DB.find(ExamRoom.class).where().idIn(roomIds).findList();
        for (ExamRoom room : rooms) {
            for (JsonNode node : exceptionsNode) {
                ExceptionWorkingHours exception = parse(node);
                exception.setStartDateTimezoneOffset(
                    DateTimeZone.forID(room.getLocalTimezone()).getOffset(exception.getStartDate().getTime())
                );
                exception.setEndDateTimezoneOffset(
                    DateTimeZone.forID(room.getLocalTimezone()).getOffset(exception.getEndDate().getTime())
                );
                exception.setRoom(room);
                exception.save();
                room.getCalendarExceptionEvents().add(exception);
            }
            asyncUpdateRemote(room);
        }
        return ok(
            Json.toJson(
                rooms
                    .stream()
                    .flatMap(r -> r.getCalendarExceptionEvents().stream())
                    .toList()
            )
        );
    }

    @Restrict(@Group({ "ADMIN" }))
    public Result updateExamRoomAccessibility(Long id, Http.Request request) {
        JsonNode json = request.body().asJson();
        final List<String> ids = Arrays.asList(json.get("ids").asText().split(","));

        ExamRoom room = DB.find(ExamRoom.class, id);
        if (room == null) {
            return notFound();
        }
        room.getAccessibilities().clear();
        room.save();

        if (!ids.isEmpty()) {
            for (String aid : ids) {
                int accessibilityId;
                try {
                    accessibilityId = Integer.parseInt(aid.trim());
                } catch (Exception ex) {
                    break;
                }
                Accessibility accessibility = DB.find(Accessibility.class, accessibilityId);
                room.getAccessibilities().add(accessibility);
                room.save();
                asyncUpdateRemote(room);
            }
        }
        return ok();
    }

    @Restrict(@Group({ "ADMIN" }))
    public CompletionStage<Result> removeRoomExceptionHour(Long roomId, Long exceptionId) throws MalformedURLException {
        ExceptionWorkingHours exception = DB.find(ExceptionWorkingHours.class, exceptionId);
        ExamRoom room = DB.find(ExamRoom.class, roomId);
        if (exception == null || room == null) {
            return wrapAsPromise(notFound());
        }
        exception.delete();
        room.getCalendarExceptionEvents().remove(exception);
        return updateRemote(room);
    }

    @Restrict(@Group({ "ADMIN" }))
    public CompletionStage<Result> inactivateExamRoom(Long id) throws MalformedURLException {
        ExamRoom room = DB.find(ExamRoom.class, id);
        if (room == null) {
            return wrapAsPromise(notFound());
        }
        room.setState(ExamRoom.State.INACTIVE.toString());
        room.update();

        if (room.getExternalRef() != null && examVisitActivated) {
            return externalApi.inactivateFacility(room.getId()).thenApplyAsync(response -> ok(Json.toJson(room)));
        } else {
            return wrapAsPromise(ok(Json.toJson(room)));
        }
    }

    @Restrict(@Group({ "ADMIN" }))
    public CompletionStage<Result> activateExamRoom(Long id) throws MalformedURLException {
        ExamRoom room = DB.find(ExamRoom.class, id);
        if (room == null) {
            return wrapAsPromise(notFound());
        }
        room.setState(ExamRoom.State.ACTIVE.toString());
        room.update();

        if (room.getExternalRef() != null && examVisitActivated) {
            return externalApi.activateFacility(room.getId()).thenApplyAsync(response -> ok(Json.toJson(room)));
        } else {
            return wrapAsPromise(ok(Json.toJson(room)));
        }
    }
}
