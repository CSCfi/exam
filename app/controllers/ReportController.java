package controllers;


import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.Course;
import models.Exam;
import models.ExamEnrolment;
import models.ExamRoom;
import org.joda.time.DateTime;
import play.libs.F;
import play.libs.Json;
import play.mvc.Result;

import java.util.*;
import java.util.stream.Collectors;

public class ReportController extends BaseController {

    @Restrict({@Group("ADMIN")})
    public Result listDepartments() {
        List<Course> courses = Ebean.find(Course.class).where().isNotNull("department").findList();
        Set<String> departments = courses.stream().map(Course::getDepartment).collect(Collectors.toSet());
        ObjectNode node = Json.newObject();
        ArrayNode arrayNode = node.putArray("departments");
        departments.forEach(arrayNode::add);
        return ok(Json.toJson(node));
    }

    private <T> ExpressionList<T> applyFilters(ExpressionList<T> query, String deptFieldPrefix, String dateField, F.Option<String> dept, F.Option<Long> start,
                                               F.Option<Long> end) {
        if (dept.isDefined()) {
            String[] depts = dept.get().split(",");
            query = query.in(String.format("%s.department", deptFieldPrefix), (Object[]) depts);
        }
        if (start.isDefined()) {
            DateTime startDate = new DateTime(start.get()).withTimeAtStartOfDay();
            query = query.ge(dateField, startDate.toDate());
        }
        if (end.isDefined()) {
            DateTime endDate = new DateTime(end.get()).plusDays(1).withTimeAtStartOfDay();
            query = query.lt(dateField, endDate.toDate());
        }
        return query;
    }

    @Restrict({@Group("ADMIN")})
    public Result getExamParticipations(F.Option<String> dept, F.Option<Long> start, F.Option<Long> end) {
        ExpressionList<ExamEnrolment> query = Ebean.find(ExamEnrolment.class)
                .where()
                .isNotNull("exam.parent")
                .isNotNull("reservation");
        query = applyFilters(query, "exam.course", "exam.created", dept, start, end);
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
    class ExamInfo {
        String name;
        Integer participations;
        Integer owners;

        public String getName() {
            return name;
        }

        public Integer getParticipations() {
            return participations;
        }

        public Integer getOwners() {
            return owners;
        }
    }

    @Restrict({@Group("ADMIN")})
    public Result getPublishedExams(F.Option<String> dept, F.Option<Long> start, F.Option<Long> end) {
        ExpressionList<Exam> query = Ebean.find(Exam.class)
                .fetch("course", "code")
                .where()
                .disjunction()
                .eq("state", Exam.State.PUBLISHED)
                .eq("state", Exam.State.ARCHIVED)
                .endJunction();
        query = applyFilters(query, "course", "created", dept, start, end);
        List<Exam> exams = query.findList();
        List<ExamInfo> infos = new ArrayList<>();
        for (Exam exam : exams) {
            ExamInfo info = new ExamInfo();
            info.name = String.format("%s-%s", exam.getCourse().getCode(), exam.getName());
            info.participations = exam.getChildren().size();
            info.owners = exam.getExamOwners().size();
            infos.add(info);
        }
        return ok(Json.toJson(infos));
    }

}
