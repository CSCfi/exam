package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import models.*;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.LocalTime;
import org.joda.time.format.ISODateTimeFormat;
import org.springframework.util.CollectionUtils;
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

        List<ExamRoom> rooms = Ebean.find(ExamRoom.class)
                .fetch("examMachines")
                .findList();

        if(!CollectionUtils.isEmpty(rooms)) {

            for(ExamRoom room : rooms) {
                if(!CollectionUtils.isEmpty(room.getExamMachines())) {
                    Iterator i = room.getExamMachines().iterator();
                    while(i.hasNext()) {
                        ExamMachine machine = (ExamMachine) i.next();

                        if(machine.isArchived()) {
                            i.remove();
                        }
                    }
                }
            }
        }

        return ok(Json.toJson(rooms));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getExamRoom(Long id) {
        Logger.debug("getExamRoomid)");
        ExamRoom examRoom = Ebean.find(ExamRoom.class, id);

        return ok(Json.toJson(examRoom));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getReservationForExam(Long uid, Long eid) {
        Logger.debug("getReservationForExam()");

        Reservation reservation = Ebean.find(Reservation.class).where()
                .eq("user.id", uid)
                .findUnique();

        return ok(Json.toJson(reservation));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result createExamRoomDraft() throws MalformedDataException {
        Logger.debug("createExamRoomDraft()");

        ExamRoom examRoom = new ExamRoom();
        examRoom.setName("Kirjoita tenttitilan nimi tähän");
        examRoom.setState("SAVED");
        examRoom.save();

        MailAddress mailAddress = new MailAddress();
        mailAddress.save();
        examRoom.setMailAddress(mailAddress);

        ExamMachine examMachine = new ExamMachine();
        examMachine.setName("Kone");
        examMachine.save();
        examRoom.getExamMachines().add(examMachine);

        examRoom.save();

        return ok(Json.toJson(examRoom));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result updateExamRoom(Long id) throws MalformedDataException {

        ExamRoom room = Form.form(ExamRoom.class).bindFromRequest(
                "id",
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

        room.update();

        return ok(Json.toJson(room));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result updateExamRoomAddress(Long id) throws MalformedDataException {
        MailAddress address = bindForm(MailAddress.class);
        address.update();

        return ok(Json.toJson(address));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result updateExamRoomWorkingHours(Long id) throws MalformedDataException {
        ExamRoom examRoom = Ebean.find(ExamRoom.class, id);
        if (examRoom == null) {
            return notFound();
        }
        List<DefaultWorkingHours> previous = Ebean.find(DefaultWorkingHours.class)
                .where().eq("room.id", id).findList();
        Ebean.delete(previous);

        JsonNode node = request().body().asJson();
        for (JsonNode weekDayNode : node) {
            if (weekDayNode.has("start") && weekDayNode.has("end")) {
                DefaultWorkingHours dwh = new DefaultWorkingHours();
                dwh.setRoom(examRoom);
                dwh.setDay(weekDayNode.get("weekday").asText());
                String startTime = weekDayNode.get("start").asText();
                String endTime = weekDayNode.get("end").asText();
                dwh.setStartTime(LocalTime.parse(startTime).toDateTimeToday().toDate());
                dwh.setEndTime(LocalTime.parse(endTime).toDateTimeToday().toDate());
                dwh.save();
            }
        }

        return ok();
    }

    private static DateTime fromJS(JsonNode root, String field) {
        try {
            return ISODateTimeFormat.dateTime().parseDateTime(root.get(field).asText());
        } catch (Exception e) {
            return null;
        }
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result addRoomExceptionHour(Long id) throws MalformedDataException {

        final JsonNode root = request().body().asJson();


        DateTime startDate = fromJS(root, "startDate");
        DateTime startTime = fromJS(root, "startTime");
        DateTime endDate = fromJS(root, "endDate");
        DateTime endTime = fromJS(root, "endTime");

        int offsetMillis = DateTimeZone.forID("Europe/Helsinki").getOffset(DateTime.now());

        final ExceptionWorkingHours hours = new ExceptionWorkingHours();

        if (startDate != null) {
            hours.setStartDate(startDate.plusMillis(offsetMillis).toDate());
        }

        if (startTime != null) {
            hours.setStartTime(startTime.plusMillis(offsetMillis).toDate());
        }

        if (endDate != null) {
            hours.setEndDate(endDate.plusMillis(offsetMillis).toDate());
        }

        if (endTime != null) {
            hours.setEndTime(endTime.plusMillis(offsetMillis).toDate());
        }


        hours.save();
        ExamRoom examRoom = Ebean.find(ExamRoom.class, id);
        hours.setRoom(examRoom);
        examRoom.getCalendarExceptionEvents().add(hours);

        examRoom.save();

        return ok(Json.toJson(hours));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result updateExamRoomAccessibility(Long id) throws MalformedDataException {
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
    public static Result addExamRoomAccessibility(Long id) throws MalformedDataException {
        ExamRoom room = Ebean.find(ExamRoom.class, id);
        final Accessibility accessibility = bindForm(Accessibility.class);
        accessibility.save();
        room.save();
        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result removeExamRoomAccessibility(Long id) throws MalformedDataException {
        Accessibility accessibility = Ebean.find(Accessibility.class, id);
        accessibility.delete();
        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result removeRoomExceptionHour(Long id) throws MalformedDataException {
        ExceptionWorkingHours exception = Ebean.find(ExceptionWorkingHours.class, id);

        exception.delete();

        return ok();
    }


    @Restrict(@Group({"ADMIN"}))
    public static Result removeExamRoom(Long id) throws MalformedDataException {

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        room.delete();

        return ok();
    }
}
