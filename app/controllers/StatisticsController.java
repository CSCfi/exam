package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamEnrolment;
import models.ExamParticipation;
import models.User;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import org.joda.time.format.ISODateTimeFormat;
import play.Logger;
import play.mvc.Result;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.IntStream;


public class StatisticsController extends BaseController {

    private static final DateTimeFormatter DTF = DateTimeFormat.forPattern("dd.MM.yyyy");


    @Restrict({@Group("ADMIN")})
    public Result getStudents() {
        List<User> students = Ebean.find(User.class)
                .select("id, firstName, lastName")
                .where()
                .eq("roles.name", "STUDENT")
                .findList();
        return ok(students);
    }

    @Restrict({@Group("ADMIN")})
    public Result getExamNames() {
        List<Exam> exams = Ebean.find(Exam.class)
                .select("id, name")
                .fetch("course", "id, name, code")
                .where()
                .isNotNull("name")
                .isNotNull("course")
                .isNull("parent") // only Exam prototypes
                .findList();
        return ok(exams);
    }

    private static Result examToExcel(Exam exam) throws IOException {
        Map<String, String> values = new LinkedHashMap<>();
        values.put("Creator ID", exam.getCreator().getId().toString());
        values.put("First name", exam.getCreator().getFirstName());
        values.put("Last name", exam.getCreator().getLastName());
        values.put("Exam type", exam.getExamType().getType());
        values.put("Course code", exam.getCourse().getCode());
        values.put("Course name", exam.getCourse().getName());
        values.put("Course credits", exam.getCourse().getCredits().toString());
        values.put("Course unit type", forceNotNull(exam.getCourse().getCourseUnitType()));
        values.put("Course level", forceNotNull(exam.getCourse().getLevel()));
        values.put("Created", ISODateTimeFormat.date().print(new DateTime(exam.getCreated())));
        values.put("Begins", ISODateTimeFormat.date().print(new DateTime(exam.getExamActiveStartDate())));
        values.put("Ends", ISODateTimeFormat.date().print(new DateTime(exam.getExamActiveEndDate())));
        values.put("Duration", exam.getDuration() == null ? "N/A" : exam.getDuration().toString());
        values.put("Grade scale", exam.getGradeScale() == null ? "N/A" : exam.getGradeScale().getDescription());
        values.put("State", exam.getState().toString());
        values.put("Attachment", exam.getAttachment() == null ? "" : exam.getAttachment().getFilePath() + exam.getAttachment().getFileName());
        values.put("Instructions", forceNotNull(exam.getInstruction()));
        values.put("Shared", Boolean.valueOf(exam.isShared()).toString());

        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet(exam.getName());

        Row headerRow = sheet.createRow(0);
        int i = 0;
        for (String key : values.keySet()) {
            headerRow.createCell(i++).setCellValue(key);
        }
        Row dataRow = sheet.createRow(1);
        i = 0;
        for (String value : values.values()) {
            dataRow.createCell(i++).setCellValue(value);
        }
        response().setHeader("Content-Disposition", "attachment; filename=\"exams.xlsx\"");
        return ok(encode(wb));
    }

    private static Result examToJson(Exam exam) {
        String content = Ebean.json().toJson(exam);
        response().setHeader("Content-Disposition", "attachment; filename=\"exams.json\"");
        return ok(Base64.getEncoder().encodeToString(content.getBytes()));
    }

    @Restrict({@Group("ADMIN")})
    public Result getExam(Long id, String reportType) throws IOException {

        Exam exam = Ebean.find(Exam.class)
                .where()
                .idEq(id)
                .isNotNull("course")
                .findUnique();
        if (exam == null) {
            return notFound();
        }

        switch (reportType) {
            case "xlsx":
                return examToExcel(exam);
            case "json":
                return examToJson(exam);
            default:
                return badRequest("invalid type: " + reportType);
        }
    }

