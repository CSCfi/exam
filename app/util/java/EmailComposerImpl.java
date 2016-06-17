package util.java;

import biweekly.Biweekly;
import biweekly.ICalVersion;
import biweekly.ICalendar;
import biweekly.component.VEvent;
import biweekly.property.Summary;
import com.avaje.ebean.Ebean;
import com.typesafe.config.ConfigFactory;
import models.*;
import org.apache.commons.mail.EmailAttachment;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Environment;
import play.Logger;
import play.i18n.Lang;
import play.i18n.MessagesApi;
import util.AppUtil;

import javax.inject.Inject;
import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import java.util.Map.Entry;
import java.util.stream.Collectors;
import java.util.stream.Stream;

class EmailComposerImpl implements EmailComposer {

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
    private static final int MINUTES_IN_HOUR = 60;

    private EmailSender emailSender;
    private Environment env;
    private MessagesApi messaging;

    @Inject
    EmailComposerImpl(EmailSender sender, Environment environment, MessagesApi messagesApi) {
        emailSender = sender;
        env = environment;
        messaging = messagesApi;
    }

    private String getTemplatesRoot() {
        return String.format("%s/conf/template/email/", env.rootPath().getAbsolutePath());
    }

    /**
     * This notification is sent to student, when teacher has reviewed the exam
     */
    @Override
    public void composeInspectionReady(User student, User reviewer, Exam exam) {
        String templatePath = getTemplatesRoot() + "reviewReady.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(student);
        String subject = messaging.get(lang, "email.inspection.ready.subject");
        String examInfo = String.format("%s, %s", exam.getName(), exam.getCourse().getCode());
        String reviewLink = String.format("%s/feedback/exams/%s", HOSTNAME, exam.getId());

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("review_done", messaging.get(lang, "email.template.review.ready", examInfo));
        stringValues.put("review_link", reviewLink);
        stringValues.put("review_link_text", messaging.get(lang, "email.template.link.to.review"));
        stringValues.put("main_system_info", messaging.get(lang, "email.template.main.system.info"));
        stringValues.put("main_system_url", BASE_SYSTEM_URL);

        if (reviewer == null && exam.getAutoEvaluationConfig() != null) {
            // graded automatically
            stringValues.put("review_autoevaluated", messaging.get(lang, "email.template.review.autoevaluated"));
        } else {
            stringValues.put("review_autoevaluated", null);
        }

        //Replace template strings
        template = replaceAll(template, stringValues);

        //Send notification
        String senderEmail = reviewer != null ? reviewer.getEmail() : SYSTEM_ACCOUNT;
        emailSender.send(student.getEmail(), senderEmail, subject, template);
    }

    /**
     * This notification is sent to the creator of exam when assigned inspector has finished inspection
     */
    @Override
    public void composeInspectionMessage(User inspector, User sender, Exam exam, String msg) {

        String templatePath = getTemplatesRoot() + "inspectionReady.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(inspector);

        String subject = messaging.get(lang, "email.inspection.comment.subject");
        String teacherName = String.format("%s %s <%s>", sender.getFirstName(), sender.getLastName(), sender.getEmail());
        String examInfo = String.format("%s (%s)", exam.getName(), exam.getCourse().getName());
        String linkToInspection = String.format("%s/exams/review/%d", HOSTNAME, exam.getId());

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("teacher_review_done", messaging.get(lang, "email.template.inspection.done", teacherName));
        stringValues.put("inspection_comment_title", messaging.get(lang, "email.template.inspection.comment"));
        stringValues.put("inspection_link_text", messaging.get(lang, "email.template.link.to.review"));
        stringValues.put("exam_info", examInfo);
        stringValues.put("inspection_link", linkToInspection);
        stringValues.put("inspection_comment", msg);

        //Replace template strings
        template = replaceAll(template, stringValues);

        //Send notification
        emailSender.send(inspector.getEmail(), sender.getEmail(), subject, template);
    }

    private class ReviewStats implements Comparable<ReviewStats> {
        int amount;
        Date earliestDeadLine;


        @Override
        public int compareTo(ReviewStats o) {
            return earliestDeadLine.compareTo(o.earliestDeadLine);
        }
    }


