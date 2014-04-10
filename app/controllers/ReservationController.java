package controllers;

import com.avaje.ebean.Ebean;
import models.ExamRoom;
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
}