    @Restrict({@Group("ADMIN")})
    public Result getTeacherExamsByDate(Long uid, String from, String to) throws IOException {
        final DateTime start = DateTime.parse(from, DTF);
        final DateTime end = DateTime.parse(to, DTF);
        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("creator")
                .fetch("examType")
                .fetch("course")
                .fetch("children")
                .where()
                .between("created", start, end)
                .isNull("parent")
                .isNotNull("course")
                .eq("creator.id", uid)
                .orderBy("created")
                .findList();

        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("teacher's exams");
        String[] headers = {"exam", "created", "state", "course code", "active during", "credits", "exam type", "in review",
                "graded", "logged"};
        addHeader(sheet, headers);
        for (Exam parent : exams) {
            int inReview = 0;
            int graded = 0;
            int logged = 0;
            for (Exam child : parent.getChildren()) {
                switch (child.getState()) {
                    case REVIEW:
                    case REVIEW_STARTED:
                        inReview++;
                        break;
                    case GRADED:
                        graded++;
                        break;
                    case GRADED_LOGGED:
                        logged++;
                        break;
                    default:
                        break;
                }
            }
            String[] data = new String[10];
            data[0] = parent.getName();
            data[1] = ISODateTimeFormat.date().print(new DateTime(parent.getCreated()));
            data[2] = parent.getState().toString();
            data[3] = parent.getCourse().getCode();
            data[4] = String.format("%s - %s", ISODateTimeFormat.date().print(new DateTime(parent.getExamActiveStartDate())),
                    ISODateTimeFormat.date().print(new DateTime(parent.getExamActiveEndDate())));
            data[5] = parent.getCourse().getCredits() == null ? "" : Double.toString(parent.getCourse().getCredits());
            data[6] = parent.getExamType().getType();
            data[7] = Integer.toString(inReview);
            data[8] = Integer.toString(graded);
            data[9] = Integer.toString(logged);
            Row dataRow = sheet.createRow(exams.indexOf(parent) + 1);
            for (int i = 0; i < data.length; ++i) {
                dataRow.createCell(i).setCellValue(data[i]);
            }
        }
        IntStream.range(0, 10).forEach(i -> sheet.autoSizeColumn(i, true));
        response().setHeader("Content-Disposition", "attachment; filename=\"teachers_exams.xlsx\"");
        return ok(encode(wb));
    }