    @Override
    public void composeWeeklySummary(User teacher) {

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
        String subject = messaging.get(lang, "email.weekly.report.subject");

        int totalUngradedExams = reviews.size();

        Map<Exam, ReviewStats> examReviewMap = new HashMap<>();
        for (ExamParticipation review : reviews) {
            Exam exam = review.getExam().getParent();
            ReviewStats stats = examReviewMap.get(exam);
            if (stats == null) {
                stats = new ReviewStats();
            }
            stats.amount++;
            if (stats.earliestDeadLine == null || review.getDeadline().before(stats.earliestDeadLine)) {
                stats.earliestDeadLine = review.getDeadline();
            }
            examReviewMap.put(exam, stats);
        }
        SortedSet<Map.Entry<Exam, ReviewStats>> sorted = sortByValue(examReviewMap);
        StringBuilder rowBuilder = new StringBuilder();
        sorted.stream().filter(e -> e.getValue().amount > 0).forEach(e -> {
            Map<String, String> stringValues = new HashMap<>();
            stringValues.put("exam_link", String.format("%s/exams/reviews/%d", HOSTNAME, e.getKey().getId()));
            stringValues.put("exam_name", e.getKey().getName());
            stringValues.put("course_code", e.getKey().getCourse().getCode());
            String summary = messaging.get(lang, "email.weekly.report.review.summary",
                    Integer.toString(e.getValue().amount),
                    DF.print(new DateTime(e.getValue().earliestDeadLine)));
            stringValues.put("review_summary", summary);
            String row = replaceAll(inspectionTemplate, stringValues);
            rowBuilder.append(row);
        });

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("enrolments_title", messaging.get(lang, "email.template.weekly.report.enrolments"));
        stringValues.put("enrolment_info_title", messaging.get(lang, "email.template.weekly.report.enrolments.info"));
        stringValues.put("enrolment_info", enrolmentBlock.isEmpty() ? "N/A" : enrolmentBlock);
        stringValues.put("inspections_title", messaging.get(lang, "email.template.weekly.report.inspections"));
        stringValues.put("inspections_info",
                messaging.get(lang, "email.template.weekly.report.inspections.info", totalUngradedExams));
        stringValues.put("inspection_info_own", rowBuilder.toString().isEmpty() ? "N/A" : rowBuilder.toString());

        String content = replaceAll(template, stringValues);
        emailSender.send(teacher.getEmail(), SYSTEM_ACCOUNT, subject, content);
    }

    @Override
    public void composeReservationNotification(User recipient, Reservation reservation, Exam exam) {
        String templatePath = getTemplatesRoot() + "reservationConfirmed.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(recipient);
        String subject = String.format("%s: \"%s\"", messaging.get(lang, "email.machine.reservation.subject"), exam.getName());

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
        String examDuration = String.format("%dh %dmin", exam.getDuration() / MINUTES_IN_HOUR,
                exam.getDuration() % MINUTES_IN_HOUR);

        ExamMachine machine = reservation.getMachine();
        String machineName = forceNotNull(machine.getName());
        ExamRoom room = machine.getRoom();
        String buildingInfo = forceNotNull(room.getBuildingName());
        String roomInstructions = forceNotNull(getRoomInstruction(room, lang));
        String roomName = forceNotNull(room.getName());

        String title = messaging.get(lang, "email.template.reservation.new");

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("title", title);
        stringValues.put("exam_info", messaging.get(lang, "email.template.reservation.exam", examInfo));
        stringValues.put("teacher_name", messaging.get(lang, "email.template.reservation.teacher", teacherName));
        stringValues.put("reservation_date", messaging.get(lang, "email.template.reservation.date", reservationDate));
        stringValues.put("exam_duration", messaging.get(lang, "email.template.reservation.exam.duration", examDuration));
        stringValues.put("building_info", messaging.get(lang, "email.template.reservation.building", buildingInfo));
        stringValues.put("room_name", messaging.get(lang, "email.template.reservation.room", roomName));
        stringValues.put("machine_name", messaging.get(lang, "email.template.reservation.machine", machineName));
        stringValues.put("room_instructions", roomInstructions);
        stringValues.put("cancellation_info", messaging.get(lang, "email.template.reservation.cancel.info"));
        stringValues.put("cancellation_link", HOSTNAME);
        stringValues.put("cancellation_link_text", messaging.get(lang, "email.template.reservation.cancel.link.text"));
        String content = replaceAll(template, stringValues);

        // Export as iCal format
        MailAddress address = room.getMailAddress();
        String addressString = address == null ? null :
                String.format("%s, %s  %s", address.getStreet(), address.getZip(), address.getCity());
        ICalendar iCal = createReservationEvent(lang, startDate, endDate, addressString, buildingInfo, roomName, machineName);
        File file;
        try {
            file = File.createTempFile(exam.getName().replace(" ", "-"), ".ics");
            Biweekly.write(iCal).go(file);
        } catch (IOException e) {
            Logger.error("Failed to create a temporary iCal file on disk!");
            throw new RuntimeException(e);
        }
        EmailAttachment attachment = new EmailAttachment();
        attachment.setPath(file.getAbsolutePath());
        attachment.setDisposition(EmailAttachment.ATTACHMENT);
        attachment.setName(messaging.get(lang, "ical.reservation.filename", ".ics"));

        //Attachment attachment = new Attachment(messaging.get(lang, "ical.reservation.filename", ".ics"), file);

        emailSender.send(recipient.getEmail(), SYSTEM_ACCOUNT, subject, content, attachment);
    }

