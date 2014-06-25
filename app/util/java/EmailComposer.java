package util.java;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.Query;
import models.Exam;
import models.ExamInspection;
import models.Reservation;
import models.User;
import play.Play;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

/**
 * Created by alahtinen on 21.5.2014.
 */
public class EmailComposer {

    /**
     * General template strings
     */
    private static String tagOpen = "{{";
    private static String tagClosed = "}}";

    private static String domain = "localhost:9000";
    private static Charset encoding = Charset.defaultCharset();


    /**
     *
     * This notification is sent when teacher assigns another as inspector for an exam
     *
     * @param inspector The new inspector for the exam.
     * @param assigner    The teacher who assigned the inspector.
     * @param exam      The exam to be inspected.
     */

    public static void composeChangeInspectorNotification(User inspector, User assigner, Exam exam, String message) {

        String templatePath = Play.application().path().getAbsolutePath() + "/assets/template/email/inspectorChanged/inspectorChanged.html";

        String subject = "Foobar"; //TODO!!
        String teacher_name = assigner.getFirstName() + " " + assigner.getLastName() + " <" + assigner.getEmail() + ">";
        String exam_info = exam.getName() + ", (" + exam.getCourse().getName() + ")";
        String linkToExam =  domain + "/#/home/\"";
        String student_list = new String ();
        String template = new String();

        Map<String, String> stringValues = new HashMap<String, String>();


        try {
            template = readFile(templatePath, encoding);
        }
        catch(IOException exception) {
            //TODO!!
        }


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

            student_list += "<ul>";

            for (ExamInspection usr : ers) {

                student_list += "<li>" + usr.getUser().getFirstName() + " " + usr.getUser().getLastName() + "</li>";

            }
            student_list += "</ul>";
        }

        else {
            student_list= "-";
        }

        stringValues.put("teacher_name", teacher_name);
        stringValues.put("exam_info", exam_info);
        stringValues.put("uninspected_count", Integer.toString(notInspectedCount));
        stringValues.put("student_list", student_list);
        stringValues.put("exam_link", linkToExam);
        stringValues.put("comment_from_assigner", message);

        //Replace template strings
        template = replaceAll(template, tagOpen, tagClosed, stringValues);

