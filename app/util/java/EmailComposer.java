package util.java;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.Query;
import com.typesafe.config.ConfigFactory;
import models.*;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Logger;
import play.Play;
import util.SitnetUtil;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.Map.Entry;

/**
 * Created by alahtinen on 21.5.2014.
 */
public class EmailComposer {

    /**
     * General template strings
     */
    private static final String tagOpen = "{{";
    private static final String tagClosed = "}}";
    private static final String baseSystemURL = ConfigFactory.load().getString("sitnet.baseSystemURL");
    private static final Charset ENCODING = Charset.defaultCharset();
    private static final String TEMPLATES_ROOT = Play.application().path().getAbsolutePath() + "/app/assets/template/email/";
    private static String hostname = SitnetUtil.getHostName();
    private static DateTimeFormatter dateTimeFormat = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm");
    private static DateTimeFormatter dateFormat = DateTimeFormat.forPattern("dd.MM.yyyy");
    private static DateTimeFormatter timeFormat = DateTimeFormat.forPattern("HH:mm");


    /**
     * This notification is sent to student, when teacher has reviewed the exam
     */

    public static void composeInspectionReady(User student, User reviewer, Exam exam) throws IOException {

        String templatePath = TEMPLATES_ROOT + "reviewReady/reviewReady.html";

        String subject = "Tenttivastauksesi on arvioitu";
        String teacher_name = reviewer.getFirstName() + " " + reviewer.getLastName() + " <" + reviewer.getEmail() + ">";
        String exam_info = exam.getName() + ", " + exam.getCourse().getCode();
        String review_link = hostname + "/#/feedback/exams/" + exam.getId();

        String template = readFile(templatePath, ENCODING);

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("teacher_name", teacher_name);
        stringValues.put("exam_info", exam_info);
        stringValues.put("review_link", review_link);
        stringValues.put("main_system_name", baseSystemURL);

        //Replace template strings
        template = replaceAll(template, tagOpen, tagClosed, stringValues);

        //Send notification
        EmailSender.send(student.getEmail(), reviewer.getEmail(), subject, template);
    }


    /**
     * This notification is sent when teacher assigns another as inspector for an exam
     *
     * @param inspector The new inspector for the exam.
     * @param assigner  The teacher who assigned the inspector.
     * @param exam      The exam to be inspected.
     */

    public static void composeChangeInspectorNotification(User inspector, User assigner, Exam exam,
                                                          String message) throws IOException {

        String templatePath = Play.application().path().getAbsolutePath() + "/assets/template/email/inspectorChanged/inspectorChanged.html";

        String subject = "Foobar"; //TODO!!
        String teacher_name = assigner.getFirstName() + " " + assigner.getLastName() + " <" + assigner.getEmail() + ">";
        String exam_info = exam.getName() + ", (" + exam.getCourse().getName() + ")";
        String linkToExam = hostname + "/#/home/\"";
        StringBuilder student_list = new StringBuilder();

        Map<String, String> stringValues = new HashMap<>();
        String template = readFile(templatePath, ENCODING);


        String oql = "find examInspection " +
                "fetch exam where (exam.name=:examId and exam.state=:estate) ";

        Query<ExamInspection> query = Ebean.createQuery(ExamInspection.class, oql);


        query.setParameter("examId", exam.getName());
        query.setParameter("estate", "REVIEW");

        List<ExamInspection> ers = query.findList();

        int notInspectedCount = ers.size();

        /*
            If there are uninspected answers and amount is 5 or less, generate a list of students
        */

        if (notInspectedCount > 0 && notInspectedCount < 6) {

            student_list.append("<ul>");

            for (ExamInspection usr : ers) {

                student_list.append("<li>")
                        .append(usr.getUser().getFirstName())
                        .append(" ")
                        .append(usr.getUser().getLastName())
                        .append("</li>");
            }
            student_list.append("</ul>");
        } else {
            student_list.append("-");
        }

        stringValues.put("teacher_name", teacher_name);
        stringValues.put("exam_info", exam_info);
        stringValues.put("uninspected_count", Integer.toString(notInspectedCount));
        stringValues.put("student_list", student_list.toString());
        stringValues.put("exam_link", linkToExam);
        stringValues.put("comment_from_assigner", message);

        //Replace template strings
        template = replaceAll(template, tagOpen, tagClosed, stringValues);

        //Send notification
        EmailSender.send(inspector.getEmail(), assigner.getEmail(), subject, template);
    }

