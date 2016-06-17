package controllers;


import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import org.joda.time.DateTime;
import play.libs.Json;
import play.mvc.Result;

import java.util.*;
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
                                               String dept, Long start, Long end) {
        ExpressionList<T> result = query;
        if (dept != null) {
            String[] depts = dept.split(",");
            result = result.in(String.format("%s.department", deptFieldPrefix), (Object[]) depts);
        }
        if (start != null) {
            DateTime startDate = new DateTime(start).withTimeAtStartOfDay();
            result = result.ge(dateField, startDate.toDate());
        }
        if (end != null) {
            DateTime endDate = new DateTime(end).plusDays(1).withTimeAtStartOfDay();
            result = result.lt(dateField, endDate.toDate());
        }
        return result;
    }

    @Restrict({@Group("ADMIN")})
    public Result getExamParticipations(Optional<String> dept, Optional<Long> start, Optional<Long> end) {
        ExpressionList<ExamEnrolment> query = Ebean.find(ExamEnrolment.class)
                .fetch("exam", "id, created")
                .where()
                .ne("exam.state", Exam.State.PUBLISHED)
                .isNotNull("reservation")
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

    @Restrict({@Group("ADMIN")})
    public Result getPublishedExams(Optional<String> dept, Optional<Long> start, Optional<Long> end) {
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
        query = applyFilters(query, "course", "created", dept.orElse(null), start.orElse(null), end.orElse(null));
        Set<Exam> exams = query.findSet();
        List<ExamInfo> infos = new ArrayList<>();
        for (Exam exam : exams) {
            ExamInfo info = new ExamInfo();
            info.name = String.format("[%s] %s", exam.getCourse().getCode(), exam.getName());
            info.participations = exam.getChildren().stream()
                    .filter(e -> e.getState().ordinal() > Exam.State.PUBLISHED.ordinal() && !e.getExamParticipations().isEmpty())
                    .collect(Collectors.toList())
                    .size();
            infos.add(info);
        }
        return ok(Json.toJson(infos));
    }

    @Restrict({@Group("ADMIN")})
    public Result getReservations(Optional<String> dept, Optional<Long> start, Optional<Long> end) {
        ExpressionList<Reservation> query = Ebean.find(Reservation.class).where();
        query = applyFilters(query, "enrolment.exam.course", "startAt", dept.orElse(null), start.orElse(null), end.orElse(null));
        return ok(query.findList());
    }


    @Restrict({@Group("ADMIN")})
    public Result getResponses(Optional<String> dept, Optional<Long> start, Optional<Long> end) {
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
