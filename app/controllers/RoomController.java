package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.text.PathProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.typesafe.config.ConfigFactory;
import controllers.base.BaseController;
import controllers.iop.api.ExternalFacilityAPI;
import models.Accessibility;
import models.ExamMachine;
import models.ExamRoom;
import models.ExamStartingHour;
import models.MailAddress;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import org.joda.time.format.ISODateTimeFormat;
import org.springframework.beans.BeanUtils;
import play.Logger;
import play.data.DynamicForm;
import play.libs.Json;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.DateTimeUtils;

import javax.inject.Inject;
import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;

public class RoomController extends BaseController {

    private static final boolean IOP_ACTIVATED = ConfigFactory.load().getBoolean("sitnet.integration.iop.active");

    @Inject
    private ExternalFacilityAPI externalApi;

    @Inject
    protected ActorSystem system;

    private CompletionStage<Result> updateRemote(ExamRoom room) throws MalformedURLException {
        if (room.getExternalRef() != null && IOP_ACTIVATED) {
            return externalApi.updateFacility(room)
                    .thenApplyAsync(x -> ok("updated"))
                    .exceptionally(throwable -> internalServerError(throwable.getMessage()));
        } else {
            return wrapAsPromise(ok());
        }
    }

    private void asyncUpdateRemote(ExamRoom room) {
        // Handle remote updates in dedicated threads
        if (room.getExternalRef() != null && IOP_ACTIVATED) {
            system.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
                try {
                    externalApi.updateFacility(room);
                } catch (MalformedURLException e) {
                    Logger.error("Remote update of exam room #{} failed", room.getExternalRef());
                }
            }, system.dispatcher());
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result getExamRooms() {
        ExpressionList<ExamRoom> query = Ebean.find(ExamRoom.class)
                .fetch("accessibility")
                .fetch("examMachines")
                .fetch("defaultWorkingHours")
                .fetch("calendarExceptionEvents")
                .where();
        if (!getLoggedUser().hasRole("ADMIN", getSession())) {
            query = query.ne("state", ExamRoom.State.INACTIVE.toString());
        }
        List<ExamRoom> rooms = query.findList();
        for (ExamRoom room : rooms) {
            room.getExamMachines().removeIf(ExamMachine::isArchived);
        }
        PathProperties props = PathProperties.parse(
                "(*, mailAddress(*), accessibility(*), defaultWorkingHours(*), calendarExceptionEvents(*), examMachines(*, softwareInfo(*)))");
        return ok(rooms, props);
    }

    @Restrict(@Group("ADMIN"))
    public Result getExamRoom(Long id) {
        ExamRoom examRoom = ExamRoom.find.ref(id);
        if (examRoom == null) {
            return notFound("room not found");
        }
        PathProperties props = PathProperties.parse(
                "(*, defaultWorkingHours(*), calendarExceptionEvents(*), accessibility(*), mailAddress(*), examStartingHours(*), examMachines(*))");
        return ok(examRoom, props);
    }

    @Restrict(@Group({"ADMIN"}))
    public Result createExamRoomDraft() {
        ExamRoom examRoom = new ExamRoom();
        examRoom.setName("Kirjoita tenttitilan nimi tähän"); // TODO: i18n
        examRoom.setState("SAVED");
        examRoom.setLocalTimezone(AppUtil.getDefaultTimeZone().getID());
        examRoom.save();
        return ok(Json.toJson(examRoom));
    }

    @Restrict(@Group({"ADMIN"}))
    public CompletionStage<Result> updateExamRoom(Long id) throws MalformedURLException {
        ExamRoom room = formFactory.form(ExamRoom.class).bindFromRequest(
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
                "expanded").get();
        ExamRoom existing = ExamRoom.find.ref(id);
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
        existing.setExpanded(room.getExpanded());

        existing.update();

        return updateRemote(existing);
    }

    @Restrict(@Group({"ADMIN"}))
    public CompletionStage<Result> updateExamRoomAddress(Long id) throws MalformedURLException {
        MailAddress address = bindForm(MailAddress.class);
        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return wrapAsPromise(notFound());
        }
        MailAddress existing = room.getMailAddress();
        if (existing == null) {
            return wrapAsPromise(notFound());
        }
        existing.setCity(address.getCity());
        existing.setStreet(address.getStreet());
        existing.setZip(address.getZip());
        existing.update();