    private ICalendar createReservationEvent(Lang lang, DateTime start, DateTime end, String address, String... placeInfo) {
        List<String> info = Stream.of(placeInfo)
                .filter(s -> s != null && !s.isEmpty())
                .collect(Collectors.toList());
        ICalendar iCal = new ICalendar();
        iCal.setVersion(ICalVersion.V2_0);
        VEvent event = new VEvent();
        Summary summary = event.setSummary(messaging.get(lang, "ical.reservation.summary"));
        summary.setLanguage(lang.code());
        event.setDateStart(start.toDate());
        event.setDateEnd(end.toDate());
        event.setLocation(address);
        event.setDescription(messaging.get(lang, "ical.reservation.room.info", String.join(", ", info)));
        iCal.addEvent(event);
        return iCal;
    }

    @Override
    public void composeExamReviewRequest(User toUser, User fromUser, Exam exam, String message) {

        String templatePath = getTemplatesRoot() + "reviewRequest.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(toUser);
        String subject = messaging.get(lang, "email.review.request.subject");
        String teacherName = String.format("%s %s <%s>", fromUser.getFirstName(), fromUser.getLastName(),
                fromUser.getEmail());
        String examInfo = String.format("%s (%s)", exam.getName(), exam.getCourse().getCode());
        String linkToInspection = String.format("%s/exams/reviews/%d", HOSTNAME, exam.getId());

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
        values.put("new_reviewer", messaging.get(lang, "email.template.inspector.new", teacherName));
        values.put("exam_info", examInfo);
        values.put("participation_count", messaging.get(lang, "email.template.participation", uninspectedCount));
        values.put("inspector_message", messaging.get(lang, "email.template.inspector.message"));
        values.put("exam_link", linkToInspection);
        values.put("exam_link_text", messaging.get(lang, "email.template.link.to.exam"));
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

    @Override
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
        String subject;
        if (isStudentUser) {
            subject = messaging.get(lang, "email.reservation.cancellation.subject");
        } else {
            subject = messaging.get(lang, "email.reservation.cancellation.subject.forced", enrolment.getExam().getName());
        }

        String date = DF.print(adjustDST(reservation.getStartAt(), TZ));
        String room = reservation.getMachine().getRoom().getName();
        String info = messaging.get(lang, "email.reservation.cancellation.info");

        Map<String, String> stringValues = new HashMap<>();
        if (isStudentUser) {
            String link = String.format("%s/enroll/%s", HOSTNAME, enrolment.getExam().getCourse().getCode());
            String time = String.format("%s - %s", DTF.print(adjustDST(reservation.getStartAt(), TZ)),
                    DTF.print(adjustDST(reservation.getEndAt(), TZ)));
            Exam source = enrolment.getExam().getParent() != null ? enrolment.getExam().getParent() : enrolment.getExam();
            stringValues.put("message", messaging.get(lang, "email.template.reservation.cancel.message.student"));
            stringValues.put("exam", messaging.get(lang, "email.template.reservation.exam",
                    enrolment.getExam().getName() + " (" + enrolment.getExam().getCourse().getCode() + ")"));
            stringValues.put("teacher", messaging.get(lang, "email.template.reservation.teacher", getTeachersAsText(source)));
            stringValues.put("time", messaging.get(lang, "email.template.reservation.date", time));
            stringValues.put("place", messaging.get(lang, "email.template.reservation.room", room));
            stringValues.put("new_time", messaging.get(lang, "email.template.reservation.cancel.message.student.new.time"));
            stringValues.put("link", link);
        } else {
            String time = TF.print(adjustDST(reservation.getStartAt(), TZ));
            stringValues.put("message", messaging.get(lang, "email.template.reservation.cancel.message", date, time, room));
        }
        stringValues.put("cancellation_information",
                message == null ? "" : String.format("%s:<br />%s", info, message));
        stringValues.put("regards", messaging.get(lang, "email.template.regards"));
        stringValues.put("admin", messaging.get(lang, "email.template.admin"));

        String content = replaceAll(template, stringValues);
        emailSender.send(student.getEmail(), SYSTEM_ACCOUNT, subject, content);
    }

