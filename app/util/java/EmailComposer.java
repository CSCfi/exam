package util.java;

import com.avaje.ebean.Ebean;
import com.typesafe.config.ConfigFactory;
import models.*;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Logger;
import play.Play;
import play.i18n.Lang;
import play.i18n.Messages;
import util.SitnetUtil;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import java.util.Map.Entry;

public class EmailComposer {

    private static final String TAG_OPEN = "{{";
    private static final String TAG_CLOSE = "}}";
    private static final String BASE_SYSTEM_URL = ConfigFactory.load().getString("sitnet.baseSystemURL");
    private static final String SYSTEM_ACCOUNT = ConfigFactory.load().getString("sitnet.email.system.account");
    private static final Charset ENCODING = Charset.defaultCharset();
    private static final String TEMPLATES_ROOT = String.format("%s/conf/template/email/",
            Play.application().path().getAbsolutePath());
    private static final String HOSTNAME = SitnetUtil.getHostName();
    private static final DateTimeFormatter DTF = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm ZZZ");
    private static final DateTimeFormatter DF = DateTimeFormat.forPattern("dd.MM.yyyy");
    private static final DateTimeFormatter TF = DateTimeFormat.forPattern("HH:mm");
    private static final DateTimeZone TZ = SitnetUtil.getDefaultTimeZone();

    /**
     * This notification is sent to student, when teacher has reviewed the exam
     */
    public static void composeInspectionReady(User student, User reviewer, Exam exam) throws IOException {
        String templatePath = TEMPLATES_ROOT + "reviewReady.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(student);
        String subject = Messages.get(lang, "email.inspection.ready.subject");
        String examInfo = String.format("%s, %s", exam.getName(), exam.getCourse().getCode());
        String reviewLink = String.format("%s/#/feedback/exams/%s", HOSTNAME, exam.getId());

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("review_done", Messages.get(lang, "email.template.review.ready", examInfo));
        stringValues.put("review_link", reviewLink);
        stringValues.put("review_link_text", Messages.get(lang, "email.template.link.to.review"));
        stringValues.put("main_system_info", Messages.get(lang, "email.template.main.system.info"));
        stringValues.put("main_system_url", BASE_SYSTEM_URL);

        //Replace template strings
        template = replaceAll(template, stringValues);

        //Send notification
        EmailSender.send(student.getEmail(), reviewer.getEmail(), subject, template);
    }

    /**
     * This notification is sent to the creator of exam when assigned inspector has finished inspection
     */
    public static void composeInspectionMessage(User inspector, User sender, Exam exam, String msg) throws IOException {

        String templatePath = TEMPLATES_ROOT + "inspectionReady.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(inspector);

        String subject = Messages.get(lang, "email.inspection.new.subject");
        String teacherName = String.format("%s %s <%s>", sender.getFirstName(), sender.getLastName(), sender.getEmail());
        String examInfo = String.format("%s (%s)", exam.getName(), exam.getCourse().getName());
        String linkToInspection = String.format("%s/#exams/review/%s", HOSTNAME, exam.getName());

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("teacher_review_done", Messages.get(lang, "email.template.inspection.done", teacherName));
        stringValues.put("inspection_comment_title", Messages.get(lang, "email.template.inspection.comment"));
        stringValues.put("inspection_link_text", Messages.get(lang, "email.template.link.to.review"));
        stringValues.put("exam_info", examInfo);
        stringValues.put("inspection_link", linkToInspection);
        stringValues.put("inspection_comment", msg);

        //Replace template strings
        template = replaceAll(template, stringValues);

        //Send notification
        EmailSender.send(inspector.getEmail(), sender.getEmail(), subject, template);
    }

