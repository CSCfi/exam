package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.node.ObjectNode;
import exceptions.MalformedDataException;
import models.*;
import org.joda.time.DateTime;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;

public class ExamMachineController extends BaseController {


    @Restrict({@Group("ADMIN")})
    public Result getExamMachines() {
        List<ExamMachine> machines = Ebean.find(ExamMachine.class)
                .where()
                .eq("archived", false)
                .findList();

        return ok(Json.toJson(machines));
    }

    @Restrict({@Group("ADMIN")})
    public Result getExamMachine(Long id) {
        ExamMachine machine = Ebean.find(ExamMachine.class, id);

        return ok(Json.toJson(machine));
    }

    @Restrict({@Group("ADMIN")})
    public Result getExamMachineReservationsFromNow(Long id) {

        List<Reservation> reservations = Ebean.find(Reservation.class)
                .where()
                .eq("machine.id", id)
                .gt("endAt", DateTime.now()) //.minus(1000 * 60 * 60 * 24))
                .findList();

        return ok(reservations);
    }


    @Restrict({@Group("ADMIN")})
    public Result updateExamMachine(Long id) {
        ExamMachine src = Form.form(ExamMachine.class).bindFromRequest(
                "id",
                "name",
                "otherIdentifier",
                "accessibilityInfo",
                "accessible",
                "ipAddress",
                "surveillanceCamera",
                "videoRecordings",
                "expanded",
                "statusComment",
                "outOfService"
        ).get();
        ExamMachine dest = Ebean.find(ExamMachine.class, id);
        dest.setName(src.getName());
        dest.setOtherIdentifier(src.getOtherIdentifier());
        dest.setAccessibilityInfo(src.getAccessibilityInfo());
        dest.setAccessible(src.isAccessible());
        dest.setIpAddress(src.getIpAddress());
        dest.setSurveillanceCamera(src.getSurveillanceCamera());
        dest.setVideoRecordings(src.getVideoRecordings());
        dest.setExpanded(src.getExpanded());
        dest.setStatusComment(src.getStatusComment());
        dest.setOutOfService(src.getOutOfService());

        dest.update();

        return ok(Json.toJson(dest));
    }

    @Restrict({@Group("ADMIN")})
    public Result resetExamMachineSoftwareInfo(Long mid) {
        ExamMachine machine = Ebean.find(ExamMachine.class, mid);

        machine.getSoftwareInfo().clear();
        machine.update();

        return ok(Json.toJson(machine));
    }

    @Restrict({@Group("ADMIN")})
    public Result updateExamMachineSoftwareInfo(Long mid, Long sid) {
        ExamMachine machine = Ebean.find(ExamMachine.class, mid);
        Software software = Ebean.find(Software.class, sid);

        machine.getSoftwareInfo().add(software);
        machine.update();

        return ok(Json.toJson(machine.getSoftwareInfo()));
    }

    @Restrict({@Group("ADMIN")})
    public Result toggleExamMachineSoftwareInfo(Long mid, Long sid) {
        ExamMachine machine = Ebean.find(ExamMachine.class, mid);
        Software software = Ebean.find(Software.class, sid);

        if (machine.getSoftwareInfo().contains(software)) {
            machine.getSoftwareInfo().remove(software);
            machine.update();
            ObjectNode part = Json.newObject();
            part.put("software", "false");

            return ok(Json.toJson(part));
        } else {
            machine.getSoftwareInfo().add(software);
            machine.update();

            ObjectNode part = Json.newObject();
            part.put("software", "true");

            return ok(Json.toJson(part));
        }
    }

    @Restrict({@Group("ADMIN")})
    public Result insertExamMachine(Long id) {

        ExamRoom room = Ebean.find(ExamRoom.class, id);

        ExamMachine machine = bindForm(ExamMachine.class);
        //Logger.debug("softwares: " + machine.getSoftwareInfo().toString());
        room.getExamMachines().add(machine);
        room.save();

        machine.save();

        return ok(Json.toJson(machine));
    }

    @Restrict(@Group({"ADMIN"}))
    public Result removeExamMachine(Long id) {
        // SIT-690
        return forbidden("Tenttikoneen poistaminen estetty väliaikaisesti");
    }

    @Restrict(@Group("ADMIN"))
    public Result hasSoftwareExams(Long sid) {
        List<Exam> exams = Ebean.find(Exam.class)
                .where()
                .in("softwares.id", sid)
                .findList();
        return exams.isEmpty() ? notFound() : ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result getSoftwares() {
        List<Software> softwares = Ebean.find(Software.class)
                .where()
                .eq("status", "ACTIVE")
                .orderBy("name")
                .findList();

        return ok(Json.toJson(softwares));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result getSoftware(Long id) {
        Software software = Ebean.find(Software.class, id);

        return ok(Json.toJson(software));
    }

    @Restrict(@Group({"ADMIN"}))
    public Result addSoftware(String name) {
        Software software = bindForm(Software.class);
        software.setStatus("ACTIVE");
        software.setName(name);
        Ebean.save(software);

        return ok(Json.toJson(software));
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateSoftware(Long id, String name) {
        Software software = Ebean.find(Software.class, id);
        software.setName(name);
        software.setStatus("ACTIVE");
        software.update();

        return ok(Json.toJson(software));
    }

    @Restrict(@Group({"ADMIN"}))
    public Result removeSoftware(Long id) {
        Software software = Ebean.find(Software.class, id);
        software.setStatus("DISABLED");
        software.update();

        return ok();
    }

}