    private static String getTeachers(Exam exam) {
        Set<User> teachers = new HashSet<>(exam.getExamOwners());
        teachers.addAll(exam.getExamInspections().stream().map(ExamInspection::getUser).collect(Collectors.toSet()));
        List<String> names = teachers.stream()
                .map((t) -> String.format("%s %s <%s>", t.getFirstName(), t.getLastName(), t.getEmail()))
                .collect(Collectors.toList());
        return String.join(", ", names);
    }

    @Override
    public void composePrivateExamParticipantNotification(User student, User fromUser, Exam exam) {
        String templatePath = getTemplatesRoot() + "participationNotification.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(student);
        String subject = messaging.get(lang, "email.template.participant.notification.subject",
                String.format("%s (%s)", exam.getName(), exam.getCourse().getCode()));
        String title = messaging.get(lang, "email.template.participant.notification.title");
        String examInfo = messaging.get(lang, "email.template.participant.notification.exam",
                String.format("%s (%s)", exam.getName(), exam.getCourse().getCode()));
        String teacherName = messaging.get(lang, "email.template.participant.notification.teacher", getTeachers(exam));
        String examPeriod = messaging.get(lang, "email.template.participant.notification.exam.period",
                String.format("%s - %s", DF.print(new DateTime(exam.getExamActiveStartDate())),
                        DF.print(new DateTime(exam.getExamActiveEndDate()))));
        String examDuration = messaging.get(lang, "email.template.participant.notification.exam.duration",
                exam.getDuration());
        String reservationInfo = messaging.get(lang, "email.template.participant.notification.please.reserve");
        String bookingLink = String.format("%s/calendar/%d", HOSTNAME, exam.getId());
        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("title", title);
        stringValues.put("exam_info", examInfo);
        stringValues.put("teacher_name", teacherName);
        stringValues.put("exam_period", examPeriod);
        stringValues.put("exam_duration", examDuration);
        stringValues.put("reservation_info", reservationInfo);
        stringValues.put("booking_link", bookingLink);
        String content = replaceAll(template, stringValues);
        emailSender.send(student.getEmail(), fromUser.getEmail(), subject, content);
    }

    @Override
    public void composePrivateExamEnded(User toUser, Exam exam) {
        Lang lang = getLang(toUser);
        User student = exam.getCreator();
        String templatePath, subject, message;
        Map<String, String> stringValues = new HashMap<>();
        if (exam.getState() == Exam.State.ABORTED) {
            templatePath = getTemplatesRoot() + "examAborted.html";
            subject = messaging.get(lang, "email.template.exam.aborted.subject");
            message = messaging.get(lang, "email.template.exam.aborted.message", String.format("%s %s <%s>",
                    student.getFirstName(), student.getLastName(), student.getEmail()),
                    String.format("%s (%s)", exam.getName(), exam.getCourse().getCode()));
        } else {
            templatePath = getTemplatesRoot() + "examEnded.html";
            subject = messaging.get(lang, "email.template.exam.returned.subject");
            message = messaging.get(lang, "email.template.exam.returned.message", String.format("%s %s <%s>",
                    student.getFirstName(), student.getLastName(), student.getEmail()),
                    String.format("%s (%s)", exam.getName(), exam.getCourse().getCode()));
            String reviewLinkUrl = String.format("%s/exams/review/%d", HOSTNAME, exam.getId());
            String reviewLinkText = messaging.get(lang, "email.template.exam.returned.link");
            stringValues.put("review_link", reviewLinkUrl);
            stringValues.put("review_link_text", reviewLinkText);
        }
        stringValues.put("message", message);
        String template = readFile(templatePath, ENCODING);
        String content = replaceAll(template, stringValues);
        emailSender.send(toUser.getEmail(), SYSTEM_ACCOUNT, subject, content);
    }

