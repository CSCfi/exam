package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.ExamMachine;
import models.ExamRoom;
import models.Software;
import play.Logger;
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
        Logger.debug("softwares: " + machine.getSoftwareInfo().toString());
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

    public static Result getSoftwares() {
        Logger.debug("getting software list");
        List<Software> softwares = Ebean.find(Software.class).orderBy("name").findList();

        return ok(Json.toJson(softwares));
    }

    //    @Restrict(@Group({"TEACHER", "ADMIN"}))
    public static Result getSoftware(Long id) {
        Software software = Ebean.find(Software.class, id);

        return ok(Json.toJson(software));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result addSoftware(String name) throws MalformedDataException {
        Software software = bindForm(Software.class);
        software.setName(name);
        Ebean.save(software);

        return ok(Json.toJson(software));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result updateSoftware(Long id, String name) throws MalformedDataException {
        Software software = Ebean.find(Software.class, id);
        software.setName(name);
        software.update();

        return ok(Json.toJson(software));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result removeSoftware(Long id) throws MalformedDataException {
        Logger.debug("delete software");
        Software software = Ebean.find(Software.class, id);
        software.delete();

        return ok();
    }
}