    @Restrict({@Group("ADMIN")})
    public Result getExamEnrollments(Long id) throws IOException {
        Exam proto = Ebean.find(Exam.class).fetch("examEnrolments").fetch("examEnrolments.user")
                .fetch("examEnrolments.reservation").fetch("course")
                .where().eq("id", id).isNull("parent").findUnique();
        if (proto == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("enrolments");
        String[] headers = {"student name", "student ID", "student EPPN", "reservation time", "enrolment time"};
        addHeader(sheet, headers);
        for (ExamEnrolment e : proto.getExamEnrolments()) {
            String[] data = new String[5];
            data[0] = String.format("%s %s", e.getUser().getFirstName(), e.getUser().getLastName());
            data[1] = forceNotNull(e.getUser().getIdentifier());
            data[2] = e.getUser().getEppn();
            data[3] = e.getReservation() == null ? "" : ISODateTimeFormat.dateTimeNoMillis().print(
                    new DateTime(e.getReservation().getStartAt()));
            data[4] = ISODateTimeFormat.dateTimeNoMillis().print(new DateTime(e.getEnrolledOn()));
            Row dataRow = sheet.createRow(proto.getExamEnrolments().indexOf(e) + 1);
            for (int i = 0; i < data.length; ++i) {
                dataRow.createCell(i).setCellValue(data[i]);
            }
        }
        IntStream.range(0, 5).forEach(i -> sheet.autoSizeColumn(i, true));

        response().setHeader("Content-Disposition", "attachment; filename=\"enrolments.xlsx\"");
        return ok(encode(wb));
    }

    private String parse(Supplier<String> supplier) {
        try {
            return supplier.get();
        } catch (RuntimeException e) {
            Logger.warn("Invalid review data. Not able to provide it for report");
            return "N/A";
        }
    }

    @Restrict({@Group("ADMIN")})
    public Result getReviewsByDate(String from, String to) throws IOException {
        final DateTime start = DateTime.parse(from, DTF);
        final DateTime end = DateTime.parse(to, DTF);
        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("course")
                .where()
                .between("gradedTime", start, end)
                .disjunction()
                .eq("state", Exam.State.GRADED)
                .eq("state", Exam.State.GRADED_LOGGED)
                .endJunction()
                .orderBy("creator.id")
                .findList();

        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("graded exams");
        String[] headers = {"student", "exam", "course", "taken on", "graded on", "graded by",
                "credits", "grade", "exam type", "answer language"};

        addHeader(sheet, headers);
        for (Exam e : exams) {
            String[] data = new String[10];
            data[0] = String.format("%s %s", e.getCreator().getFirstName(), e.getCreator().getLastName());
            data[1] = e.getName();
            data[2] = e.getCourse().getCode();
            data[3] = ISODateTimeFormat.dateTimeNoMillis().print(new DateTime(e.getCreated()));
            data[4] = ISODateTimeFormat.dateTimeNoMillis().print(new DateTime(e.getGradedTime()));

            data[5] = parse(() -> String.format("%s %s", e.getGradedByUser().getFirstName(),
                    e.getGradedByUser().getLastName()));

            data[6] = e.getCourse().getCredits() == null ? "" :
                    Double.toString(e.getCourse().getCredits()); // custom credits?
            data[7] = parse(() -> e.getGrade().getName());
            data[8] = parse(() -> e.getCreditType().getType());

            data[9] = e.getAnswerLanguage();
            Row dataRow = sheet.createRow(exams.indexOf(e) + 1);
            for (int i = 0; i < data.length; ++i) {
                dataRow.createCell(i).setCellValue(data[i]);
            }
        }
        IntStream.range(0, 10).forEach(i -> sheet.autoSizeColumn(i, true));
        response().setHeader("Content-Disposition", "attachment; filename=\"reviews.xlsx\"");
        return ok(encode(wb));
    }

    @Restrict({@Group("ADMIN")})
    public Result getReservationsForRoomByDate(Long roomId, String from, String to) throws IOException {

        final DateTime start = DateTime.parse(from, DTF);
        final DateTime end = DateTime.parse(to, DTF);

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("user")
                .fetch("exam")
                .where()
                .gt("reservation.endAt", start)
                .lt("reservation.startAt", end)
                .eq("reservation.machine.room.id", roomId)
                .findList();

        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("reservations");
        String[] headers = {"enrolment id", "enrolled on", "user id", "user first name", "user last name", "exam id",
                "exam name", "reservation id", "reservation begins", "reservation ends", "machine id", "machine name",
                "machine IP", "room id", "room name", "room code"};

        addHeader(sheet, headers);

        for (ExamEnrolment e : enrolments) {
            List<String> data = Arrays.asList(
                    Long.toString(e.getId()),
                    ISODateTimeFormat.date().print(new DateTime(e.getEnrolledOn())),
                    Long.toString(e.getUser().getId()),
                    e.getUser().getFirstName(),
                    e.getUser().getLastName(),
                    Long.toString(e.getExam().getId()),
                    e.getExam().getName(),
                    Long.toString(e.getReservation().getId()),
                    ISODateTimeFormat.dateTime().print(new DateTime(e.getReservation().getStartAt())),
                    ISODateTimeFormat.dateTime().print(new DateTime(e.getReservation().getEndAt())),
                    Long.toString(e.getReservation().getMachine().getId()),
                    e.getReservation().getMachine().getName(),
                    e.getReservation().getMachine().getIpAddress(),
                    Long.toString(e.getReservation().getMachine().getRoom().getId()),
                    e.getReservation().getMachine().getRoom().getName(),
                    e.getReservation().getMachine().getRoom().getRoomCode()
            );
            Row dataRow = sheet.createRow(enrolments.indexOf(e) + 1);
            for (int i = 0; i < data.size(); ++i) {
                dataRow.createCell(i).setCellValue(data.get(i));
            }
        }
        IntStream.range(0, 17).forEach(i -> sheet.autoSizeColumn(i, true));
        response().setHeader("Content-Disposition", "attachment; filename=\"reservations.xlsx\"");
        return ok(encode(wb));
    }

    @Restrict({@Group("ADMIN")})
    public Result reportAllExams(String from, String to) throws IOException {

        final DateTime start = DateTime.parse(from, DTF);
        final DateTime end = DateTime.parse(to, DTF);

        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam")
                .where()
                .gt("started", start)
                .lt("ended", end)
                .disjunction()
                .eq("exam.state", Exam.State.GRADED)
                .eq("exam.state", Exam.State.GRADED_LOGGED)
                .eq("exam.state", Exam.State.ARCHIVED)
                .endJunction()
                .findList();

        Workbook wb = new XSSFWorkbook();
        generateParticipationSheet(wb, participations, true);
        response().setHeader("Content-Disposition", "attachment; filename=\"all_exams.xlsx\"");
        return ok(encode(wb));
    }

    @Restrict({@Group("ADMIN")})
    public Result reportStudentActivity(Long studentId, String from, String to) throws IOException {

        final DateTime start = DateTime.parse(from, DTF);
        final DateTime end = DateTime.parse(to, DTF);

        User student = Ebean.find(User.class, studentId);
        if (student == null) {
            return notFound("sitnet_error_not_found");
        }

        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam")
                .where()
                .gt("started", start)
                .lt("ended", end)
                .eq("user.id", studentId)
                .findList();

        Workbook wb = new XSSFWorkbook();
        Sheet studentSheet = wb.createSheet("student");
        String[] studentHeaders = {"id", "first name", "last name", "email", "language"};
        addHeader(studentSheet, studentHeaders);
        Row dataRow = studentSheet.createRow(1);
        int index = 0;
        dataRow.createCell(index++).setCellValue(student.getId());
        dataRow.createCell(index++).setCellValue(student.getFirstName());
        dataRow.createCell(index++).setCellValue(student.getLastName());
        dataRow.createCell(index++).setCellValue(student.getEmail());
        dataRow.createCell(index).setCellValue(student.getLanguage().getCode());
        generateParticipationSheet(wb, participations, false);
        response().setHeader("Content-Disposition", "attachment; filename=\"student_activity.xlsx\"");
        return ok(encode(wb));
    }

    private static void generateParticipationSheet(Workbook workbook, List<ExamParticipation> participations,
                                                   boolean includeStudentInfo) {

        Sheet sheet = workbook.createSheet("participations");
        List<String> headers = new ArrayList<>();
        if (includeStudentInfo) {
            headers.addAll(Arrays.asList("student id", "student first name", "student last name", "student email"));
        }
        headers.addAll(Arrays.asList("graded by teacher id", "graded by teacher first name", "graded by teacher last name",
                "graded by teacher email", "reservation id", "exam started", "exam ended", "actual duration", "room id",
                "room name", "room code", "machine id", "machine name", "machine IP", "course name", "course code",
                "exam id", "exam name", "exam duration", "exam state", "exam score", "exam grade scale", "exam grade",
                "graded on", "credit type"));

        addHeader(sheet, headers.toArray(new String[headers.size()]));

        for (ExamParticipation p : participations) {
            ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                    .fetch("reservation")
                    .fetch("reservation.machine")
                    .fetch("reservation.machine.room")
                    .where()
                    .eq("user.id", p.getUser().getId())
                    .eq("exam.id", p.getExam().getId())
                    .findUnique();
            if (enrolment == null) {
                continue;
            }
            List<String> data = new ArrayList<>();
            if (includeStudentInfo) {
                data.add(Long.toString(p.getUser().getId()));
                data.add(p.getUser().getFirstName());
                data.add(p.getUser().getLastName());
                data.add(p.getUser().getEmail());
            }
            data.add(p.getExam().getGradedByUser() == null ? "" : Long.toString(p.getExam().getGradedByUser().getId()));
            data.add(p.getExam().getGradedByUser() == null ? "" : p.getExam().getGradedByUser().getFirstName());
            data.add(p.getExam().getGradedByUser() == null ? "" : p.getExam().getGradedByUser().getLastName());
            data.add(p.getExam().getGradedByUser() == null ? "" : p.getExam().getGradedByUser().getEmail());
            data.add(Long.toString(enrolment.getReservation().getId()));
            data.add(ISODateTimeFormat.dateTime().print(new DateTime(p.getStarted())));
            data.add(ISODateTimeFormat.dateTime().print(new DateTime(p.getEnded())));
            data.add(ISODateTimeFormat.time().print(new DateTime(p.getDuration())));
            data.add(Long.toString(enrolment.getReservation().getMachine().getRoom().getId()));
            data.add(enrolment.getReservation().getMachine().getRoom().getName());
            data.add(enrolment.getReservation().getMachine().getRoom().getRoomCode());
            data.add(Long.toString(enrolment.getReservation().getMachine().getId()));
            data.add(enrolment.getReservation().getMachine().getName());
            data.add(enrolment.getReservation().getMachine().getIpAddress());
            data.add(p.getExam().getCourse().getName());
            data.add(p.getExam().getCourse().getCode());
            data.add(Long.toString(p.getExam().getId()));
            data.add(p.getExam().getName());
            data.add(Integer.toString(p.getExam().getDuration()));
            data.add(p.getExam().getState().toString());
            data.add(Double.toString(p.getExam().getTotalScore()));
            data.add(p.getExam().getGradeScale().getDescription());
            data.add(p.getExam().getGrade() == null ? "" : p.getExam().getGrade().getName());
            data.add(p.getExam().getGradedTime() == null ? "" :
                    ISODateTimeFormat.dateTime().print(new DateTime(p.getExam().getGradedTime())));
            data.add(p.getExam().getCreditType() == null ? "" : p.getExam().getCreditType().getType());
            Row dataRow = sheet.createRow(participations.indexOf(p) + 1);
            for (int i = 0; i < data.size(); ++i) {
                dataRow.createCell(i).setCellValue(data.get(i));
            }
        }
        IntStream.range(0, headers.size()).forEach(i -> sheet.autoSizeColumn(i, true));
    }

    private static String forceNotNull(String src) {
        return src == null ? "" : src;
    }

    // Base64-encode workbook
    private static String encode(Workbook wb) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        wb.write(bos);
        bos.close();
        return Base64.getEncoder().encodeToString(bos.toByteArray());
    }

    private static void addHeader(Sheet sheet, String[] headers) {
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);

        }
    }


}
