package controllers;

import com.avaje.ebean.Ebean;
import models.ExamMachine;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;

/**
 * Created by avainik on 4/9/14.
 */
public class ExamMachineController extends SitnetController {


//    @Restrict(@Group({"TEACHER", "ADMIN"}))
    public static Result getExamMachines() {
        List<ExamMachine> machines = Ebean.find(ExamMachine.class).findList();

        return ok(Json.toJson(machines));
    }

    //    @Restrict(@Group({"TEACHER", "ADMIN"}))
    public static Result getExamMachine(Long id) {
        ExamMachine machine = Ebean.find(ExamMachine.class, id);

        return ok(Json.toJson(machine));
    }
}