    /**
     * This notification is sent to the creator of exam when assigned inspector has finished inspection
     *
     * @param inspector The responsible teacher for the exam.
     * @param sender    The teacher who inspected the exam.
     * @param exam      The exam.
     * @param msg       Message from inspector
     */
    public static void composeInspectionReadyNotification(User inspector, User sender, Exam exam, String msg) throws IOException {

        String templatePath = TEMPLATES_ROOT + "inspectionReady/inspectionReady.html";

        String subject = "Exam"; //TODO!!
        String teacher_name = sender.getFirstName() + " " + sender.getLastName() + " <" + sender.getEmail() + ">";
        String exam_info = exam.getName() + ", (" + exam.getCourse().getName() + ")";
        String linkToInspection = hostname + "/#/exams/review/" + exam.getName();

        Map<String, String> stringValues = new HashMap<>();

        String template = readFile(templatePath, ENCODING);

        stringValues.put("teacher_name", teacher_name);
        stringValues.put("exam_info", exam_info);
        stringValues.put("inspection_link", linkToInspection);
        stringValues.put("inspection_comment", msg);

        //Replace template strings
        template = replaceAll(template, tagOpen, tagClosed, stringValues);

        //Send notification
        EmailSender.send(inspector.getEmail(), sender.getEmail(), subject, template);

    }

    /**
     * This notification is sent to the creator of exam when assigned inspector has finished inspection
     *
     * @param inspector The responsible teacher for the exam.
     * @param sender    The teacher who inspected the exam.
     * @param exam      The exam.
     * @param msg       Message from inspector
     */
    public static void composeInspectionMessage(User inspector, User sender, Exam exam, String msg) throws IOException {

        String templatePath = TEMPLATES_ROOT + "inspectionReady/inspectionReady.html";

        String subject = "Exam"; //TODO!!
        String teacher_name = sender.getFirstName() + " " + sender.getLastName() + " <" + sender.getEmail() + ">";
        String exam_info = exam.getName() + ", (" + exam.getCourse().getName() + ")";
        String linkToInspection = hostname + "/#/exams/review/" + exam.getName();

        Map<String, String> stringValues = new HashMap<>();
        String template = readFile(templatePath, ENCODING);

        stringValues.put("teacher_name", teacher_name);
        stringValues.put("exam_info", exam_info);
        stringValues.put("inspection_link", linkToInspection);
        stringValues.put("inspection_comment", msg);

        //Replace template strings
        template = replaceAll(template, tagOpen, tagClosed, stringValues);

        //Send notification
        EmailSender.send(inspector.getEmail(), sender.getEmail(), subject, template);

    }

