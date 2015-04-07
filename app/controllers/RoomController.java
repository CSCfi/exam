package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.fasterxml.jackson.databind.JsonNode;
import exceptions.MalformedDataException;
import models.*;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import org.joda.time.format.ISODateTimeFormat;
import play.Logger;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

/**
 * Created by avainik on 4/9/14.
 */
public class RoomController extends SitnetController {

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getExamRooms() {
        ExpressionList<ExamRoom> query = Ebean.find(ExamRoom.class).fetch("examMachines").where();
        if (!UserController.getLoggedUser().hasRole("ADMIN"))
        {
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
    public static Result getExamRoom(Long id) {
        Logger.debug("getExamRoomid)");
        ExamRoom examRoom = Ebean.find(ExamRoom.class, id);

        return ok(Json.toJson(examRoom));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result createExamRoomDraft() {
        Logger.debug("createExamRoomDraft()");

        ExamRoom examRoom = new ExamRoom();
        examRoom.setName("Kirjoita tenttitilan nimi tähän");
        examRoom.setState("SAVED");
        examRoom.save();
        return ok(Json.toJson(examRoom));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result updateExamRoom(Long id) {

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

        ExamRoom existing = Ebean.find(ExamRoom.class, id);
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
    public static Result updateExamRoomAddress(Long id) throws MalformedDataException {
        MailAddress address = bindForm(MailAddress.class);
        MailAddress existing = Ebean.find(MailAddress.class, id);
        existing.setCity(address.getCity());
        existing.setStreet(address.getStreet());
        existing.setZip(address.getZip());
        existing.update();
        return ok(Json.toJson(address));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result updateExamRoomWorkingHours(Long id) {
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
                String startTime = block.get("start").asText();
                String endTime = block.get("end").asText();
                // Deliberately use first of Jan to have no DST in effect
                dwh.setStartTime(DateTime.parse(startTime, formatter).withDayOfYear(1).toDate());
                dwh.setEndTime(DateTime.parse(endTime, formatter).withDayOfYear(1).toDate());
                dwh.save();
            }
        }

        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result addRoomExceptionHour(Long id) {

        final JsonNode root = request().body().asJson();

        DateTime startDate = root.has("startDate") ? ISODateTimeFormat.dateTime().parseDateTime(root.get("startDate").asText()) : null;
        DateTime startTime = root.has("startTime") ? ISODateTimeFormat.dateTime().parseDateTime(root.get("startTime").asText()) : null;
        DateTime endDate = root.has("endDate") ? ISODateTimeFormat.dateTime().parseDateTime(root.get("endDate").asText()) : null;
        DateTime endTime = root.has("endTime") ? ISODateTimeFormat.dateTime().parseDateTime(root.get("endTime").asText()) : null;

        final ExceptionWorkingHours hours = new ExceptionWorkingHours();

        if (startDate != null) {
            hours.setStartDate(startDate.toDate());
        }

        if (startTime != null) {
            hours.setStartTime(startTime.withDayOfYear(1).toDate());
        }

        if (endDate != null) {
            hours.setEndDate(endDate.toDate());
        }

        if (endTime != null) {
            hours.setEndTime(endTime.withDayOfYear(1).toDate());
        }

        hours.save();
        ExamRoom examRoom = Ebean.find(ExamRoom.class, id);
        hours.setRoom(examRoom);
        examRoom.getCalendarExceptionEvents().add(hours);

        examRoom.save();

        return ok(Json.toJson(hours));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result updateExamRoomAccessibility(Long id) {
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
    public static Result removeRoomExceptionHour(Long id) {
        ExceptionWorkingHours exception = Ebean.find(ExceptionWorkingHours.class, id);

        exception.delete();

        return ok();
    }


    @Restrict(@Group({"ADMIN"}))
    public static Result inactivateExamRoom(Long id) {

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return notFound();
        }
        room.setState(ExamRoom.State.INACTIVE.toString());
        room.update();
        return ok(Json.toJson(room));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result activateExamRoom(Long id) {

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return notFound();
        }
        room.setState(ExamRoom.State.ACTIVE.toString());
        room.update();
        return ok(Json.toJson(room));
    }
}
