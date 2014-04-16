package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.ExamMachine;
import models.ExamRoom;
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

    //    @Restrict(@Group({"TEACHER", "ADMIN"}))
    public static Result updateExamMachine(Long id) throws MalformedDataException {
        ExamMachine machine = bindForm(ExamMachine.class);
        machine.update();

        return ok(Json.toJson(machine));
    }

    public static Result insertExamMachine(Long id) throws MalformedDataException {

        ExamRoom room = Ebean.find(ExamRoom.class, id);

        ExamMachine machine = bindForm(ExamMachine.class);

        room.getExamMachines().add(machine);
        room.save();

        machine.save();

        return ok(Json.toJson(machine));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result removeExamMachine(Long id) throws MalformedDataException {

        ExamMachine machine = Ebean.find(ExamMachine.class, id);
        machine.delete();

        return ok();
    }
}
