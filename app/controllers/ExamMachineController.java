package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import com.fasterxml.jackson.databind.node.ObjectNode;
import exceptions.MalformedDataException;
import models.*;
import org.joda.time.DateTime;
import play.Logger;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;

/**
 * Created by avainik on 4/9/14.
 */
public class ExamMachineController extends SitnetController {


    @Restrict({@Group("ADMIN")})
    public static Result getExamMachines() {
        List<ExamMachine> machines = Ebean.find(ExamMachine.class)
                .where()
                .eq("archived", false)
                .findList();

        return ok(Json.toJson(machines));
    }

    @Restrict({@Group("ADMIN")})
    public static Result getExamMachine(Long id) {
        ExamMachine machine = Ebean.find(ExamMachine.class, id);

        return ok(Json.toJson(machine));
    }

    @Restrict({@Group("ADMIN")})
    public static Result getExamMachineReservationsFromNow(Long id) {

        List<Reservation> reservations = Ebean.find(Reservation.class)
                .where()
                .eq("machine.id", id)
                .gt("endAt", DateTime.now()) //.minus(1000 * 60 * 60 * 24))
                .findList();

        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, startAt, endAt");

        return ok(jsonContext.toJsonString(reservations, true, options)).as("application/json");
    }


    @Restrict({@Group("ADMIN")})
    public static Result updateExamMachine(Long id) throws MalformedDataException {
        ExamMachine src =  Form.form(ExamMachine.class).bindFromRequest(
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
    public static Result resetExamMachineSoftwareInfo(Long mid) throws MalformedDataException {
        ExamMachine machine = Ebean.find(ExamMachine.class, mid);

        machine.getSoftwareInfo().clear();
        machine.update();

        return ok(Json.toJson(machine));
    }

    @Restrict({@Group("ADMIN")})
    public static Result updateExamMachineSoftwareInfo(Long mid, Long sid) throws MalformedDataException {
        ExamMachine machine = Ebean.find(ExamMachine.class, mid);
        Software software = Ebean.find(Software.class, sid);

        machine.getSoftwareInfo().add(software);
        machine.update();

        return ok(Json.toJson(machine.getSoftwareInfo()));
    }

    @Restrict({@Group("ADMIN")})
    public static Result toggleExamMachineSoftwareInfo(Long mid, Long sid) throws MalformedDataException {
        ExamMachine machine = Ebean.find(ExamMachine.class, mid);
        Software software = Ebean.find(Software.class, sid);

        if(machine.getSoftwareInfo().contains(software))
        {
            machine.getSoftwareInfo().remove(software);
            machine.update();
            ObjectNode part = Json.newObject();
            part.put("software", "false");

            return ok(Json.toJson(part));
        }
        else
        {
            machine.getSoftwareInfo().add(software);
            machine.update();

            ObjectNode part = Json.newObject();
            part.put("software", "true");

            return ok(Json.toJson(part));
        }
    }

    @Restrict({@Group("ADMIN")})
    public static Result insertExamMachine(Long id) throws MalformedDataException {

        ExamRoom room = Ebean.find(ExamRoom.class, id);

        ExamMachine machine = bindForm(ExamMachine.class);
        //Logger.debug("softwares: " + machine.getSoftwareInfo().toString());
        room.getExamMachines().add(machine);
        room.save();

        machine.save();

        return ok(Json.toJson(machine));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result removeExamMachine(Long id) throws MalformedDataException {
        // SIT-690
        return forbidden("Tenttikoneen poistaminen estetty väliaikaisesti");
    }

    @Restrict(@Group("ADMIN"))
    public static Result hasSoftwareExams(Long sid) {
        List<Exam> exams = Ebean.find(Exam.class)
                .where()
                .in("softwares.id", sid)
                .findList();
        Logger.debug("size:" + exams.size());

        return exams.size() > 0 ? ok() : notFound();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getSoftwares() {
        List<Software> softwares = Ebean.find(Software.class)
                .where()
                .ne("status", "DISABLED")
                .orderBy("name")
                .findList();

        return ok(Json.toJson(softwares));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getSoftware(Long id) {
        Software software = Ebean.find(Software.class, id);

        return ok(Json.toJson(software));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result addSoftware(String name) throws MalformedDataException {
        Software software = bindForm(Software.class);
        software.setStatus("ACTIVE");
        software.setName(name);
        Ebean.save(software);

        return ok(Json.toJson(software));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result updateSoftware(Long id, String name) throws MalformedDataException {
        Software software = Ebean.find(Software.class, id);
        software.setName(name);
        software.setStatus("ACTIVE");
        software.update();

        return ok(Json.toJson(software));
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result removeSoftware(Long id) throws MalformedDataException {
        Software software = Ebean.find(Software.class, id);
        software.setStatus("DISABLED");
        software.update();

        return ok();
    }

}