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

package controllers.integration;

import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.ExpressionList;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import javax.inject.Inject;
import models.Exam;
import models.ExamRoom;
import models.Reservation;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Result;
import util.datetime.DateTimeHandler;

public class ReservationAPIController extends BaseController {

    private final DateTimeHandler dateTimeHandler;

    @Inject
    public ReservationAPIController(DateTimeHandler dateTimeHandler) {
        this.dateTimeHandler = dateTimeHandler;
    }

    @SubjectNotPresent
    public Result getReservations(Optional<String> start, Optional<String> end, Optional<Long> roomId) {
        PathProperties pp = PathProperties.parse(
            "(startAt, endAt, externalUserRef, " +
            "user(firstName, lastName, email, userIdentifier), " +
            "enrolment(noShow, " +
            "exam(id, name, examOwners(firstName, lastName, email), parent(examOwners(firstName, lastName, email)), course(name, code, credits, " +
            "identifier, gradeScale(description, externalRef, displayName), organisation(code, name, nameAbbreviation))), " +
            "collaborativeExam(name)" +
            "), " +
            "machine(name, ipAddress, otherIdentifier, room(name, roomCode)))"
        );
        Query<Reservation> query = DB.find(Reservation.class);
        pp.apply(query);
        ExpressionList<Reservation> el = query
            .where()
            .or() // *
            .and() // **
            .isNotNull("enrolment")
            .or() // ***
            .isNotNull("enrolment.collaborativeExam")
            .ne("enrolment.exam.state", Exam.State.DELETED)
            .endOr() // ***
            .endAnd() // **
            .isNotNull("externalUserRef")
            .endOr(); // *

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
        List<Reservation> reservations = el
            .findSet()
            .stream()
            .peek(r -> {
                r.setStartAt(dateTimeHandler.normalize(r.getStartAt(), r));
                r.setEndAt(dateTimeHandler.normalize(r.getEndAt(), r));
            })
            .sorted(Comparator.comparing(Reservation::getStartAt))
            .toList();

        return ok(reservations, pp);
    }

    @SubjectNotPresent
    public Result getRooms() {
        PathProperties pp = PathProperties.parse("(*, defaultWorkingHours(*), mailAddress(*), examMachines(*))");
        Query<ExamRoom> query = DB.find(ExamRoom.class);
        pp.apply(query);
        List<ExamRoom> rooms = query.orderBy("name").findList();
        return ok(rooms, pp);
    }

    @SubjectNotPresent
    public Result getRoomOpeningHours(Long roomId, Optional<String> date) {
        if (date.isEmpty()) {
            return badRequest("no search date given");
        }
        LocalDate searchDate = ISODateTimeFormat.dateParser().parseLocalDate(date.get());
        PathProperties pp = PathProperties.parse("(*, defaultWorkingHours(*), calendarExceptionEvents(*))");
        Query<ExamRoom> query = DB.find(ExamRoom.class);
        pp.apply(query);
        ExamRoom room = query.where().idEq(roomId).findOne();
        if (room == null) {
            return notFound("room not found");
        }
        room.setCalendarExceptionEvents(
            room
                .getCalendarExceptionEvents()
                .stream()
                .filter(ee -> {
                    LocalDate start = new LocalDate(ee.getStartDate()).withDayOfMonth(1);
                    LocalDate end = new LocalDate(ee.getEndDate()).dayOfMonth().withMaximumValue();
                    return !start.isAfter(searchDate) && !end.isBefore(searchDate);
                })
                .toList()
        );
        return ok(room, pp);
    }
}