    /**
     * This notification is sent to teachers weekly
     *
     * @param teacher Teacher that this summary is made for
     */
    public static void composeWeeklySummary(User teacher) throws IOException {

//        $ /path/to/bin/<project-name> -Dconfig.resource=prod.conf

        Logger.info("Sending weekly report to: " + teacher.getEmail());

        String templatePath = TEMPLATES_ROOT + "weeklySummary/weeklySummary.html";
        String enrollmentTemplatePath = TEMPLATES_ROOT + "weeklySummary/enrollmentInfo.html";
        String inspectionTemplatePath = TEMPLATES_ROOT + "weeklySummary/inspectionInfoSimple.html";

        String subject = "EXAM viikkokooste";

        String template = readFile(templatePath, ENCODING);
        String enrollmentTemplate = readFile(enrollmentTemplatePath, ENCODING);
        String inspectionTemplate = readFile(inspectionTemplatePath, ENCODING);

        Date now = new Date();
        // get all active exams created by this teachers
        List<Exam> activeExams = Ebean.find(Exam.class)
                .select("id, creator.id")
                .where()
                .eq("state", "PUBLISHED")
                .gt("examActiveEndDate", now)
                .eq("creator.id", teacher.getId())
                .findList();

        StringBuilder enrollmentBlock = new StringBuilder();

        for (Exam exam : activeExams) {
            // TODO: oops theres a bug, this will list ALL exams, answered and unanswered
            // get all enrolments for this exam
            List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                    .fetch("exam")
                    .fetch("exam.course")
                    .select("exam.name, exam.course.code")
                    .where()
                    .eq("exam.id", exam.getId())
                    .eq("exam.state", "PUBLISHED")
                    .gt("exam.examActiveEndDate", now)
                    .orderBy("exam.id, id desc")
                    .findList();

            Map<String, String> stringValues = new HashMap<>();
            stringValues.put("exam_link", hostname + "/#/home/exams/" + exam.getId());
            stringValues.put("exam_name", exam.getName());
            stringValues.put("course_code", exam.getCourse().getCode());
            String subTemplate;
            if (enrolments.size() > 0) {
                // sort enrolments by date
                Collections.sort(enrolments, new Comparator<ExamEnrolment>() {
                    public int compare(ExamEnrolment o1, ExamEnrolment o2) {
                        return o1.getEnrolledOn().compareTo(o2.getEnrolledOn());
                    }
                });
                stringValues.put("enrollments", Integer.toString(enrolments.size()));
                // TODO: there should not be enrolments without machine reservations
                if (enrolments.get(0).getReservation() != null) {
                    DateTime date = new DateTime(enrolments.get(0).getReservation().getStartAt());
                    stringValues.put("first_exam_date", dateTimeFormat.print(date));
                    subTemplate = enrollmentTemplate;
                } else {
                    subTemplate = "<p><a href=\"{{exam_link}}\">{{exam_name}}</a>, {{course_code}}: {{enrollments}} " +
                            "kpl, HUOM! tenttiakvaariota ei varattu.</p>";
                }
            } else {
                subTemplate = "<p><a href=\"{{exam_link}}\">{{exam_name}}</a>, " +
                        "{{course_code}} - ei ilmoittautumisia</p>";
            }
            String row = replaceAll(subTemplate, tagOpen, tagClosed, stringValues);
            enrollmentBlock.append(row);
        }

        List<ExamInspection> ownInspections = Ebean.find(ExamInspection.class)
                .select("exam.id, user.id")
                .fetch("exam")
                .fetch("user")
                .fetch("assignedBy")
                .where()
                .eq("exam.grade", null)     // Owh, should check if exam graded, somehow better
                .eq("exam.creator.id", teacher.getId())
                .findList();

        List<ExamParticipation> ownExams = new ArrayList<>();

        for (ExamInspection insp : ownInspections) {
            List<ExamParticipation> temp = Ebean.find(ExamParticipation.class)
                    .select("id")
                    .fetch("exam")
                    .fetch("exam.parent")
                    .fetch("exam.course")
                    .where()
                    .eq("exam.parent.id", insp.getExam().getId())
                    .eq("exam.grade", null) // Owh, should check if exam graded, somehow better
                    .findList();

            ownExams.addAll(temp);
        }

        // motako tarkastus-pyyntö arvioimatonta tenttiä
        List<ExamInspection> inspections = Ebean.find(ExamInspection.class)
                .select("exam.id, user.id")
                .fetch("exam")
                .fetch("user")
                .fetch("assignedBy")
                .where()
                .eq("exam.parent", null)
                .ne("assignedBy", null)     // this is stupid, should check somehow better
                .eq("user.id", teacher.getId())
                .findList();

        List<ExamParticipation> reviewExams = new ArrayList<>();

        for (ExamInspection insp : inspections) {
            List<ExamParticipation> temp = Ebean.find(ExamParticipation.class)
                    .select("id")
                    .fetch("exam")
                    .fetch("exam.parent")
                    .fetch("exam.course")
                    .where()
                    .eq("exam.parent.id", insp.getExam().getId())
                    .eq("exam.grade", null) // Owh, should check if exam graded, somehow better
                    .findList();

            reviewExams.addAll(temp);
        }

        reviewExams.addAll(ownExams);

        int totalUngradedExams = reviewExams.size();

        // To ditch duplicate rows
        Set<String> inspectionRows = new LinkedHashSet<>();

        for (ExamParticipation review : reviewExams) {
            // Todo: should use this template  inspectionInfo.html
            // now uses inspectionInfoSimple.html

//            <p><a href="{{exam_link}}">{{student_name}}</a>, {{exam_name}} - {{course_code}}</p>

            Map<String, String> stringValues = new HashMap<>();
            stringValues.put("exam_link", hostname + "/#/exams/reviews/" + review.getExam().getId());
            stringValues.put("student_name", review.getUser().getFirstName() + " " + review.getUser().getLastName());
            stringValues.put("exam_name", review.getExam().getName());
            stringValues.put("course_code", review.getExam().getCourse().getCode());


            String row = replaceAll(inspectionTemplate, tagOpen, tagClosed, stringValues);
            inspectionRows.add(row);
        }

        StringBuilder rowBuilder = new StringBuilder();
        for (String row : inspectionRows) {
            rowBuilder.append(row);
        }

/*
        <p><h3>Ilmoittautumiset</h3></p>
        <p>Opiskelijoita on ilmoittautunut tentteihisi seuraavasti:</p>
                {{enrollment_info}}
                <p><h3>Arvioinnit</h3></p>
        <p>Sinulla on arvioimattomia vastauksia {{answer_count_total}} kpl näissä tenteissä:</p>
                {{inspection_info_own}}
                <p>{{inspection_info_assigner}}</p>
        <p>{{inspection_info_other}}</p>*/

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("enrollment_info", enrollmentBlock.toString());
        stringValues.put("answer_count_total", totalUngradedExams + "");
        stringValues.put("inspection_info_own", rowBuilder.toString());
//        stringValues.put("inspection_comment", msg);
        String content  = replaceAll(template, tagOpen, tagClosed, stringValues);
        EmailSender.send(teacher.getEmail(), "sitnet@arcusys.fi", subject, content);
    }

