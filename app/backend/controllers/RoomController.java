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

import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.inject.Inject;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.text.PathProperties;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import org.joda.time.format.ISODateTimeFormat;
import org.springframework.beans.BeanUtils;
import play.Logger;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import scala.concurrent.duration.Duration;

import backend.controllers.base.BaseController;
import backend.controllers.iop.transfer.api.ExternalFacilityAPI;
import backend.models.Accessibility;
import backend.models.ExamMachine;
import backend.models.ExamRoom;
import backend.models.ExamStartingHour;
import backend.models.MailAddress;
import backend.models.Role;
import backend.models.User;
import backend.models.calendar.DefaultWorkingHours;
import backend.models.calendar.ExceptionWorkingHours;
import backend.sanitizers.Attrs;
import backend.security.Authenticated;
import backend.util.config.ConfigUtil;
import backend.util.datetime.DateTimeUtils;

public class RoomController extends BaseController {

    private static final boolean EXAM_VISIT_ACTIVATED = ConfigUtil.isVisitingExaminationSupported();
    private static final Logger.ALogger logger = Logger.of(RoomController.class);

    @Inject
    private ExternalFacilityAPI externalApi;

    @Inject
    protected ActorSystem system;

    private CompletionStage<Result> updateRemote(ExamRoom room) throws MalformedURLException {
        if (room.getExternalRef() != null && EXAM_VISIT_ACTIVATED) {
            return externalApi.updateFacility(room)
                    .thenApplyAsync(x -> ok("updated"))
                    .exceptionally(throwable -> internalServerError(throwable.getMessage()));
        } else {
            return wrapAsPromise(ok());
        }
    }