    public static void composeWeeklySummary(User teacher) throws IOException {

        Lang lang = getLang(teacher);
        String enrolmentBlock = createEnrolmentBlock(teacher, lang);
        List<ExamParticipation> reviews = getReviews(teacher);
        if (enrolmentBlock.isEmpty() && reviews.isEmpty()) {
            // Nothing useful to send
            return;
        }
        Logger.info("Sending weekly report to: " + teacher.getEmail());
        String templatePath = TEMPLATES_ROOT + "weeklySummary/weeklySummary.html";
        String inspectionTemplatePath = TEMPLATES_ROOT + "weeklySummary/inspectionInfoSimple.html";
        String template = readFile(templatePath, ENCODING);
        String inspectionTemplate = readFile(inspectionTemplatePath, ENCODING);
        String subject = Messages.get(lang, "email.weekly.report.subject");

        int totalUngradedExams = reviews.size();

        // To ditch duplicate rows
        Set<String> inspectionRows = new LinkedHashSet<>();

        for (ExamParticipation review : reviews) {
            Map<String, String> stringValues = new HashMap<>();
            stringValues.put("exam_link", String.format("%s/#/exams/reviews/%d", HOSTNAME, review.getExam().getId()));
            stringValues.put("student_name", String.format("%s %s",
                    review.getUser().getFirstName(), review.getUser().getLastName()));
            stringValues.put("exam_name", review.getExam().getName());
            stringValues.put("course_code", review.getExam().getCourse().getCode());
            String row = replaceAll(inspectionTemplate, stringValues);
            inspectionRows.add(row);
        }

        StringBuilder rowBuilder = new StringBuilder();
        for (String row : inspectionRows) {
            rowBuilder.append(row);
        }

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("enrolments_title", Messages.get(lang, "email.template.weekly.report.enrolments"));
        stringValues.put("enrolment_info_title", Messages.get(lang, "email.template.weekly.report.enrolments.info"));
        stringValues.put("enrolment_info", enrolmentBlock.isEmpty() ? "N/A" : enrolmentBlock);
        stringValues.put("inspections_title", Messages.get(lang, "email.template.weekly.report.inspections"));
        stringValues.put("inspections_info",
                Messages.get(lang, "email.template.weekly.report.inspections.info", totalUngradedExams));
        stringValues.put("inspection_info_own", rowBuilder.toString().isEmpty() ? "N/A" : rowBuilder.toString());

        String content = replaceAll(template, stringValues);
        EmailSender.send(teacher.getEmail(), SYSTEM_ACCOUNT, subject, content); // FIXME: sender email modifiable
    }

    public static void composeReservationNotification(User student, Reservation reservation, Exam exam)
            throws IOException {

        String templatePath = TEMPLATES_ROOT + "reservationConfirmed.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(student);
        String subject = Messages.get(lang, "email.machine.reservation.subject");

        String examInfo = String.format("%s (%s)", exam.getName(), exam.getCourse().getCode());
        String teacherName = "";

        if(exam.getExamOwners() != null && exam.getExamOwners().size() > 0) {
            StringBuilder sb = new StringBuilder();
            int i = 1;
            for(User teacher : exam.getExamOwners()) {
                sb.append(teacher.getFirstName()).append(" ").append(teacher.getLastName());
                if(i != exam.getExamOwners().size()) {
                    sb.append(", ");
                }
                i++;
            }
            teacherName = sb.toString();
        } else {
            teacherName = String.format("%s %s", exam.getCreator().getFirstName(), exam.getCreator().getLastName());
        }

        DateTime startDate = adjustDST(reservation.getStartAt(), TZ);
        DateTime endDate = adjustDST(reservation.getEndAt(), TZ);
        String reservationDate = DTF.print(startDate) + " - " + DTF.print(endDate);
        String examDuration = String.format("%dh %dmin", exam.getDuration() / 60, exam.getDuration() % 60);

        String machineName = "";
        String buildingInfo = "";
        String roomName = "";
        String roomInstructions = "";
        ExamMachine machine = reservation.getMachine();
        if (machine != null) {
            machineName = forceNotNull(machine.getName());
            ExamRoom room = machine.getRoom();
            if (room != null) {
                buildingInfo = forceNotNull(room.getBuildingName());
                roomInstructions = forceNotNull(getRoomInstruction(room, lang));
                roomName = forceNotNull(room.getName());
            }
        }

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("title", Messages.get(lang, "email.template.reservation.new"));
        stringValues.put("exam_info", Messages.get(lang, "email.template.reservation.exam", examInfo));
        stringValues.put("teacher_name", Messages.get(lang, "email.template.reservation.teacher", teacherName));
        stringValues.put("reservation_date", Messages.get(lang, "email.template.reservation.date", reservationDate));
        stringValues.put("exam_duration", Messages.get(lang, "email.template.reservation.exam.duration", examDuration));
        stringValues.put("building_info", Messages.get(lang, "email.template.reservation.building", buildingInfo));
        stringValues.put("room_name", Messages.get(lang, "email.template.reservation.room", roomName));
        stringValues.put("machine_name", Messages.get(lang, "email.template.reservation.machine", machineName));
        stringValues.put("room_instructions", roomInstructions);
        stringValues.put("cancellation_info", Messages.get(lang, "email.template.reservation.cancel.info"));
        stringValues.put("cancellation_link", String.format("%s/#/", HOSTNAME));
        stringValues.put("cancellation_link_text", Messages.get(lang, "email.template.reservation.cancel.link.text"));

        String content = replaceAll(template, stringValues);
        EmailSender.send(student.getEmail(), SYSTEM_ACCOUNT, subject, content);
    }