    /**
     * @param student     The student who reserved exam room.
     * @param reservation The reservation
     */
    public static void composeReservationNotification(User student, Reservation reservation, Exam exam) {

        String templatePath = TEMPLATES_ROOT + "reservationConfirmation/reservationConfirmed.html";
        String subject = "Tenttitilavaraus";

        String exam_info = exam.getName() + " " + exam.getCourse().getCode();
        String teacher_name = exam.getCreator().getFirstName() + " " + exam.getCreator().getLastName();

        String startDate = new SimpleDateFormat("dd.MM.yyyy").format(reservation.getStartAt());
        String endDate = new SimpleDateFormat("dd.MM.yyyy").format(reservation.getEndAt());

        String startTime = new SimpleDateFormat("HH:mm").format(reservation.getStartAt());
        String endTime = new SimpleDateFormat("HH:mm").format(reservation.getEndAt());

        // Tenttiaika: 02.10.2015 klo 16:00 - 02.10.2015 klo 18:00”

        String reservation_date = startDate + " klo " + startTime + " - " + endDate + " klo " + endTime;
        String exam_duration = String.format("%dh %dmin", exam.getDuration() / 60, exam.getDuration() % 60);
        String building_info = reservation.getMachine().getRoom().getBuildingName();
        String room_name = reservation.getMachine().getRoom().getName();
        String machine_name = reservation.getMachine().getName();
        String room_instructions = reservation.getMachine().getRoom().getRoomInstruction();


        Map<String, String> stringValues = new HashMap<>();

        String template = null;
        try {
            template = readFile(templatePath, ENCODING);
        } catch (IOException e) {
            e.printStackTrace();
        }

        stringValues.put("exam_info", exam_info);
        stringValues.put("teacher_name", teacher_name);
        stringValues.put("reservation_date", reservation_date);
        stringValues.put("exam_duration", "" + exam_duration);
        stringValues.put("building_info", "" + building_info);
        stringValues.put("room_name", "" + room_name);
        stringValues.put("machine_name", "" + machine_name);
        stringValues.put("room_instructions", room_instructions);
        stringValues.put("cancelation_link", hostname + "/#/home/\"");

        //Replace template strings
        template = replaceAll(template, tagOpen, tagClosed, stringValues);
        EmailSender.send(student.getEmail(), "noreply@exam.fi", subject, template);
    }

