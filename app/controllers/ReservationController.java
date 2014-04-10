package controllers;

import Exceptions.MalformedDataException;
import Exceptions.SitnetException;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

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
        examRoom.setName("Kirjoita tentintilan nimi tähän");
        examRoom.setState("DRAFT");
        examRoom.save();

        MailAddress mailAddress = new MailAddress();
        examRoom.setMailAddress(mailAddress);

//        ExamMachine examMachine = new ExamMachine();
//
//        examRoom.setExamMachines(exam);
//        examSection.save();
//        exam.getExamSections().add(examSection);
//        exam.setDuration(new Double(3));
//        exam.setExamLanguage("fi");

        return ok(Json.toJson(examRoom));
    }
}
