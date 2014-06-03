package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.ExamMachine;
import models.ExamRoom;
import models.MailAddress;
import models.Reservation;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

import java.util.Date;
import java.sql.Timestamp;
import java.util.List;

/**
 * Created by avainik on 4/9/14.
 */
public class ReservationController extends SitnetController {


    //    @Restrict(@Group({"TEACHER", "ADMIN"}))
    public static Result getExamRooms() {
        List<ExamRoom> rooms = Ebean.find(ExamRoom.class).findList();
        return ok(Json.toJson(rooms));
    }

    public static Result getExamRoom(Long id) {
        Logger.debug("getExamRoomid)");

//        Query<ExamRoom> query = Ebean.createQuery(ExamRoom.class);
//        query.fetch("course");
//        query.fetch("examSections");
//        query.setId(id);

//        Exam exam = query.findUnique();

        ExamRoom examRoom = Ebean.find(ExamRoom.class, id);

        return ok(Json.toJson(examRoom));
    }

    public static Result getReservationForExam(Long uid, Long eid) {
        Logger.debug("getReservationForExam()");

        Reservation reservation = Ebean.find(Reservation.class).where()
        .eq("user.id", uid)
        .findUnique();

        return ok(Json.toJson(reservation));
    }

    public static Result createExamRoomDraft() throws MalformedDataException

    {
        Logger.debug("createExamRoomDraft()");

        ExamRoom examRoom = new ExamRoom();
        examRoom.setName("Kirjoita tenttitilan nimi tähän");
        examRoom.setState("SAVED");
        examRoom.save();

        MailAddress mailAddress = new MailAddress();
        mailAddress.save();
        examRoom.setMailAddress(mailAddress);

        DefaultWorkingHours workingHours = new DefaultWorkingHours();
        Date date = new Date();
        workingHours.setStartTime(new Timestamp(date.getTime()));
        workingHours.setEndTime(new Timestamp(date.getTime()));
        workingHours.save();
        examRoom.setCalendarEvent(workingHours);

        ExamMachine examMachine = new ExamMachine();
        examMachine.setName("Kone");
        examMachine.save();
        examRoom.getExamMachines().add(examMachine);

        examRoom.save();

        return ok(Json.toJson(examRoom));
    }

    //    @Restrict(@Group({"TEACHER", "ADMIN"}))
    public static Result updateExamRoom(Long id) throws MalformedDataException {
//        DynamicForm df = Form.form().bindFromRequest();
//
//        Long start = new Long(df.get("examActiveStartDate"));
//        Long end = new Long(df.get("examActiveEndDate"));

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
                "contactPerson",
                "videoRecordingsURL",
                "examMachineCount",
                "statusComment",
                "outOfService",
                "state",
                "expanded")
                .get();

        room.update();

        return ok(Json.toJson(room));
    }

    //    @Restrict(@Group({"TEACHER", "ADMIN"}))
    public static Result updateExamRoomAddress(Long id) throws MalformedDataException {
        MailAddress address = bindForm(MailAddress.class);
        address.update();

        return ok(Json.toJson(address));
    }

    //    @Restrict(@Group({"TEACHER", "ADMIN"}))
    public static Result updateExamRoomWorkingHours(Long id) throws MalformedDataException {
        DynamicForm df = Form.form().bindFromRequest();

        DefaultWorkingHours defaultHours = Ebean.find(DefaultWorkingHours.class, id);

        Long startTime = Long.parseLong(df.get("startTime"));
        Long endTime = Long.parseLong(df.get("endTime"));

        Timestamp start = new Timestamp(startTime);
        Timestamp end = new Timestamp(endTime);

        defaultHours.setStartTime(start);
        defaultHours.setEndTime(end);

        defaultHours.update();
        return ok(Json.toJson(defaultHours));
    }

    //    @Restrict(@Group({"TEACHER", "ADMIN"}))
    public static Result updateExamRoomExceptionWorkingHours(Long id) throws MalformedDataException {
        ExamRoom examRoom = Ebean.find(ExamRoom.class, id);

        DynamicForm df = Form.form().bindFromRequest();

        Long exceptionStartDate = Long.parseLong(df.get("exceptionStartDate"));
        Long exceptionStartTime = Long.parseLong(df.get("exceptionStartTime"));
        Long exceptionEndDate = Long.parseLong(df.get("exceptionEndDate"));
        Long exceptionEndTime = Long.parseLong(df.get("exceptionEndTime"));

        Timestamp exceptionStartDateTimestamp = new Timestamp(exceptionStartDate);
        Timestamp exceptionStartTimeTimestamp = new Timestamp(exceptionStartTime);
        Timestamp exceptionEndDateTimestamp = new Timestamp(exceptionEndDate);
        Timestamp exceptionEndTimeTimestamp = new Timestamp(exceptionEndTime);

        ExceptionWorkingHours exceptionHours = new ExceptionWorkingHours();

        exceptionHours.setExceptionStartDate(exceptionStartDateTimestamp);
        exceptionHours.setExceptionStartTime(exceptionStartTimeTimestamp);
        exceptionHours.setExceptionEndDate(exceptionEndDateTimestamp);
        exceptionHours.setExceptionEndTime(exceptionEndTimeTimestamp);
        exceptionHours.setRoom(examRoom);

        exceptionHours.save();
        return ok(Json.toJson(exceptionHours));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result removeExamRoom(Long id) throws MalformedDataException {

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        room.delete();

        return ok();
    }
}
