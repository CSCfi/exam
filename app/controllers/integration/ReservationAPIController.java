package controllers.integration;


import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.PathProperties;
import controllers.base.BaseController;
import models.Exam;
import models.ExamRoom;
import models.Reservation;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Result;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

public class ReservationAPIController extends BaseController {

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

}
