/*
 * Copyright (c) 2017 Exam Consortium
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

package controllers;


import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.base.BaseController;
import models.Course;
import models.Exam;
import models.ExamEnrolment;
import models.ExamRoom;
import models.Reservation;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.libs.Json;
import play.mvc.Result;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

public class ReportController extends BaseController {

    @Restrict({@Group("ADMIN")})
    public Result listDepartments() {
        List<Course> courses = Ebean.find(Course.class).where().isNotNull("department").findList();
        Set<String> departments = courses.stream()
                .map(Course::getDepartment)
                .collect(Collectors.toSet());
        ObjectNode node = Json.newObject();
        ArrayNode arrayNode = node.putArray("departments");
        departments.forEach(arrayNode::add);
        return ok(Json.toJson(node));
    }

    private <T> ExpressionList<T> applyFilters(ExpressionList<T> query, String deptFieldPrefix, String dateField,
                                               String dept, String start, String end) {
        ExpressionList<T> result = query;
        if (dept != null) {
            String[] depts = dept.split(",");
            result = result.in(String.format("%s.department", deptFieldPrefix), (Object[]) depts);
        }
        if (start != null) {
            DateTime startDate = DateTime.parse(start, ISODateTimeFormat.dateTimeParser());
            result = result.ge(dateField, startDate.toDate());
        }
        if (end != null) {
            DateTime endDate = DateTime.parse(end, ISODateTimeFormat.dateTimeParser()).plusDays(1);
            result = result.lt(dateField, endDate.toDate());
        }
        return result;
    }

    @Restrict({@Group("ADMIN")})
    public Result getExamParticipations(Optional<String> dept, Optional<String> start, Optional<String> end) {
        ExpressionList<ExamEnrolment> query = Ebean.find(ExamEnrolment.class)
                .fetch("exam", "id, created")
                .where()
                .ne("exam.state", Exam.State.PUBLISHED)
                .isNotNull("reservation.machine")
                .ne("reservation.noShow", true);
        query = applyFilters(query, "exam.course", "exam.created", dept.orElse(null), start.orElse(null), end.orElse(null));
        Map<String, List<ExamEnrolment>> roomMap = new HashMap<>();
        for (ExamEnrolment enrolment : query.findList()) {
            ExamRoom room = enrolment.getReservation().getMachine().getRoom();
            String key = String.format("%d:%s", room.getId(), room.getName());
            if (!roomMap.containsKey(key)) {
                roomMap.put(key, new ArrayList<>());
            }
            roomMap.get(key).add(enrolment);
        }
        // Fill in the rooms that have no associated participations
        List<ExamRoom> rooms = Ebean.find(ExamRoom.class).where().eq("outOfService", false).findList();
        for (ExamRoom room : rooms) {
            String key = String.format("%d:%s", room.getId(), room.getName());
            if (!roomMap.containsKey(key)) {
                // empty list indicates no participations
                roomMap.put(key, new ArrayList<>());
            }
        }
        return ok(roomMap);
    }

    // DTO for minimizing output from this API
    private class ExamInfo {
        String name;
        Integer participations;
        String state;

        public String getName() {
            return name;
        }

        public Integer getParticipations() {
            return participations;
        }

        public String getState() {
            return state;
        }
    }

    private boolean applyExamFilter(Exam e, Optional<String> start, Optional<String> end) {
        Boolean result = e.getState().ordinal() > Exam.State.PUBLISHED.ordinal() && !e.getExamParticipations().isEmpty();
        DateTime created = e.getCreated();
        if (start.isPresent()) {
            DateTime startDate = DateTime.parse(start.get(), ISODateTimeFormat.dateTimeParser());
            result = result && startDate.isBefore(created);
        }
        if (end.isPresent()) {
            DateTime endDate = DateTime.parse(end.get(), ISODateTimeFormat.dateTimeParser()).plusDays(1);
            result = result && endDate.isAfter(created);
        }
        return result;
    }

    @Restrict({@Group("ADMIN")})
    public Result getPublishedExams(Optional<String> dept, Optional<String> start, Optional<String> end) {
        ExpressionList<Exam> query = Ebean.find(Exam.class)
                .fetch("course", "code")
                .where()
                .isNull("parent")
                .isNotNull("course")
                .disjunction()
                .eq("state", Exam.State.PUBLISHED)
                .eq("state", Exam.State.DELETED)
                .eq("state", Exam.State.ARCHIVED)
                .endJunction();
        query = applyFilters(query, "course", "created", dept.orElse(null), null, null);
        Set<Exam> exams = query.findSet();
        List<ExamInfo> infos = new ArrayList<>();
        for (Exam exam : exams) {
            ExamInfo info = new ExamInfo();
            info.name = String.format("[%s] %s", exam.getCourse().getCode(), exam.getName());
            info.participations = exam.getChildren().stream()
                    .filter(e -> applyExamFilter(e, start, end))
                    .collect(Collectors.toList())
                    .size();
            infos.add(info);
        }
        return ok(Json.toJson(infos));
    }

    @Restrict({@Group("ADMIN")})
    public Result getReservations(Optional<String> dept, Optional<String> start, Optional<String> end) {
        ExpressionList<Reservation> query = Ebean.find(Reservation.class).where();
        query = applyFilters(query, "enrolment.exam.course", "startAt",
                dept.orElse(null), start.orElse(null), end.orElse(null));
        return ok(query.findList());
    }


    @Restrict({@Group("ADMIN")})
    public Result getResponses(Optional<String> dept, Optional<String> start, Optional<String> end) {
        ExpressionList<Exam> query = Ebean.find(Exam.class).where()
                .isNotNull("parent")
                .isNotNull("course");
        query = applyFilters(query, "course", "created", dept.orElse(null), start.orElse(null), end.orElse(null));
        Set<Exam> exams = query.findSet();
        List<ExamInfo> infos = new ArrayList<>();
        for (Exam exam : exams.stream()
                .filter(e -> e.getState().ordinal() > Exam.State.PUBLISHED.ordinal())
                .collect(Collectors.toList())) {
            ExamInfo info = new ExamInfo();
            info.state = exam.getState().toString();
            infos.add(info);
        }
        return ok(Json.toJson(infos));
    }

}
