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
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

public class RoomController extends BaseController {

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result getExamRooms() {
        ExpressionList<ExamRoom> query = Ebean.find(ExamRoom.class)
                .fetch("accessibility").fetch("examMachines").where();
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

    @Restrict(@Group({"ADMIN"}))
    public Result updateExamRoomWorkingHours(Long id) {
        ExamRoom examRoom = Ebean.find(ExamRoom.class, id);
        if (examRoom == null) {
            return notFound();
        }
        List<DefaultWorkingHours> previous = Ebean.find(DefaultWorkingHours.class)
                .where().eq("room.id", id).findList();
        Ebean.delete(previous);

        JsonNode node = request().body().asJson();
        DateTimeFormatter formatter = DateTimeFormat.forPattern("dd.MM.yyyy HH:mmZZ");
        for (JsonNode weekday : node) {
            for (JsonNode block : weekday.get("blocks")) {
                DefaultWorkingHours dwh = new DefaultWorkingHours();
                dwh.setRoom(examRoom);
                dwh.setDay(weekday.get("weekday").asText());
                // Deliberately use first of Jan to have no DST in effect
                DateTime startTime = DateTime.parse(block.get("start").asText(), formatter).withDayOfYear(1);
                DateTime endTime = DateTime.parse(block.get("end").asText(), formatter).withDayOfYear(1);
                dwh.setStartTime(startTime.toDate());
                dwh.setEndTime(endTime.toDate());
                dwh.setTimezoneOffset(DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(endTime));
                dwh.save();
            }
        }

        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateExamStartingHours(Long id) {
        ExamRoom examRoom = Ebean.find(ExamRoom.class, id);
        if (examRoom == null) {
            return notFound();
        }
        List<ExamStartingHour> previous = Ebean.find(ExamStartingHour.class)
                .where().eq("room.id", id).findList();
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
        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public Result addRoomExceptionHour(Long id) {

        final JsonNode root = request().body().asJson();

        if (!root.has("startDate") || !root.has("endDate")) {
            return badRequest("either start or end date missing");
        }
        DateTime startDate = ISODateTimeFormat.dateTime().parseDateTime(root.get("startDate").asText());
        DateTime endDate = ISODateTimeFormat.dateTime().parseDateTime(root.get("endDate").asText());

        ExamRoom examRoom = Ebean.find(ExamRoom.class, id);
        if (examRoom == null) {
            return notFound();
        }


        final ExceptionWorkingHours hours = new ExceptionWorkingHours();
        hours.setStartDate(startDate.toDate());
        hours.setStartDateTimezoneOffset(DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(startDate.withDayOfYear(1)));
        hours.setEndDate(endDate.toDate());
        hours.setEndDateTimezoneOffset(DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(endDate.withDayOfYear(1)));
        hours.setRoom(examRoom);
        hours.setOutOfService(root.get("outOfService").asBoolean(true));
        hours.save();

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