    public static void composeExamReviewedRequest(User toUser, User fromUser, Exam exam, String message)
            throws IOException {

        String templatePath = TEMPLATES_ROOT + "inspectorChanged.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(toUser);
        String subject = Messages.get(lang, "email.review.request.subject");
        String teacherName = String.format("%s %s <%s>", fromUser.getFirstName(), fromUser.getLastName(),
                fromUser.getEmail());
        String examInfo = String.format("%s (%s)", exam.getName(), exam.getCourse().getCode());
        String linkToInspection = String.format("%s/#/exams/reviews/%d", HOSTNAME, exam.getId());

        Map<String, String> values = new HashMap<>();

        List<Exam> exams = Ebean.find(Exam.class)
                .where()
                .eq("parent.id", exam.getId())
                .eq("state", "REVIEW")
                .findList();

        int uninspectedCount = exams.size();

        if (uninspectedCount > 0 && uninspectedCount < 6) {
            String studentList = "<ul>";
            for (Exam ex : exams) {
                studentList += "<li>" + ex.getCreator().getFirstName() + " " + ex.getCreator().getLastName() + "</li>";
            }
            studentList += "</ul>";
            values.put("student_list", studentList);
        } else {
            template = template.replace("<p>{{student_list}}</p>", "");
        }
        values.put("new_reviewer", Messages.get(lang, "email.template.inspector.new", teacherName));
        values.put("exam_info", examInfo);
        values.put("participation_count", Messages.get(lang, "email.template.participation", uninspectedCount));
        values.put("inspector_message", Messages.get(lang, "email.template.inspector.message"));
        values.put("exam_link", linkToInspection);
        values.put("exam_link_text", Messages.get(lang, "email.template.link.to.exam"));
        values.put("comment_from_assigner", message);

        //Replace template strings
        template = replaceAll(template, values);
        EmailSender.send(toUser.getEmail(), fromUser.getEmail(), subject, template);
    }

    public static void composeReservationCancellationNotification(User student, Reservation reservation, String message, Boolean isStudentUser, ExamEnrolment enrolment)
            throws IOException {

        String templatePath;
        if(isStudentUser) {
            templatePath = TEMPLATES_ROOT + "reservationCanceledByStudent.html";
        } else {
            templatePath = TEMPLATES_ROOT + "reservationCanceled.html";
        }

        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(student);
        String subject = Messages.get(lang, "email.reservation.cancellation.subject");

        String date = DF.print(adjustDST(reservation.getStartAt(), TZ));
        String time = TF.print(adjustDST(reservation.getStartAt(), TZ));
        String room = reservation.getMachine().getRoom().getName();
        String info = Messages.get(lang, "email.reservation.cancellation.info");

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("hello", Messages.get(lang, "email.template.hello"));
        if(isStudentUser) {
            String link = String.format("%s/#/enroll/%s", HOSTNAME, enrolment.getExam().getCourse().getCode());
            time = TF.print(adjustDST(reservation.getStartAt(), TZ)) + " " + TZ + " - " + TF.print(adjustDST(reservation.getEndAt(), TZ)) + " " + TZ;

            String teacher = "";
            if(enrolment.getExam().getExamOwners() != null) {
                StringBuilder sb = new StringBuilder();
                int i = 1;
                for(User owner : enrolment.getExam().getExamOwners()) {
                    sb.append(owner.getFirstName() + " " + owner.getLastName());
                    if(i != enrolment.getExam().getExamOwners().size()) {
                        sb.append(", ");
                    }
                    i++;
                }
                teacher = sb.toString();
            }
            stringValues.put("message", Messages.get(lang, "email.template.reservation.cancel.message.student"));
            stringValues.put("exam", Messages.get(lang, "email.template.reservation.exam", enrolment.getExam().getName() + " (" + enrolment.getExam().getCourse().getCode() + ")"));
            stringValues.put("teacher", Messages.get(lang, "email.template.reservation.teacher", teacher));
            stringValues.put("time", Messages.get(lang, "email.template.reservation.date", time));
            stringValues.put("place", Messages.get(lang, "email.template.reservation.room", room));
            stringValues.put("new_time", Messages.get(lang, "email.template.reservation.cancel.message.student.new.time"));
            stringValues.put("link", link);
        } else {
            stringValues.put("message", Messages.get(lang, "email.template.reservation.cancel.message", date, time, room));
        }
        stringValues.put("cancellation_information",
                message == null ? "" : String.format("%s:<br />%s", info, message));
        stringValues.put("regards", Messages.get(lang, "email.template.regards"));
        stringValues.put("admin", Messages.get(lang, "email.template.admin"));

        String content = replaceAll(template, stringValues);
        EmailSender.send(student.getEmail(), SYSTEM_ACCOUNT, subject, content);
    }

