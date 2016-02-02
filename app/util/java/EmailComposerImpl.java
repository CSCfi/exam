package util.java;

import biweekly.Biweekly;
import biweekly.ICalVersion;
import biweekly.ICalendar;
import biweekly.component.VEvent;
import biweekly.property.Summary;
import com.avaje.ebean.Ebean;
import com.google.inject.Inject;
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
import play.libs.mailer.Attachment;
import util.AppUtil;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import java.util.Map.Entry;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class EmailComposerImpl implements EmailComposer {

    private static final String TAG_OPEN = "{{";
    private static final String TAG_CLOSE = "}}";
    private static final String BASE_SYSTEM_URL = ConfigFactory.load().getString("sitnet.baseSystemURL");
    private static final String SYSTEM_ACCOUNT = ConfigFactory.load().getString("sitnet.email.system.account");
    private static final Charset ENCODING = Charset.defaultCharset();
    private static final String HOSTNAME = AppUtil.getHostName();
    private static final DateTimeFormatter DTF = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm ZZZ");
    private static final DateTimeFormatter DF = DateTimeFormat.forPattern("dd.MM.yyyy");
    private static final DateTimeFormatter TF = DateTimeFormat.forPattern("HH:mm");
    private static final DateTimeZone TZ = AppUtil.getDefaultTimeZone();

    protected EmailSender emailSender;

    @Inject
    public EmailComposerImpl(EmailSender sender) {
        emailSender = sender;
    }

    private String getTemplatesRoot() {
        return String.format("%s/conf/template/email/", Play.application().path().getAbsolutePath());
    }

    /**
     * This notification is sent to student, when teacher has reviewed the exam
     */
    public void composeInspectionReady(User student, User reviewer, Exam exam) {
        String templatePath = getTemplatesRoot() + "reviewReady.html";
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
        emailSender.send(student.getEmail(), reviewer.getEmail(), subject, template);
    }

    /**
     * This notification is sent to the creator of exam when assigned inspector has finished inspection
     */
    public void composeInspectionMessage(User inspector, User sender, Exam exam, String msg) {

        String templatePath = getTemplatesRoot() + "inspectionReady.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(inspector);

        String subject = Messages.get(lang, "email.inspection.comment.subject");
        String teacherName = String.format("%s %s <%s>", sender.getFirstName(), sender.getLastName(), sender.getEmail());
        String examInfo = String.format("%s (%s)", exam.getName(), exam.getCourse().getName());
        String linkToInspection = String.format("%s/#exams/review/%d", HOSTNAME, exam.getId());

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
        emailSender.send(inspector.getEmail(), sender.getEmail(), subject, template);
    }

    public void composeWeeklySummary(User teacher){

        Lang lang = getLang(teacher);
        String enrolmentBlock = createEnrolmentBlock(teacher, lang);
        List<ExamParticipation> reviews = getReviews(teacher);
        if (enrolmentBlock.isEmpty() && reviews.isEmpty()) {
            // Nothing useful to send
            return;
        }
        Logger.info("Sending weekly report to: " + teacher.getEmail());
        String templatePath = getTemplatesRoot() + "weeklySummary/weeklySummary.html";
        String inspectionTemplatePath = getTemplatesRoot() + "weeklySummary/inspectionInfoSimple.html";
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
        inspectionRows.stream().forEach(rowBuilder::append);

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("enrolments_title", Messages.get(lang, "email.template.weekly.report.enrolments"));
        stringValues.put("enrolment_info_title", Messages.get(lang, "email.template.weekly.report.enrolments.info"));
        stringValues.put("enrolment_info", enrolmentBlock.isEmpty() ? "N/A" : enrolmentBlock);
        stringValues.put("inspections_title", Messages.get(lang, "email.template.weekly.report.inspections"));
        stringValues.put("inspections_info",
                Messages.get(lang, "email.template.weekly.report.inspections.info", totalUngradedExams));
        stringValues.put("inspection_info_own", rowBuilder.toString().isEmpty() ? "N/A" : rowBuilder.toString());

        String content = replaceAll(template, stringValues);
        emailSender.send(teacher.getEmail(), SYSTEM_ACCOUNT, subject, content);
    }

    public void composeReservationNotification(User recipient, Reservation reservation, Exam exam, boolean isTeacher) {
        String templatePath = getTemplatesRoot() + "reservationConfirmed.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(recipient);
        String subject = Messages.get(lang, "email.machine.reservation.subject");

        String examInfo = String.format("%s (%s)", exam.getName(), exam.getCourse().getCode());
        String teacherName;

        if (!exam.getExamOwners().isEmpty()) {
            teacherName = getTeachers(exam);
        } else {
            teacherName = String.format("%s %s", exam.getCreator().getFirstName(), exam.getCreator().getLastName());
        }

        DateTime startDate = adjustDST(reservation.getStartAt(), TZ);
        DateTime endDate = adjustDST(reservation.getEndAt(), TZ);
        String reservationDate = DTF.print(startDate) + " - " + DTF.print(endDate);
        String examDuration = String.format("%dh %dmin", exam.getDuration() / 60, exam.getDuration() % 60);

        ExamMachine machine = reservation.getMachine();
        String machineName = forceNotNull(machine.getName());
        ExamRoom room = machine.getRoom();
        String buildingInfo = forceNotNull(room.getBuildingName());
        String roomInstructions = forceNotNull(getRoomInstruction(room, lang));
        String roomName = forceNotNull(room.getName());

        String title = isTeacher ? Messages.get(lang, "email.template.reservation.new.student",
                String.format("%s %s <%s>", reservation.getUser().getFirstName(),
                        reservation.getUser().getLastName(), reservation.getUser().getEmail())) :
                Messages.get(lang, "email.template.reservation.new");

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("title", title);
        stringValues.put("exam_info", Messages.get(lang, "email.template.reservation.exam", examInfo));
        stringValues.put("teacher_name", Messages.get(lang, "email.template.reservation.teacher", teacherName));
        stringValues.put("reservation_date", Messages.get(lang, "email.template.reservation.date", reservationDate));
        stringValues.put("exam_duration", Messages.get(lang, "email.template.reservation.exam.duration", examDuration));
        stringValues.put("building_info", Messages.get(lang, "email.template.reservation.building", buildingInfo));
        stringValues.put("room_name", Messages.get(lang, "email.template.reservation.room", roomName));
        stringValues.put("machine_name", Messages.get(lang, "email.template.reservation.machine", machineName));
        stringValues.put("room_instructions", isTeacher ? null : roomInstructions);
        stringValues.put("cancellation_info", isTeacher ? null : Messages.get(lang, "email.template.reservation.cancel.info"));
        stringValues.put("cancellation_link", isTeacher ? null : String.format("%s/#/", HOSTNAME));
        stringValues.put("cancellation_link_text", isTeacher ? null : Messages.get(lang, "email.template.reservation.cancel.link.text"));
        String content = replaceAll(template, stringValues);

        // Export as iCal format
        MailAddress address = room.getMailAddress();
        String addressString = address == null ? null :
                String.format("%s, %s  %s", address.getStreet(), address.getZip(), address.getCity());
        ICalendar iCal = createReservationEvent(lang, startDate, endDate, addressString, buildingInfo, roomName, machineName);
        File file;
        try {
            file = File.createTempFile("reservation", ".ics");
            Biweekly.write(iCal).go(file);
        } catch (IOException e) {
            Logger.error("Failed to create a temporary iCal file on disk!");
            throw new RuntimeException(e);
        }
        Attachment attachment = new Attachment(Messages.get(lang, "ical.reservation.filename", ".ics"), file);
        emailSender.send(recipient.getEmail(), SYSTEM_ACCOUNT, subject, content, attachment);
    }

    private ICalendar createReservationEvent(Lang lang, DateTime start, DateTime end, String address, String... placeInfo) {
        List<String> info = Stream.of(placeInfo)
                .filter(s -> s != null && !s.isEmpty())
                .collect(Collectors.toList());
        ICalendar iCal = new ICalendar();
        iCal.setVersion(ICalVersion.V2_0);
        VEvent event = new VEvent();
        Summary summary = event.setSummary(Messages.get(lang, "ical.reservation.summary"));
        summary.setLanguage(lang.code());
        event.setDateStart(start.toDate());
        event.setDateEnd(end.toDate());
        event.setLocation(address);
        event.setDescription(Messages.get(lang, "ical.reservation.room.info", String.join(", ", info)));
        iCal.addEvent(event);
        return iCal;
    }

    public void composeExamReviewRequest(User toUser, User fromUser, Exam exam, String message) {

        String templatePath = getTemplatesRoot() + "reviewRequest.html";
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
                .eq("state", Exam.State.REVIEW)
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
        emailSender.send(toUser.getEmail(), fromUser.getEmail(), subject, template);
    }

    private String getTeachersAsText(Exam exam) {
        List<String> owners = exam.getExamOwners().stream()
                .map(eo -> String.format("%s %s", eo.getFirstName(), eo.getLastName()))
                .collect(Collectors.toList());
        return String.join(", ", owners);
    }

    public void composeReservationCancellationNotification(User student, Reservation reservation, String message,
                                                           Boolean isStudentUser, ExamEnrolment enrolment) {

        String templatePath;
        if (isStudentUser) {
            templatePath = getTemplatesRoot() + "reservationCanceledByStudent.html";
        } else {
            templatePath = getTemplatesRoot() + "reservationCanceled.html";
        }

        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(student);
        String subject = Messages.get(lang, "email.reservation.cancellation.subject");

        String date = DF.print(adjustDST(reservation.getStartAt(), TZ));
        String room = reservation.getMachine().getRoom().getName();
        String info = Messages.get(lang, "email.reservation.cancellation.info");

        Map<String, String> stringValues = new HashMap<>();
        if (isStudentUser) {
            String link = String.format("%s/#/enroll/%s", HOSTNAME, enrolment.getExam().getCourse().getCode());
            String time = String.format("%s - %s", DTF.print(adjustDST(reservation.getStartAt(), TZ)),
                    DTF.print(adjustDST(reservation.getEndAt(), TZ)));
            Exam source = enrolment.getExam().getParent() != null ? enrolment.getExam().getParent() : enrolment.getExam();
            stringValues.put("message", Messages.get(lang, "email.template.reservation.cancel.message.student"));
            stringValues.put("exam", Messages.get(lang, "email.template.reservation.exam",
                    enrolment.getExam().getName() + " (" + enrolment.getExam().getCourse().getCode() + ")"));
            stringValues.put("teacher", Messages.get(lang, "email.template.reservation.teacher", getTeachersAsText(source)));
            stringValues.put("time", Messages.get(lang, "email.template.reservation.date", time));
            stringValues.put("place", Messages.get(lang, "email.template.reservation.room", room));
            stringValues.put("new_time", Messages.get(lang, "email.template.reservation.cancel.message.student.new.time"));
            stringValues.put("link", link);
        } else {
            String time = TF.print(adjustDST(reservation.getStartAt(), TZ));
            stringValues.put("message", Messages.get(lang, "email.template.reservation.cancel.message", date, time, room));
        }
        stringValues.put("cancellation_information",
                message == null ? "" : String.format("%s:<br />%s", info, message));
        stringValues.put("regards", Messages.get(lang, "email.template.regards"));
        stringValues.put("admin", Messages.get(lang, "email.template.admin"));

        String content = replaceAll(template, stringValues);
        emailSender.send(student.getEmail(), SYSTEM_ACCOUNT, subject, content);
    }

    private static String getTeachers(Exam exam) {
        Set<User> teachers = new HashSet<>(exam.getExamOwners());
        teachers.addAll(exam.getExamInspections().stream().map(ExamInspection::getUser).collect(Collectors.toSet()));
        return String.join(", ", teachers.stream().map((t) -> String.format("%s %s <%s>",
                t.getFirstName(), t.getLastName(), t.getEmail())).collect(Collectors.<String>toList()));
    }

    @Override
    public void composePrivateExamParticipantNotification(User student, User fromUser, Exam exam) {
        String templatePath = getTemplatesRoot() + "participationNotification.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(student);
        String subject = Messages.get(lang, "email.template.participant.notification.subject",
                String.format("%s (%s)", exam.getName(), exam.getCourse().getCode()));
        String title = Messages.get(lang, "email.template.participant.notification.title");
        String examInfo = Messages.get(lang, "email.template.participant.notification.exam",
                String.format("%s (%s)", exam.getName(), exam.getCourse().getCode()));
        String teacherName = Messages.get(lang, "email.template.participant.notification.teacher", getTeachers(exam));
        String examPeriod = Messages.get(lang, "email.template.participant.notification.exam.period",
                String.format("%s - %s", DF.print(new DateTime(exam.getExamActiveStartDate())),
                        DF.print(new DateTime(exam.getExamActiveEndDate()))));
        String examDuration = Messages.get(lang, "email.template.participant.notification.exam.duration",
                exam.getDuration());
        String reservationInfo = Messages.get(lang, "email.template.participant.notification.please.reserve");
        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("title", title);
        stringValues.put("exam_info", examInfo);
        stringValues.put("teacher_name", teacherName);
        stringValues.put("exam_period", examPeriod);
        stringValues.put("exam_duration", examDuration);
        stringValues.put("reservation_info", reservationInfo);
        stringValues.put("main_system_url", BASE_SYSTEM_URL);
        String content = replaceAll(template, stringValues);
        emailSender.send(student.getEmail(), fromUser.getEmail(), subject, content);
    }

    @Override
    public void composePrivateExamEnded(User toUser, Exam exam) {
        String templatePath = getTemplatesRoot() + "examEnded.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(toUser);
        User student = exam.getCreator();
        String subject, message;
        if (exam.getState() == Exam.State.ABORTED) {
            subject = Messages.get(lang, "email.template.exam.aborted.subject");
            message = Messages.get(lang, "email.template.exam.aborted.message", String.format("%s %s <%s>",
                    student.getFirstName(), student.getLastName(), student.getEmail()),
                    String.format("%s (%s)", exam.getName(), exam.getCourse().getCode()));
        } else {
            subject = Messages.get(lang, "email.template.exam.returned.subject");
            message = Messages.get(lang, "email.template.exam.returned.message", String.format("%s %s <%s>",
                    student.getFirstName(), student.getLastName(), student.getEmail()),
                    String.format("%s (%s)", exam.getName(), exam.getCourse().getCode()));
        }
        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("message", message);
        String content = replaceAll(template, stringValues);
        emailSender.send(toUser.getEmail(), SYSTEM_ACCOUNT, subject, content);
    }

    @Override
    public void composeNoShowMessage(User toUser, User student, Exam exam)  {
        String templatePath = getTemplatesRoot() + "noShow.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(toUser);
        String subject = Messages.get(lang, "email.template.noshow.subject");
        String message = Messages.get(lang, "email.template.noshow.message", String.format("%s %s <%s>",
                student.getFirstName(), student.getLastName(), student.getEmail()),
                String.format("%s (%s)", exam.getName(), exam.getCourse().getCode()));
        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("message", message);
        String content = replaceAll(template, stringValues);
        emailSender.send(toUser.getEmail(), SYSTEM_ACCOUNT, subject, content);
    }

    @Override
    public void composeLanguageInspectionFinishedMessage(User toUser, User inspector, LanguageInspection inspection) {
        String templatePath = getTemplatesRoot() + "languageInspectionReady.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(inspector);

        Exam exam = inspection.getExam();
        String subject = Messages.get(lang, "email.template.language.inspection.subject");
        String inspectorName = String.format("%s %s <%s>", inspector.getFirstName(), inspector.getLastName(),
                inspector.getEmail());
        String studentName = String.format("%s %s <%s>", exam.getCreator().getFirstName(),
                exam.getCreator().getLastName(), exam.getCreator().getEmail());
        String verdict = Messages.get(lang, inspection.getApproved()
                ? "email.template.language.inspection.approved" : "email.template.language.inspection.rejected");
        String examInfo = String.format("%s, %s", exam.getName(), exam.getCourse().getCode());

        String linkToInspection = String.format("%s/#exams/review/%d", HOSTNAME, inspection.getExam().getId());

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("exam_info", Messages.get(lang, "email.template.reservation.exam", examInfo));
        stringValues.put("inspector_name", Messages.get(lang, "email.template.reservation.teacher", inspectorName));
        stringValues.put("student_name", Messages.get(lang, "email.template.language.inspection.student", studentName));
        stringValues.put("inspection_done", Messages.get(lang, "email.template.language.inspection.done"));
        stringValues.put("statement_title", Messages.get(lang, "email.template.language.inspection.statement.title"));
        stringValues.put("inspection_link_text", Messages.get(lang, "email.template.link.to.review"));
        stringValues.put("inspection_info", Messages.get(lang, "email.template.language.inspection.result", verdict));
        stringValues.put("inspection_link", linkToInspection);
        stringValues.put("inspection_statement", inspection.getStatement().getComment());
        //Replace template strings
        template = replaceAll(template, stringValues);

        //Send notification
        emailSender.send(toUser.getEmail(), inspector.getEmail(), subject, template);
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

    private String createEnrolmentBlock(User teacher, Lang lang) {
        String enrolmentTemplatePath = getTemplatesRoot() + "weeklySummary/enrollmentInfo.html";
        String enrolmentTemplate = readFile(enrolmentTemplatePath, ENCODING);
        StringBuilder enrolmentBlock = new StringBuilder();

        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("examEnrolments")
                .fetch("examEnrolments.reservation")
                .where()
                .disjunction()
                .eq("examOwners", teacher)
                .eq("examInspections.user", teacher)
                .endJunction()
                .isNotNull("course")
                .eq("state", Exam.State.PUBLISHED)
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


    // return exams in review state where teacher is either owner or inspector
    private static List<ExamParticipation> getReviews(User teacher) {
        return Ebean.find(ExamParticipation.class)
                .fetch("exam.course")
                .where()
                .disjunction()
                .eq("exam.parent.examOwners", teacher)
                .eq("exam.examInspections.user", teacher)
                .endJunction()
                .disjunction()
                .eq("exam.state", Exam.State.REVIEW)
                .eq("exam.state", Exam.State.REVIEW_STARTED)
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

    static String readFile(String path, Charset encoding) {
        byte[] encoded;
        try {
            encoded = Files.readAllBytes(Paths.get(path));
        } catch (IOException e) {
            Logger.error("Failed to read email template from disk!");
            throw new RuntimeException(e);
        }
        return new String(encoded, encoding);
    }

    private static String forceNotNull(String src) {
        return src == null ? "" : src;
    }

    private static Lang getLang(User user) {
        return Lang.forCode(user.getLanguage().getCode());
    }

    private static DateTime adjustDST(Date date, DateTimeZone dtz) {
        DateTime dateTime = new DateTime(date, dtz);
        if (!dtz.isStandardOffset(date.getTime())) {
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
