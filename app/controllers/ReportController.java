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

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.ExpressionList;
import io.ebean.text.PathProperties;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import javax.inject.Inject;
import models.Course;
import models.Exam;
import models.ExamEnrolment;
import models.ExamRoom;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.ExamRecordSanitizer;
import util.excel.ExcelBuilder;

public class ReportController extends BaseController {

    private static final String XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private final ExcelBuilder excelBuilder;

    @Inject
    public ReportController(ExcelBuilder excelBuilder) {
        this.excelBuilder = excelBuilder;
    }

    @Restrict({ @Group("ADMIN") })
    public Result listDepartments() {
        List<Course> courses = DB.find(Course.class).where().isNotNull("department").findList();
        Set<String> departments = courses.stream().map(Course::getDepartment).collect(Collectors.toSet());
        ObjectNode node = Json.newObject();
        ArrayNode arrayNode = node.putArray("departments");
        departments.forEach(arrayNode::add);
        return ok(Json.toJson(node));
    }

    private <T> ExpressionList<T> applyFilters(
        ExpressionList<T> query,
        String deptFieldPrefix,
        String dateField,
        String dept,
        String start,
        String end
    ) {
        ExpressionList<T> result = query;
        if (dept != null) {
            List<String> depts = Arrays.asList(dept.split(","));
            result = result.in(String.format("%s.department", deptFieldPrefix), depts);
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

    @Restrict({ @Group("ADMIN") })
    public Result getExamParticipations(Optional<String> dept, Optional<String> start, Optional<String> end) {
        PathProperties pp = PathProperties.parse(
            "noShow, exam(created, course(department)), " +
            "externalExam(started), reservation(machine(room(id, name, outOfService)))"
        );
        ExpressionList<ExamEnrolment> el = DB.find(ExamEnrolment.class).where();
        el.apply(pp);
        List<ExamEnrolment> enrolments = el
            .or()
            .ne("exam.state", Exam.State.PUBLISHED)
            .isNotNull("externalExam.started")
            .endOr()
            .isNotNull("reservation.machine")
            .ne("noShow", true)
            .findList()
            .stream()
            .filter(ee -> applyEnrolmentFilter(ee, dept, start, end))
            .toList();
        Map<String, List<Participation>> roomMap = new HashMap<>();
        for (ExamEnrolment enrolment : enrolments) {
            ExamRoom room = enrolment.getReservation().getMachine().getRoom();
            String key = String.format("%d___%s", room.getId(), room.getName());
            if (!roomMap.containsKey(key)) {
                roomMap.put(key, new ArrayList<>());
            }
            DateTime examStart = enrolment.getExternalExam() != null
                ? enrolment.getExternalExam().getStarted()
                : enrolment.getExam().getCreated();
            roomMap.get(key).add(new Participation(examStart));
        }
        // Fill in the rooms that have no associated participations
        List<ExamRoom> rooms = DB.find(ExamRoom.class).where().eq("outOfService", false).findList();
        for (ExamRoom room : rooms) {
            String key = String.format("%d___%s", room.getId(), room.getName());
            if (!roomMap.containsKey(key)) {
                // empty list indicates no participations
                roomMap.put(key, new ArrayList<>());
            }
        }
        return ok(Json.toJson(roomMap));
    }

    // DTO for minimizing output from this API
    private static class Participation {

        String date;

        Participation(DateTime date) {
            this.date = ISODateTimeFormat.dateTime().print(date);
        }

        public String getDate() {
            return date;
        }
    }

    private static class ExamInfo {

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
        boolean result = e.getState().ordinal() > Exam.State.PUBLISHED.ordinal() && e.getExamParticipation() != null;
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

    private boolean applyEnrolmentFilter(
        ExamEnrolment ee,
        Optional<String> dept,
        Optional<String> start,
        Optional<String> end
    ) {
        DateTime created = ee.getExam() != null ? ee.getExam().getCreated() : ee.getExternalExam().getStarted();
        boolean result = true;
        if (dept.isPresent()) {
            if (ee.getExternalExam() != null) {
                return false;
            }
            List<String> depts = Arrays.asList(dept.get().split(","));
            Course course = ee.getExam().getCourse();
            result = course != null && depts.contains(course.getDepartment());
        }
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

    @Restrict({ @Group("ADMIN") })
    public Result getPublishedExams(Optional<String> dept, Optional<String> start, Optional<String> end) {
        ExpressionList<Exam> query = DB
            .find(Exam.class)
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
            info.participations = (int) exam.getChildren().stream().filter(e -> applyExamFilter(e, start, end)).count();
            infos.add(info);
        }
        return ok(Json.toJson(infos));
    }

    @Restrict({ @Group("ADMIN") })
    public Result getReservations(Optional<String> dept, Optional<String> start, Optional<String> end) {
        ExpressionList<ExamEnrolment> query = DB.find(ExamEnrolment.class).where();
        query =
            applyFilters(
                query,
                "enrolment.exam.course",
                "startAt",
                dept.orElse(null),
                start.orElse(null),
                end.orElse(null)
            );
        Set<ExamEnrolment> enrolments = query.findSet();
        long noShows = enrolments.stream().filter(ExamEnrolment::isNoShow).count();
        long appearances = enrolments.size() - noShows;
        return ok(Json.newObject().put("noShows", noShows).put("appearances", appearances));
    }

    @Restrict({ @Group("ADMIN") })
    public Result getResponses(Optional<String> dept, Optional<String> start, Optional<String> end) {
        ExpressionList<Exam> query = DB.find(Exam.class).where().isNotNull("parent").isNotNull("course");
        query = applyFilters(query, "course", "created", dept.orElse(null), start.orElse(null), end.orElse(null));
        Set<Exam> exams = query.findSet();
        long aborted = exams.stream().filter(e -> e.getState() == Exam.State.ABORTED).count();
        long assessed = exams
            .stream()
            .filter(e ->
                e.hasState(
                    Exam.State.GRADED,
                    Exam.State.GRADED_LOGGED,
                    Exam.State.ARCHIVED,
                    Exam.State.REJECTED,
                    Exam.State.DELETED
                )
            )
            .count();
        long unAssessed = exams
            .stream()
            .filter(e ->
                e.hasState(
                    Exam.State.INITIALIZED,
                    Exam.State.STUDENT_STARTED,
                    Exam.State.REVIEW,
                    Exam.State.REVIEW_STARTED
                )
            )
            .count();
        JsonNode node = Json
            .newObject()
            .put("aborted", aborted)
            .put("assessed", assessed)
            .put("unAssessed", unAssessed);
        return ok(node);
    }

    @With(ExamRecordSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result exportExamQuestionScoresAsExcel(Long examId, Http.Request request) {
        Collection<Long> childIds = request.attrs().get(Attrs.ID_COLLECTION);
        ByteArrayOutputStream bos;
        try {
            bos = excelBuilder.buildScoreExcel(examId, childIds);
        } catch (IOException | RuntimeException e) {
            return internalServerError("i18n_error_creating_csv_file");
        }
        return ok(Base64.getEncoder().encodeToString(bos.toByteArray()))
            .withHeader("Content-Disposition", "attachment; filename=\"exam_records.xlsx\"")
            .as(XLSX_MIME);
    }
}
