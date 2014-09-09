package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import com.fasterxml.jackson.databind.JsonNode;
import models.*;
import org.joda.time.DateTime;
import org.springframework.util.CollectionUtils;
import play.Logger;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

/**
 * Created by avainik on 4/9/14.
 */
public class ExamMachineController extends SitnetController {


    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getExamMachines() {
        List<ExamMachine> machines = Ebean.find(ExamMachine.class)
                .where()
                .eq("archived", false)
                .findList();

        return ok(Json.toJson(machines));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getExamMachine(Long id) {
        ExamMachine machine = Ebean.find(ExamMachine.class, id);

        return ok(Json.toJson(machine));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
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
        ExamMachine machine =  Form.form(ExamMachine.class).bindFromRequest(
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

        machine.update();

        return ok(Json.toJson(machine));
    }

    @Restrict({@Group("ADMIN")})
    public static Result resetExamMachineSoftwareInfo(Long mid) throws MalformedDataException {
        ExamMachine machine = Ebean.find(ExamMachine.class, mid);

        machine.setSoftwareInfo(null);
        machine.update();

        return ok(Json.toJson(machine));
    }

    @Restrict({@Group("ADMIN")})
    public static Result updateExamMachineSoftwareInfo(Long mid, Long sid) throws MalformedDataException {
        ExamMachine machine = Ebean.find(ExamMachine.class, mid);
        Software software = Ebean.find(Software.class, sid);

        machine.getSoftwareInfo().add(software);

        return ok(Json.toJson(machine));
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

        ExamMachine machine = Ebean.find(ExamMachine.class, id);

        List<Reservation> reservations = Ebean.find(Reservation.class).where().eq("machine.id", id).gt("endAt", DateTime.now()).findList();

        if(!CollectionUtils.isEmpty(reservations)) {
            Iterator i = reservations.iterator();
            while(i.hasNext()) {
                Reservation reservation = (Reservation) i.next();

                List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class).where().eq("reservation.id", reservation.getId()).findList();

                if(!CollectionUtils.isEmpty(enrolments)) {
                       for(ExamEnrolment enrollment : enrolments) {
                           enrollment.setReservation(null);
                           enrollment.update();
                       }
                }
                reservation.delete();
            }
        }

        machine.setArchived(true);
        machine.update();

        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getSoftwares() {
        Logger.debug("getting software list");
        List<Software> softwares = Ebean.find(Software.class).orderBy("name").findList();

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

    @Restrict(@Group({"ADMIN"}))
    public static Result updateExamRoomAccessibility(Long id) throws MalformedDataException {
        JsonNode json = request().body().asJson();
        final List<String> ids = Arrays.asList(json.get("ids").asText().split(","));
        ExamRoom room = Ebean.find(ExamRoom.class, id);
        room.setAccessibility(new ArrayList<Accessibility>());
        room.save();
        for(String aid : ids){
            System.out.println(aid);
            Accessibility accessibility = Ebean.find(Accessibility.class, Integer.parseInt(aid.trim()));
            room.getAccessibility().add(accessibility);
            room.save();
        }
        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result addExamRoomAccessibility(Long id) throws MalformedDataException {
        ExamRoom room = Ebean.find(ExamRoom.class, id);
        final Accessibility accessibility = bindForm(Accessibility.class);
        accessibility.save();
        room.save();
        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public static Result removeExamRoomAccessibility(Long id) throws MalformedDataException {
        Accessibility accessibility = Ebean.find(Accessibility.class, id);
        accessibility.delete();
        return ok();
    }

}
