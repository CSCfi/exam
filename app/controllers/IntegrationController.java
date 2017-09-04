package controllers;


import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import controllers.base.BaseController;
import models.Exam;
import models.ExamRecord;
import models.ExamRoom;
import models.Reservation;
import models.dto.ExamScore;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import play.libs.Json;
import play.mvc.Result;
import play.mvc.Results;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

public class IntegrationController extends BaseController {

    private static final ObjectMapper SORTED_MAPPER = new ObjectMapper();
    static {
        SORTED_MAPPER.configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    @SubjectNotPresent
    public Result getNewRecords(String startDate) {
        return ok(Json.toJson(getScores(startDate)));
    }

    // for testing purposes
    @SubjectNotPresent
    public Result getNewRecordsAlphabeticKeyOrder(String startDate) {
        try {
            return ok(convertNode(Json.toJson(getScores(startDate))));
        } catch (JsonProcessingException e) {
            return Results.internalServerError(e.getMessage());
        }
    }

    @SubjectNotPresent
    public Result getReservations(Optional<String> start, Optional<String> end, Optional<Long> roomId) {
        PathProperties pp = PathProperties.parse("(startAt, endAt, noShow, " +
                "user(firstName, lastName, email, userIdentifier), " +
                "enrolment(exam(name, examOwners(firstName, lastName, email), parent(examOwners(firstName, lastName, email)))), " +
                "machine(name, ipAddress, otherIdentifier, room(name, roomCode)))");
        Query<Reservation> query = Ebean.find(Reservation.class);
        pp.apply(query);
        ExpressionList<Reservation> el = query.where()
                .isNotNull("enrolment")
                .ne("enrolment.exam.state", Exam.State.DELETED);
        if (start.isPresent()) {
            DateTime startDate = ISODateTimeFormat.dateTimeParser().parseDateTime(start.get());
            el = el.ge("startAt", startDate.toDate());
        }

        if (end.isPresent()) {
            DateTime endDate = ISODateTimeFormat.dateTimeParser().parseDateTime(end.get());
            el = el.lt("endAt", endDate.toDate());
        }
        if (roomId.isPresent()) {
            el = el.eq("machine.room.id", roomId.get());
        }
        Set<Reservation> reservations = el.orderBy("startAt").findSet();
        return ok(reservations, pp);
    }

    @SubjectNotPresent
    public Result getRooms() {
        PathProperties pp = PathProperties.parse("(*, defaultWorkingHours(*), " +
                "organization(*), mailAddress(*), examMachines(*))");
        Query<ExamRoom> query = Ebean.find(ExamRoom.class);
        pp.apply(query);
        List<ExamRoom> rooms = query.orderBy("name").findList();
        return ok(rooms, pp);
    }

    @SubjectNotPresent
    public Result getRoomOpeningHours(Long roomId, Optional<String> date) {
        if (!date.isPresent()) {
            return badRequest("no search date given");
        }
        LocalDate searchDate = ISODateTimeFormat.dateParser().parseLocalDate(date.get());
        PathProperties pp = PathProperties.parse("(*, defaultWorkingHours(*), calendarExceptionEvents(*))");
        Query<ExamRoom> query = Ebean.find(ExamRoom.class);
        pp.apply(query);
        ExamRoom room = query.where().idEq(roomId).findUnique();
        if (room == null) {
            return notFound("room not found");
        }
        room.setCalendarExceptionEvents(room.getCalendarExceptionEvents().stream().filter(ee -> {
            LocalDate start = new LocalDate(ee.getStartDate()).withDayOfMonth(1);
            LocalDate end = new LocalDate(ee.getEndDate()).dayOfMonth().withMaximumValue();
            return !start.isAfter(searchDate) && !end.isBefore(searchDate);

        }).collect(Collectors.toList()));
        return ok(room, pp);
    }

    private static List<ExamScore> getScores(String startDate) {
        DateTime start = ISODateTimeFormat.dateTimeParser().parseDateTime(startDate);
        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
                .fetch("examScore")
                .where()
                .gt("timeStamp", start.toDate())
                .findList();
        return examRecords.stream().map(ExamRecord::getExamScore).collect(Collectors.toList());
    }

    private static String convertNode(JsonNode node) throws JsonProcessingException {
        Object obj = SORTED_MAPPER.treeToValue(node, Object.class);
        return SORTED_MAPPER.writeValueAsString(obj);
    }

}
