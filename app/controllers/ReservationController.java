package controllers;

import com.avaje.ebean.Ebean;
import models.ExamRoom;
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

}