    private void asyncUpdateRemote(ExamRoom room) {
        // Handle remote updates in dedicated threads
        if (room.getExternalRef() != null && EXAM_VISIT_ACTIVATED) {
            system.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
                try {
                    externalApi.updateFacility(room);
                } catch (MalformedURLException e) {
                    logger.error("Remote update of exam room #{} failed", room.getExternalRef());
                }
            }, system.dispatcher());
        }
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result getExamRooms(Http.Request request) {
        ExpressionList<ExamRoom> query = Ebean.find(ExamRoom.class)
                .fetch("accessibilities")
                .fetch("examMachines")
                .fetch("defaultWorkingHours")
                .fetch("calendarExceptionEvents")
                .where();
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!user.hasRole(Role.Name.ADMIN)) {
            query = query.ne("state", ExamRoom.State.INACTIVE.toString());
        }
        List<ExamRoom> rooms = query.findList();
        for (ExamRoom room : rooms) {
            room.getExamMachines().removeIf(ExamMachine::isArchived);
        }
        PathProperties props = PathProperties.parse(
                "(*, mailAddress(*), accessibilities(*), defaultWorkingHours(*), calendarExceptionEvents(*), examMachines(*, softwareInfo(*)))");
        return ok(rooms, props);
    }

    @Restrict(@Group("ADMIN"))
    public Result getExamRoom(Long id) {
        ExamRoom examRoom = Ebean.find(ExamRoom.class, id);
        if (examRoom == null) {
            return notFound("room not found");
        }
        PathProperties props = PathProperties.parse(
                "(*, defaultWorkingHours(*), calendarExceptionEvents(*), accessibilities(*), mailAddress(*), examStartingHours(*), examMachines(*))");
        return ok(examRoom, props);
    }

    @Restrict(@Group({"ADMIN"}))
    public Result createExamRoomDraft() {
        ExamRoom examRoom = new ExamRoom();
        examRoom.setState("SAVED");
        examRoom.setLocalTimezone(ConfigUtil.getDefaultTimeZone().getID());
        examRoom.setMailAddress(new MailAddress());
        examRoom.save();
        return ok(Json.toJson(examRoom));
    }

    @Restrict(@Group({"ADMIN"}))
    public CompletionStage<Result> updateExamRoom(Long id, Http.Request request) throws MalformedURLException {
        ExamRoom room = formFactory.form(ExamRoom.class).bindFromRequest(request,
                "name",
                "roomCode",
                "buildingName",
                "campus",
                "accessibilityInfo",
                "accessible",
                "roomInstruction",
                "roomInstructionEN",
                "roomInstructionSV",
                "contactPerson",
                "videoRecordingsURL",
                "examMachineCount",
                "statusComment",
                "outOfService",
                "state",
                "expanded").get();
        ExamRoom existing = Ebean.find(ExamRoom.class, id);
        if (existing == null) {
            return wrapAsPromise(notFound());
        }
        existing.setName(room.getName());
        existing.setRoomCode(room.getRoomCode());
        existing.setBuildingName(room.getBuildingName());
        existing.setCampus(room.getCampus());
        existing.setAccessible(room.getAccessible());
        existing.setRoomInstruction(room.getRoomInstruction());
        existing.setRoomInstructionEN(room.getRoomInstructionEN());
        existing.setRoomInstructionSV(room.getRoomInstructionSV());
        existing.setContactPerson(room.getContactPerson());
        existing.setVideoRecordingsURL(room.getVideoRecordingsURL());
        existing.setStatusComment(room.getStatusComment());
        existing.setOutOfService(room.getOutOfService());
        existing.setState(room.getState());
        existing.setExpanded(room.getExpanded());

        existing.update();

        return updateRemote(existing);
    }

    @Restrict(@Group({"ADMIN"}))
    public CompletionStage<Result> updateExamRoomAddress(Long id, Http.Request request) throws MalformedURLException {
        MailAddress address = bindForm(MailAddress.class, request);
        MailAddress existing = Ebean.find(MailAddress.class, id);
        if (existing == null) {
            return wrapAsPromise(notFound());
        }
        Optional<ExamRoom> room = Ebean.find(ExamRoom.class).where().eq("mailAddress", existing)
                .findOneOrEmpty();
        if (!room.isPresent()) {
            return wrapAsPromise(notFound());
        }
        existing.setCity(address.getCity());
        existing.setStreet(address.getStreet());
        existing.setZip(address.getZip());
        existing.update();
        return updateRemote(room.get());
    }

    private List<DefaultWorkingHours> parseWorkingHours(JsonNode root) {
        JsonNode node = root.get("workingHours");
        DateTimeFormatter formatter = DateTimeFormat.forPattern("dd.MM.yyyy HH:mmZZ");
        List<DefaultWorkingHours> result = new ArrayList<>();
        for (JsonNode weekday : node) {
            for (JsonNode block : weekday.get("blocks")) {
                DefaultWorkingHours dwh = new DefaultWorkingHours();
                dwh.setWeekday(weekday.get("weekday").asText());
                // Deliberately use first of Jan to have no DST in effect
                DateTime startTime = DateTime.parse(block.get("start").asText(), formatter).withDayOfYear(1);
                DateTime endTime = DateTime.parse(block.get("end").asText(), formatter).withDayOfYear(1);
                dwh.setStartTime(startTime);
                dwh.setEndTime(endTime);
                result.add(dwh);
            }
        }
        return result;
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateExamRoomWorkingHours(Http.Request request) {
        JsonNode root = request.body().asJson();
        List<Long> roomIds = new ArrayList<>();
        for (JsonNode roomId : root.get("roomIds")) {
            roomIds.add(roomId.asLong());
        }
        List<ExamRoom> rooms = Ebean.find(ExamRoom.class).where().idIn(roomIds).findList();
        List<DefaultWorkingHours> blueprints = parseWorkingHours(root);
        for (ExamRoom examRoom : rooms) {
            List<DefaultWorkingHours> previous = examRoom.getDefaultWorkingHours();
            Ebean.deleteAll(previous);
            previous.clear();
            for (DefaultWorkingHours blueprint : blueprints) {
                DefaultWorkingHours copy = new DefaultWorkingHours();
                BeanUtils.copyProperties(blueprint, copy, "id", "room");
                copy.setRoom(examRoom);
                DateTime end = new DateTime(blueprint.getEndTime());
                int offset = DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(end);
                int endMillisOfDay = DateTimeUtils.resolveEndWorkingHourMillis(end, offset) - offset;
                copy.setEndTime(end.withMillisOfDay(endMillisOfDay));
                copy.setTimezoneOffset(offset);
                copy.save();
                previous.add(copy);
            }
            asyncUpdateRemote(examRoom);
        }
        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateExamStartingHours(Http.Request request) {

        JsonNode root = request.body().asJson();
        List<Long> roomIds = new ArrayList<>();
        for (JsonNode roomId : root.get("roomIds")) {
            roomIds.add(roomId.asLong());
        }

        List<ExamRoom> rooms = Ebean.find(ExamRoom.class).where().idIn(roomIds).findList();

        for (ExamRoom examRoom : rooms) {

            if (examRoom == null) {
                return notFound();
            }
            List<ExamStartingHour> previous = Ebean.find(ExamStartingHour.class)
                    .where().eq("room.id", examRoom.getId()).findList();
            Ebean.deleteAll(previous);

            JsonNode node = request.body().asJson();
            DateTimeFormatter formatter = DateTimeFormat.forPattern("dd.MM.yyyy HH:mmZZ");
            for (JsonNode hours : node.get("hours")) {
                ExamStartingHour esh = new ExamStartingHour();
                esh.setRoom(examRoom);
                // Deliberately use first/second of Jan to have no DST in effect
                DateTime startTime = DateTime.parse(hours.asText(), formatter).withDayOfYear(1);
                esh.setStartingHour(startTime.toDate());
                esh.setTimezoneOffset(DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(startTime));

                esh.save();
            }
            asyncUpdateRemote(examRoom);
        }
        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public Result addRoomExceptionHour(Http.Request request) {

        final JsonNode exception = request.body().asJson().get("exception");
        final JsonNode ids = request.body().asJson().get("roomIds");

        if (!exception.has("startDate") || !exception.has("endDate")) {
            return badRequest("either start or end date missing");
        }
        DateTime startDate = ISODateTimeFormat.dateTime().parseDateTime(exception.get("startDate").asText());
        DateTime endDate = ISODateTimeFormat.dateTime().parseDateTime(exception.get("endDate").asText());

        List<Long> roomIds = StreamSupport.stream(ids.spliterator(), false)
                .map(JsonNode::asLong)
                .collect(Collectors.toList());

        ExceptionWorkingHours hours = null;

        for (Long id : roomIds) {
            ExamRoom examRoom = Ebean.find(ExamRoom.class, id);
            if (examRoom == null) {
                return notFound();
            }

            hours = new ExceptionWorkingHours();
            hours.setStartDate(startDate.toDate());
            hours.setStartDateTimezoneOffset(DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(startDate));
            hours.setEndDate(endDate.toDate());
            hours.setEndDateTimezoneOffset(DateTimeZone.forID(examRoom.getLocalTimezone()).getOffset(endDate));
            hours.setRoom(examRoom);
            hours.setOutOfService(exception.get("outOfService").asBoolean(true));
            if (roomIds.size() > 1) {
                hours.setMassEdited(true);
            }
            hours.save();
            examRoom.getCalendarExceptionEvents().add(hours);
            asyncUpdateRemote(examRoom);
        }

        return ok(Json.toJson(hours));
    }

    @Restrict(@Group({"ADMIN"}))
    public Result updateExamRoomAccessibility(Long id, Http.Request request) {
        JsonNode json = request.body().asJson();
        final List<String> ids = Arrays.asList(json.get("ids").asText().split(","));

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return notFound();
        }
        room.getAccessibilities().clear();
        room.save();

        if (!ids.isEmpty()) {
            for (String aid : ids) {
                int accessibilityId;
                try {
                    accessibilityId = Integer.parseInt(aid.trim());
                } catch (Exception ex) {
                    break;
                }
                Accessibility accessibility = Ebean.find(Accessibility.class, accessibilityId);
                room.getAccessibilities().add(accessibility);
                room.save();
                asyncUpdateRemote(room);
            }
        }
        return ok();
    }

    @Restrict(@Group({"ADMIN"}))
    public CompletionStage<Result> removeRoomExceptionHour(Long roomId, Long exceptionId) throws MalformedURLException {
        ExceptionWorkingHours exception = Ebean.find(ExceptionWorkingHours.class, exceptionId);
        ExamRoom room = Ebean.find(ExamRoom.class, roomId);
        if (exception == null || room == null) {
            return wrapAsPromise(notFound());
        }
        exception.delete();
        room.getCalendarExceptionEvents().remove(exception);
        return updateRemote(room);
    }

    @Restrict(@Group({"ADMIN"}))
    public CompletionStage<Result> inactivateExamRoom(Long id) throws MalformedURLException {

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return wrapAsPromise(notFound());
        }
        room.setState(ExamRoom.State.INACTIVE.toString());
        room.update();

        if (room.getExternalRef() != null && EXAM_VISIT_ACTIVATED) {
            return externalApi.inactivateFacility(room.getId())
                    .thenApplyAsync(response -> ok(Json.toJson(room)));
        } else {
            return wrapAsPromise(ok(Json.toJson(room)));
        }
    }

    @Restrict(@Group({"ADMIN"}))
    public CompletionStage<Result> activateExamRoom(Long id) throws MalformedURLException {

        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return wrapAsPromise(notFound());
        }
        room.setState(ExamRoom.State.ACTIVE.toString());
        room.update();

        if (room.getExternalRef() != null && EXAM_VISIT_ACTIVATED) {
            return externalApi.activateFacility(room.getId())
                    .thenApplyAsync(response -> ok(Json.toJson(room)));
        } else {
            return wrapAsPromise(ok(Json.toJson(room)));
        }
    }
}


