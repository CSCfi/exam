/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.controllers;

import java.util.List;
import java.util.stream.Collectors;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.ebean.Ebean;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import org.joda.time.DateTime;
import play.libs.Json;
import play.mvc.Result;

import backend.controllers.base.BaseController;
import backend.models.ExamMachine;
import backend.models.ExamRoom;
import backend.models.Reservation;
import backend.models.Software;

public class ExamMachineController extends BaseController {


    @Restrict({@Group("ADMIN")})
    public Result getExamMachines() {
        List<ExamMachine> machines = Ebean.find(ExamMachine.class)
                .where()
                .eq("archived", false)
                .findList();

        return ok(machines);
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result getExamMachine(Long id) {
        PathProperties pp = PathProperties.parse("(*, softwareInfo(*), room(name, buildingName))");
        Query<ExamMachine> query = Ebean.find(ExamMachine.class);
        pp.apply(query);
        ExamMachine machine = query.where().idEq(id).findOne();
        return ok(machine, pp);
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
        ExamMachine src = formFactory.form(ExamMachine.class).bindFromRequest(
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
        if (dest == null) {
            return notFound();
        }
        ExamRoom room = dest.getRoom();

        if (src.getIpAddress().length() > 0) {
            List<ExamMachine> machines = Ebean.find(ExamMachine.class).findList();
            List<String> ips = machines.stream()
                    .filter(m -> !m.equals(dest))
                    .map(ExamMachine::getIpAddress)
                    .collect(Collectors.toList());
            if (ips.contains(src.getIpAddress())) {
                return forbidden("sitnet_error_ip_address_exists_for_room");
            }
        }

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
        PathProperties pp = PathProperties.parse("(*, softwareInfo(*), room(name, buildingName))");

        return ok(dest, pp);
    }

    @Restrict({@Group("ADMIN")})
    public Result resetExamMachineSoftwareInfo(Long mid) {
        ExamMachine machine = Ebean.find(ExamMachine.class, mid);
        if (machine == null) {
            return notFound();
        }

        machine.getSoftwareInfo().clear();
        machine.update();
        PathProperties pp = PathProperties.parse("(*, softwareInfo(*), room(name, buildingName))");

        return ok(machine, pp);
    }

    @Restrict({@Group("ADMIN")})
    public Result updateExamMachineSoftwareInfo(Long mid, Long sid) {
        ExamMachine machine = Ebean.find(ExamMachine.class, mid);
        if (machine == null) {
            return notFound();
        }
        Software software = Ebean.find(Software.class, sid);

        machine.getSoftwareInfo().add(software);
        machine.update();

        return ok(machine.getSoftwareInfo());
    }

    @Restrict({@Group("ADMIN")})
    public Result toggleExamMachineSoftwareInfo(Long mid, Long sid) {
        ExamMachine machine = Ebean.find(ExamMachine.class, mid);
        if (machine == null) {
            return notFound();
        }

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
        if (room == null) {
            return notFound();
        }
        ExamMachine machine = bindForm(ExamMachine.class);
        room.getExamMachines().add(machine);
        room.save();

        machine.save();

        return ok(machine);
    }

    @Restrict(@Group({"ADMIN"}))
    public Result removeExamMachine(Long id) {
        // SIT-690
        return forbidden();
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result getSoftwares() {
        List<Software> softwares = Ebean.find(Software.class)
                .where()
                .eq("status", "ACTIVE")
                .orderBy("name")
                .findList();

        return ok(softwares);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result getSoftware(Long id) {
        Software software = Ebean.find(Software.class, id);

        return ok(software);
    }

    @Restrict(@Group({"ADMIN"}))
    public Result addSoftware(String name) {
        Software software = bindForm(Software.class);
        software.setStatus("ACTIVE");
        software.setName(name);
        Ebean.save(software);

        return ok(software);
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateSoftware(Long id, String name) {
        Software software = Ebean.find(Software.class, id);
        if (software == null) {
            return notFound();
        }
        software.setName(name);
        software.setStatus("ACTIVE");
        software.update();

        return ok(software);
    }

    @Restrict(@Group({"ADMIN"}))
    public Result removeSoftware(Long id) {
        Software software = Ebean.find(Software.class, id);
        if (software == null) {
            return notFound();
        }
        software.setStatus("DISABLED");
        software.update();

        return ok();
    }

}