    private static List<ExamEnrolment> getEnrolments(Exam exam) {
        List<ExamEnrolment> enrolments = exam.getExamEnrolments();
        Collections.sort(enrolments);
        // Discard expired ones
        Iterator<ExamEnrolment> it = enrolments.listIterator();
        while (it.hasNext()) {
            ExamEnrolment enrolment = it.next();
            Reservation reservation = enrolment.getReservation();
            if (reservation == null || reservation.getEndAt().before(new Date())) {
                it.remove();
            }
        }
        return enrolments;
    }

    private static String createEnrolmentBlock(User teacher, Lang lang) throws IOException {
        String enrolmentTemplatePath = TEMPLATES_ROOT + "weeklySummary/enrollmentInfo.html";
        String enrolmentTemplate = readFile(enrolmentTemplatePath, ENCODING);
        StringBuilder enrolmentBlock = new StringBuilder();

        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("examEnrolments")
                .fetch("examEnrolments.reservation")
                .where()
                .eq("creator.id", teacher.getId())
                .eq("state", Exam.State.PUBLISHED.toString())
                .gt("examActiveEndDate", new Date())
                .findList();

        for (Exam exam : exams) {
            Map<String, String> stringValues = new HashMap<>();
            stringValues.put("exam_link", String.format("%s/#/exams/%d", HOSTNAME, exam.getId()));
            stringValues.put("exam_name", exam.getName());
            stringValues.put("course_code", exam.getCourse().getCode());
            List<ExamEnrolment> enrolments = getEnrolments(exam);
            String subTemplate;
            if (enrolments.isEmpty()) {
                String noEnrolments = Messages.get(lang, "email.enrolment.no.enrolments");
                subTemplate = String.format(
                        "<p><a href=\"{{exam_link}}\">{{exam_name}}</a>, {{course_code}} - %s</p>", noEnrolments);
            } else {
                DateTime date = adjustDST(enrolments.get(0).getReservation().getStartAt(), TZ);
                stringValues.put("enrolments",
                        Messages.get(lang, "email.template.enrolment.first", enrolments.size(), DTF.print(date)));
                subTemplate = enrolmentTemplate;
            }
            String row = replaceAll(subTemplate, stringValues);
            enrolmentBlock.append(row);
        }
        return enrolmentBlock.toString();
    }


    // return exams in review state where teacher is either creator or inspector
    private static List<ExamParticipation> getReviews(User teacher) {
        return Ebean.find(ExamParticipation.class)
                .fetch("exam.course")
                .where()
                .disjunction()
                .eq("exam.parent.creator.id", teacher.getId())
                .conjunction()
                .eq("exam.parent.examInspections.user.id", teacher.getId())
                .isNotNull("exam.parent.examInspections.assignedBy")
                .endJunction()
                .endJunction()
                .disjunction()
                .eq("exam.state", Exam.State.REVIEW.toString())
                .eq("exam.state", Exam.State.REVIEW_STARTED.toString())
                .endJunction()
                .findList();
    }


    private static String replaceAll(String original, Map<String, String> stringValues) {
        for (Entry<String, String> entry : stringValues.entrySet()) {
            if (original.contains(entry.getKey())) {
                String value = entry.getValue();
                original = original.replace(TAG_OPEN + entry.getKey() + TAG_CLOSE, value == null ? "" : value);
            }
        }
        return original;
    }

    static String readFile(String path, Charset encoding)
            throws IOException {
        byte[] encoded = Files.readAllBytes(Paths.get(path));
        return new String(encoded, encoding);
    }

    private static String forceNotNull(String src) {
        return src == null ? "" : src;
    }

    private static Lang getLang(User user) {
        UserLanguage language = user.getUserLanguage();
        return Lang.forCode(language.getUILanguageCode());
    }

    private static DateTime adjustDST(Date date, DateTimeZone dtz) {
        DateTime dateTime = new DateTime(date, dtz);
        if (!dtz.isStandardOffset(System.currentTimeMillis())) {
            dateTime = dateTime.minusHours(1);
        } else if (!dtz.isStandardOffset(date.getTime())) {
            dateTime = dateTime.minusHours(1);
        }
        return dateTime;
    }

    private static String getRoomInstruction(ExamRoom room, Lang lang) {
        String instructions;
        switch (lang.code()) {
            case "sv":
                instructions = room.getRoomInstructionSV();
                return instructions == null ? room.getRoomInstruction() : instructions;
            case "en":
                instructions = room.getRoomInstructionEN();
                return instructions == null ? room.getRoomInstruction() : instructions;
            case "fi":
            default:
                return room.getRoomInstruction();
        }
    }

}