        return updateRemote(room);
    }

    private List<DefaultWorkingHours> parseWorkingHours(JsonNode root) {
        JsonNode node = root.get("workingHours");
        DateTimeFormatter formatter = DateTimeFormat.forPattern("dd.MM.yyyy HH:mmZZ");
        List<DefaultWorkingHours> result = new ArrayList<>();
        for (JsonNode weekday : node) {
            for (JsonNode block : weekday.get("blocks")) {
                DefaultWorkingHours dwh = new DefaultWorkingHours();
                dwh.setWeekday(weekday.get("weekday").asText());
                // Deliberately use first of Jan to have no DST in effect
                DateTime startTime = DateTime.parse(block.get("start").asText(), formatter).withDayOfYear(1);
                DateTime endTime = DateTime.parse(block.get("end").asText(), formatter).withDayOfYear(1);
                dwh.setStartTime(startTime.toDate());
                dwh.setEndTime(endTime.toDate());
                result.add(dwh);
            }
        }
        return result;
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateExamRoomWorkingHours() {
        JsonNode root = request().body().asJson();
        List<Long> roomIds = new ArrayList<>();
        for (JsonNode roomId : root.get("roomIds")) {
            roomIds.add(roomId.asLong());
        }
        List<ExamRoom> rooms = Ebean.find(ExamRoom.class).where().idIn(roomIds).findList();
        List<DefaultWorkingHours> blueprints = parseWorkingHours(root);
        for (ExamRoom examRoom : rooms) {
            List<DefaultWorkingHours> previous = examRoom.getDefaultWorkingHours();
            Ebean.deleteAll(previous);
            previous.clear();
            for (DefaultWorkingHours blueprint : blueprints) {
                DefaultWorkingHours copy = new DefaultWorkingHours();
                BeanUtils.copyProperties(blueprint, copy, "id", "room");
                copy.setRoom(examRoom);
                DateTime end = new DateTime(blueprint.getEndTime());
                int offset = DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(end);
                int endMillisOfDay = DateTimeUtils.resolveEndWorkingHourMillis(end.toDate(), offset) - offset;
                copy.setEndTime(end.withMillisOfDay(endMillisOfDay).toDate());
                copy.setTimezoneOffset(offset);
                copy.save();
                previous.add(copy);
            }
            asyncUpdateRemote(examRoom);
        }
        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateExamStartingHours() {

        JsonNode root = request().body().asJson();
        List<Long> roomIds = new ArrayList<>();
        for (JsonNode roomId : root.get("roomIds")) {
            roomIds.add(roomId.asLong());
        }

        List<ExamRoom> rooms = Ebean.find(ExamRoom.class).where().idIn(roomIds).findList();

        for (ExamRoom examRoom : rooms) {

            if (examRoom == null) {
                return notFound();
            }
            List<ExamStartingHour> previous = Ebean.find(ExamStartingHour.class)
                    .where().eq("room.id", examRoom.getId()).findList();
            Ebean.deleteAll(previous);

            JsonNode node = request().body().asJson();
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

    @Restrict(@Group({"ADMIN"}))
    public Result addRoomExceptionHour() {

        final JsonNode root = request().body().asJson();

        if (!root.has("startDate") || !root.has("endDate")) {
            return badRequest("either start or end date missing");
        }
        DateTime startDate = ISODateTimeFormat.dateTime().parseDateTime(root.get("startDate").asText());
        DateTime endDate = ISODateTimeFormat.dateTime().parseDateTime(root.get("endDate").asText());

        DynamicForm df = formFactory.form().bindFromRequest();
        String args = df.get("roomIds");
        String[] examRoomIds;
        if (args == null || args.isEmpty()) {
            examRoomIds = new String[]{};
        } else {
            examRoomIds = args.split(",");
        }

        ExceptionWorkingHours hours = null;

        for (String id : examRoomIds) {
            ExamRoom examRoom = Ebean.find(ExamRoom.class, id);
            if (examRoom == null) {
                return notFound();
            }

            hours = new ExceptionWorkingHours();
            hours.setStartDate(startDate.toDate());
            hours.setStartDateTimezoneOffset(DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(startDate));
            hours.setEndDate(endDate.toDate());
            hours.setEndDateTimezoneOffset(DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(endDate));
            hours.setRoom(examRoom);
            hours.setOutOfService(root.get("outOfService").asBoolean(true));

            if (examRoomIds.length > 1) {
                hours.setMassEdited(true);
            }
            hours.save();
            examRoom.getCalendarExceptionEvents().add(hours);
            asyncUpdateRemote(examRoom);
        }

        return ok(Json.toJson(hours));
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateExamRoomAccessibility(Long id) {
        JsonNode json = request().body().asJson();
        final List<String> ids = Arrays.asList(json.get("ids").asText().split(","));

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return notFound();
        }
        room.getAccessibility().clear();
        room.save();

        if (!ids.isEmpty()) {
            for (String aid : ids) {
                System.out.println(aid);
                int accessibilityId;
                try {
                    accessibilityId = Integer.parseInt(aid.trim());
                } catch (Exception ex) {
                    break;
                }
                Accessibility accessibility = Ebean.find(Accessibility.class, accessibilityId);
                room.getAccessibility().add(accessibility);
                room.save();
                asyncUpdateRemote(room);
            }
        }
        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public CompletionStage<Result> removeRoomExceptionHour(Long roomId, Long exceptionId) throws MalformedURLException {
        ExceptionWorkingHours exception = Ebean.find(ExceptionWorkingHours.class, exceptionId);
        ExamRoom room = Ebean.find(ExamRoom.class, roomId);
        if (exception == null || room == null) {
            return wrapAsPromise(notFound());
        }
        exception.delete();
        room.getCalendarExceptionEvents().remove(exception);
        return updateRemote(room);
    }

    @Restrict(@Group({"ADMIN"}))
    public CompletionStage<Result> inactivateExamRoom(Long id) throws MalformedURLException {

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return wrapAsPromise(notFound());
        }
        room.setState(ExamRoom.State.INACTIVE.toString());
        room.update();

        if (room.getExternalRef() != null && IOP_ACTIVATED) {
            return externalApi.inactivateFacility(room.getId())
                    .thenApplyAsync(response -> ok(Json.toJson(room)));
        } else {
            return wrapAsPromise(ok(Json.toJson(room)));
        }
    }

    @Restrict(@Group({"ADMIN"}))
    public CompletionStage<Result> activateExamRoom(Long id) throws MalformedURLException {

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return wrapAsPromise(notFound());
        }
        room.setState(ExamRoom.State.ACTIVE.toString());
        room.update();

        if (room.getExternalRef() != null && IOP_ACTIVATED) {
            return externalApi.activateFacility(room.getId())
                    .thenApplyAsync(response -> ok(Json.toJson(room)));
        } else {
            return wrapAsPromise(ok(Json.toJson(room)));
        }
    }
}