    @Override
    public void composeNoShowMessage(User toUser, User student, Exam exam) {
        String templatePath = getTemplatesRoot() + "noShow.html";
        String template = readFile(templatePath, ENCODING);
        Lang lang = getLang(toUser);
        String subject = messaging.get(lang, "email.template.noshow.subject");
        String message = messaging.get(lang, "email.template.noshow.message", String.format("%s %s <%s>",
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
        String subject = messaging.get(lang, "email.template.language.inspection.subject");
        String inspectorName = String.format("%s %s <%s>", inspector.getFirstName(), inspector.getLastName(),
                inspector.getEmail());
        String studentName = String.format("%s %s <%s>", exam.getCreator().getFirstName(),
                exam.getCreator().getLastName(), exam.getCreator().getEmail());
        String verdict = messaging.get(lang, inspection.getApproved()
                ? "email.template.language.inspection.approved" : "email.template.language.inspection.rejected");
        String examInfo = String.format("%s, %s", exam.getName(), exam.getCourse().getCode());

        String linkToInspection = String.format("%s/exams/review/%d", HOSTNAME, inspection.getExam().getId());

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("exam_info", messaging.get(lang, "email.template.reservation.exam", examInfo));
        stringValues.put("inspector_name", messaging.get(lang, "email.template.reservation.teacher", inspectorName));
        stringValues.put("student_name", messaging.get(lang, "email.template.language.inspection.student", studentName));
        stringValues.put("inspection_done", messaging.get(lang, "email.template.language.inspection.done"));
        stringValues.put("statement_title", messaging.get(lang, "email.template.language.inspection.statement.title"));
        stringValues.put("inspection_link_text", messaging.get(lang, "email.template.link.to.review"));
        stringValues.put("inspection_info", messaging.get(lang, "email.template.language.inspection.result", verdict));
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
            stringValues.put("exam_link", String.format("%s/exams/reviews/%d", HOSTNAME, exam.getId()));
            stringValues.put("exam_name", exam.getName());
            stringValues.put("course_code", exam.getCourse().getCode());
            List<ExamEnrolment> enrolments = getEnrolments(exam);
            String subTemplate;
            if (enrolments.isEmpty()) {
                String noEnrolments = messaging.get(lang, "email.enrolment.no.enrolments");
                subTemplate = String.format(
                        "<li><a href=\"{{exam_link}}\">{{exam_name}} - {{course_code}}</a>: %s</li>", noEnrolments);
            } else {
                DateTime date = adjustDST(enrolments.get(0).getReservation().getStartAt(), TZ);
                stringValues.put("enrolments",
                        messaging.get(lang, "email.template.enrolment.first", enrolments.size(), DTF.print(date)));
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

    private static <K,V extends Comparable<? super V>> SortedSet<Map.Entry<K,V>> sortByValue(Map<K,V> map) {
        SortedSet<Map.Entry<K,V>> set = new TreeSet<>(
                new Comparator<Map.Entry<K, V>>() {
                    @Override
                    public int compare(Map.Entry<K, V> e1, Map.Entry<K, V> e2) {
                        int res = e1.getValue().compareTo(e2.getValue());
                        return res != 0 ? res : 1;
                    }
                }
        );
        set.addAll(map.entrySet());
        return set;
    }


    private static String replaceAll(String original, Map<String, String> stringValues) {
        String result = original;
        for (Entry<String, String> entry : stringValues.entrySet()) {
            if (result.contains(entry.getKey())) {
                String value = entry.getValue();
                result = result.replace(TAG_OPEN + entry.getKey() + TAG_CLOSE, value == null ? "" : value);
            }
        }
        return result;
    }

    private static String readFile(String path, Charset encoding) {
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
