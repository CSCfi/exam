package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.fasterxml.jackson.databind.JsonNode;
import models.*;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import org.joda.time.format.ISODateTimeFormat;
import org.springframework.beans.BeanUtils;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;
import util.java.DateTimeUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

public class RoomController extends BaseController {

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
            Iterator<ExamMachine> i = room.getExamMachines().iterator();
            while (i.hasNext()) {
                ExamMachine machine = i.next();
                if (machine.isArchived()) {
                    i.remove();
                }
            }
        }
        return ok(Json.toJson(rooms));
    }

    @Restrict(@Group("ADMIN"))
    public Result getExamRoom(Long id) {
        ExamRoom examRoom = ExamRoom.find.ref(id);
        if (examRoom == null) {
            return notFound("room not found");
        }
        return ok(Json.toJson(examRoom));
    }

    @Restrict(@Group({"ADMIN"}))
    public Result createExamRoomDraft() {
        ExamRoom examRoom = new ExamRoom();
        examRoom.setName("Kirjoita tenttitilan nimi tähän"); // TODO: i18n
        examRoom.setState("SAVED");
        examRoom.save();
        return ok(Json.toJson(examRoom));
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateExamRoom(Long id) {
        ExamRoom room = Form.form(ExamRoom.class).bindFromRequest(
                "name",
                "roomCode",
                "buildingName",
                "campus",
                "transitionTime",
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
        existing.setName(room.getName());
        existing.setRoomCode(room.getRoomCode());
        existing.setBuildingName(room.getBuildingName());
        existing.setCampus(room.getCampus());
        existing.setTransitionTime(room.getTransitionTime());
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

        return ok(Json.toJson(existing));
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateExamRoomAddress(Long id) {
        MailAddress address = bindForm(MailAddress.class);
        MailAddress existing = Ebean.find(MailAddress.class, id);
        existing.setCity(address.getCity());
        existing.setStreet(address.getStreet());
        existing.setZip(address.getZip());
        existing.update();
        return ok(Json.toJson(address));
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
            Ebean.delete(previous);
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
            }
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
            Ebean.delete(previous);

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

        DynamicForm df = Form.form().bindFromRequest();
        String args = df.get("roomIds");
        String[] examRoomIds;
        if (args == null || args.isEmpty()) {
            examRoomIds = new String[]{};
        } else {
            examRoomIds = args.split(",");
        }

        ExceptionWorkingHours hours = null;

        for (int i = 0; i < examRoomIds.length; i++) {

            ExamRoom examRoom = Ebean.find(ExamRoom.class, examRoomIds[i]);
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
        }

        return ok(Json.toJson(hours));
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateExamRoomAccessibility(Long id) {
        JsonNode json = request().body().asJson();
        final List<String> ids = Arrays.asList(json.get("ids").asText().split(","));

        ExamRoom room = Ebean.find(ExamRoom.class, id);
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
            }
        }
        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public Result removeRoomExceptionHour(Long id) {
        ExceptionWorkingHours exception = Ebean.find(ExceptionWorkingHours.class, id);

        exception.delete();

        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public Result inactivateExamRoom(Long id) {

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return notFound();
        }
        room.setState(ExamRoom.State.INACTIVE.toString());
        room.update();
        return ok(Json.toJson(room));
    }

    @Restrict(@Group({"ADMIN"}))
    public Result activateExamRoom(Long id) {

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return notFound();
        }
        room.setState(ExamRoom.State.ACTIVE.toString());
        room.update();
        return ok(Json.toJson(room));
    }
}