        //Send notification
        EmailSender.sendInspectorNotification(inspector.getEmail(), assigner.getEmail(), subject, template);
    }

    /**
     *
     * This notification is sent to the creator of exam when assigned inspector has finished inspection
     *
     * @param inspector The responsible teacher for the exam.
     * @param sender    The teacher who inspected the exam.
     * @param exam      The exam.
     * @param msg       Message from inspector
     */
    public static void composeInspectionReadyNotification(User inspector, User sender, Exam exam, String msg) {

        String templatePath = Play.application().path().getAbsolutePath() + "/app/assets/template/email/inspectionReady/inspectionReady.html";

        String subject = "Exam"; //TODO!!
        String teacher_name = sender.getFirstName() + " " + sender.getLastName() + " <" + sender.getEmail() + ">";
        String exam_info = exam.getName() + ", (" + exam.getCourse().getName() + ")";
        String linkToInspection =  domain + "/#/exams/review/" + exam.getName();
        String template = new String();

        Map<String, String> stringValues = new HashMap<String, String>();


        try {
            template = readFile(templatePath, encoding);
        }
        catch(IOException exception) {
            //TODO!!
        }


        stringValues.put("teacher_name", teacher_name);
        stringValues.put("exam_info", exam_info);
        stringValues.put("inspection_link", linkToInspection);
        stringValues.put("inspection_comment", msg);

        //Replace template strings
        template = replaceAll(template, tagOpen, tagClosed, stringValues);

        //Send notification
        EmailSender.sendInspectorNotification(inspector.getEmail(), sender.getEmail(), subject, template);

    }

    /**
     *
     * This notification is sent to teachers weekly
     *
     * @param teacher Teacher that this summary is made for
     * @param sender  Admin / main user
     *
     */
    public static void composeWeeklySummary(User teacher, User sender) {

        String templatePath = Play.application().path().getAbsolutePath() + "/assets/template/email/weeklySummary/weeklySummary.html";
        String enrollmentTemplatePath = Play.application().path().getAbsolutePath() + "/assets/template/email/weeklySummary/enrollmentInfo.html";
        String inspectionTemplatePath = Play.application().path().getAbsolutePath() + "/assets/template/email/weeklySummary/inspectionInfo.html";

        String subject = "Foobar"; //TODO!!
        String teacher_name = teacher.getFirstName() + " " + sender.getLastName() + " <" + teacher.getEmail() + ">";
        String admin_name = sender.getFirstName() + " " + sender.getLastName() + " <" + sender.getEmail() + ">";
        String template = new String();
        String enrollmentTemplate = new String();
        String inspectionTemplate = new String();

        List<User> listOfTeachersWhoAssignedInspections;
        Map<User, List<ExamInspection>> assignedInspectionsPerAssigner = new HashMap();

        Map<String, String> stringValues = new HashMap<String, String>();

        try {
            template = readFile(templatePath, encoding);
        }
        catch(IOException exception) {
            //TODO!!
        }

        try {
            enrollmentTemplate = readFile(enrollmentTemplatePath, encoding);
        }
        catch(IOException exception) {
            //TODO!!
        }

        try {
            inspectionTemplate = readFile(inspectionTemplatePath, encoding);
        }
        catch(IOException exception) {
            //TODO!!
        }

        EmailSender.sendInspectorNotification(teacher.getEmail(), sender.getEmail(), subject, template);
    }

    /**
     *
     * @param student           The student who reserved exam room.
     * @param sender            The teacher who inspected the exam.
     * @param reservation       The reservation
     *
     */
    public static void composeReservationNotification(User student, User sender, Reservation reservation) {
        String subject = "Foobar"; //TODO!!
        String content = new String();

        EmailSender.sendInspectorNotification(student.getEmail(), sender.getEmail(), subject, content);
    }

    /**
     *
     * @param student   Student who participated to exam
     * @param sender    Admin
     * @param exam      The exam that has been reviewed.
     *
     */
    public static void composeExamReviewedNotification(User student, User sender, Exam exam) {
        String subject = "Foobar"; //TODO!!
        String content = new String();

        EmailSender.sendInspectorNotification(student.getEmail(), sender.getEmail(), subject, content);
    }

    /**
     *
     * @param student           The student who reserved exam room.
     * @param sender            The teacher who inspected the exam.
     * @param reservation       The reservation
     * @param message           Cancelation message
     *
     */
    public static void composeReservationCancelationNotification(User student, User sender, Reservation reservation, String message) {
        String subject = "Foobar"; //TODO!!
        String content = new String();

        EmailSender.sendInspectorNotification(student.getEmail(), sender.getEmail(), subject, content);
    }


    /**
     *
     * Replaces all occurances of key, between beginTag and endTag in the original string
     * with the associated value in stringValues map
     *
     * @param original      The original template string
     * @param beginTag      Begin tag of the string to be replaced.
     * @param endTag        End tag of the string to be replaced.
     * @param stringValues  Map of strings to replaced. Key = template tagId, Value = string to replace it with
     * @return String       String with tags replaced
     *
     */
    private static String replaceAll(String original, String beginTag, String endTag, Map<String, String> stringValues) {

        for (Entry<String, String> entry : stringValues.entrySet()){
            if(original.contains( entry.getKey()))
            {
                original = original.replace(beginTag + entry.getKey() + endTag, entry.getValue());
            }

//                original.replaceAll("(&" + beginTag +"=)[^&]" + entry.getKey() + "(&"+ endTag + "=)", entry.getValue());
        }

        return original;
    }

    /**
     * Reads file content
     *
     * @param path          The file path
     * @param encoding      The encoding in use
     * @return String       The file contents
     *
     */
    static String readFile(String path, Charset encoding)
            throws IOException
    {
        byte[] encoded = Files.readAllBytes(Paths.get(path));
        return new String(encoded, encoding);
    }
}

