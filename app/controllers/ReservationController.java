package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.ExamMachine;
import models.ExamRoom;
import models.MailAddress;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;

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

    public static Result createExamRoomDraft() throws MalformedDataException

    {
        Logger.debug("createExamRoomDraft()");

        ExamRoom examRoom = new ExamRoom();
        examRoom.setName("Kirjoita tenttitilan nimi tähän");
        examRoom.setState("DRAFT");
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

    //    @Restrict(@Group({"TEACHER", "ADMIN"}))
    public static Result updateExamRoom(Long id) throws MalformedDataException {
        ExamRoom room = bindForm(ExamRoom.class);
        room.update();

        return ok(Json.toJson(room));
    }

    //    @Restrict(@Group({"TEACHER", "ADMIN"}))
    public static Result updateExamRoomAddress(Long id) throws MalformedDataException {
        MailAddress address = bindForm(MailAddress.class);
        address.update();

        return ok(Json.toJson(address));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result removeExamRoom(Long id) throws MalformedDataException {

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        room.delete();

        return ok();
    }
}