    /**
     * @param fromUser request sent by this user
     * @param toUser   request goes to this user
     * @param exam     exam to review
     * @param message  optional message from: fromUser
     */
    public static void composeExamReviewedRequest(User toUser, User fromUser, Exam exam, String message)
            throws IOException {

        String templatePath = TEMPLATES_ROOT + "inspectorChanged/inspectorChanged.html";
        String subject = "Exam-tentti on annettu arvioitavaksesi";

        String teacher_name = fromUser.getFirstName() + " " + fromUser.getLastName() + " <" + fromUser.getEmail() + ">";
        String exam_info = exam.getName() + ", " + exam.getCourse().getCode() + "";
        String linkToInspection = hostname + "/#/exams/reviews/" + exam.getId();

        Map<String, String> stringValues = new HashMap<>();

        String template = readFile(templatePath, ENCODING);

        List<Exam> exams = Ebean.find(Exam.class)
                .where()
                .eq("parent.id", exam.getId())
                .eq("state", "REVIEW")
                .findList();

        int uninspected_count = exams.size();

        if (uninspected_count > 0 && uninspected_count < 6) {
            String student_list = "<ul>";
            for (Exam ex : exams) {
                student_list += "<li>" + ex.getCreator().getFirstName() + " " + ex.getCreator().getLastName() + "</li>";
            }
            student_list += "</ul>";
            stringValues.put("student_list", student_list);
        } else {
            template = template.replace("<p>{{student_list}}</p>", "");
        }

        stringValues.put("teacher_name", teacher_name);
        stringValues.put("exam_info", exam_info);
        stringValues.put("exam_link", linkToInspection);
        stringValues.put("uninspected_count", "" + uninspected_count);
        stringValues.put("comment_from_assigner", message);

        //Replace template strings
        template = replaceAll(template, tagOpen, tagClosed, stringValues);
        EmailSender.send(toUser.getEmail(), fromUser.getEmail(), subject, template);
    }

    /**
     * @param student     The student who reserved exam room.
     * @param reservation The reservation
     * @param message     Cancelation message
     */
    public static void composeReservationCancelationNotification(User student, Reservation reservation, String message) {
        String subject = "Tekemäsi varaus EXAM-tenttiin on peruttu";
        String templatePath = TEMPLATES_ROOT + "reservationCanceled/reservationCanceled.html";

        /**
         * <p>Varauksesi EXAM-tenttiin {{reservation_date}} klo {{reservation_time}} tilassa {{room_name}} on jouduttu perumaan. Lisätietoja:
         * <p>{{cancelation_information}}</p>
         *
         */

        String date = dateFormat.print(reservation.getStartAt().getTime());
        String time = timeFormat.print(reservation.getStartAt().getTime());
        String room = reservation.getMachine().getRoom().getName();

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("reservation_date", date);
        stringValues.put("reservation_time", time);
        stringValues.put("room_name", room);
        stringValues.put("cancelation_information", (message == null || message.length() < 1 ? "" : "Lisätietoja:<br>" + message));

        String template = null;
        try {
            template = readFile(templatePath, ENCODING);
        } catch (IOException e) {
            e.printStackTrace();
        }

        template = replaceAll(template, tagOpen, tagClosed, stringValues);

        EmailSender.send(student.getEmail(), "noreply@exam.fi", subject, template);
    }


    /**
     * Replaces all occurrences of key, between beginTag and endTag in the original string
     * with the associated value in stringValues map
     *
     * @param original     The original template string
     * @param beginTag     Begin tag of the string to be replaced.
     * @param endTag       End tag of the string to be replaced.
     * @param stringValues Map of strings to replaced. Key = template tagId, Value = string to replace it with
     * @return String       String with tags replaced
     */
    private static String replaceAll(String original, String beginTag, String endTag, Map<String, String> stringValues) {

        for (Entry<String, String> entry : stringValues.entrySet()) {
            if (original.contains(entry.getKey())) {
                original = original.replace(beginTag + entry.getKey() + endTag, entry.getValue());
            }
        }
        return original;
    }

    /**
     * Reads file content
     *
     * @param path     The file path
     * @param encoding The ENCODING in use
     * @return String       The file contents
     */
    static String readFile(String path, Charset encoding)
            throws IOException {
        byte[] encoded = Files.readAllBytes(Paths.get(path));
        return new String(encoded, encoding);
    }
}

