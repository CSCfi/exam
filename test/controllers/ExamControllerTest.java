package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import base.RunAsTeacher;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.typesafe.config.ConfigFactory;
import com.typesafe.plugin.MailerAPI;
import com.typesafe.plugin.MailerPlugin;
import models.*;
import org.joda.time.DateTime;
import org.junit.Test;
import play.Logger;
import play.libs.F;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;
import util.java.EmailSender;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.*;

public class ExamControllerTest extends IntegrationTestCase {

    private static final String baseSystemURL = ConfigFactory.load().getString("sitnet.baseSystemURL");
    private static final Charset ENCODING = Charset.defaultCharset();
    private static final String TEMPLATES_ROOT = fakeApplication().getWrappedApplication().path().getAbsolutePath() + "/app/assets/template/email/";
    private static String hostname = SitnetUtil.getHostName();
    private static final String tagOpen = "{{";
    private static final String tagClosed = "}}";

    @Test
    @RunAsStudent
    public void testGetActiveExamsUnauthorized() {
        Result result = get("/activeexams");
        assertThat(status(result)).isEqualTo(403);
        assertThat(contentAsString(result)).isEqualToIgnoringCase("authentication failure");
    }

    @Test
    @RunAsTeacher
    public void testGetActiveExams() {
        // Setup
        List<Exam> activeExams = Ebean.find(Exam.class).where()
                .eq("creator.id", userId).eq("state", Exam.State.PUBLISHED.toString()).findList();
        Set<Long> ids = new HashSet<>();
        for (Exam e : activeExams) {
            e.setExamActiveStartDate(new Date());
            e.setExamActiveEndDate(DateTime.now().plusWeeks(1).toDate());
            e.update();
            ids.add(e.getId());
        }
        String[] expectedPaths = {"id", "name", "course.code", "examActiveStartDate", "examActiveEndDate"};

        // Execute
        Result result = get("/activeexams");

        // Verify
        assertThat(status(result)).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        ArrayNode exams = (ArrayNode) node;
        assertThat(exams.size()).isEqualTo(ids.size());
        assertPathsExist(node, jsonPaths(expectedPaths, exams.size()));
        for (JsonNode n : exams) {
            Exam e = deserialize(Exam.class, n);
            assertThat(e.getExamActiveEndDate().after(new Date()));
            assertThat(e.getExamActiveStartDate().before(new Date()));
            assertThat(ids.contains(e.getId()));
        }
    }

    @Test
    @RunAsStudent
    public void testCreateDraftExamUnauthorized() {
        // Execute
        Result result = get("/draft");
        assertThat(status(result)).isEqualTo(403);
        assertThat(contentAsString(result)).isEqualToIgnoringCase("authentication failure");
    }

    @Test
    @RunAsTeacher
    public void testCreateDraftExam() {
        // Setup
        int originalRowCount = Ebean.find(Exam.class).findRowCount();

        // Execute
        Result result = get("/draft");

        // Verify
        assertThat(status(result)).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        Long id = node.get("id").asLong();
        assertPathsExist(node, "id");
        Exam draft = Ebean.find(Exam.class, id);
        assertThat(draft).isNotNull();
        assertThat(draft.getName()).isEqualTo("Kirjoita tentin nimi tähän");
        assertThat(draft.getCreator().getId()).isEqualTo(userId);
        assertThat(draft.getCreated()).isNotNull();
        assertThat(draft.getState()).isEqualTo(Exam.State.DRAFT.toString());
        assertThat(draft.getExamSections().size()).isEqualTo(1);
        assertThat(draft.getExamSections().get(0).getName()).isEqualTo("Aihealue");
        assertThat(draft.getExamSections().get(0).getExpanded()).isTrue();
        assertThat(draft.getExamLanguages().size()).isEqualTo(1);
        assertThat(draft.getExamLanguages().get(0).getCode()).isEqualTo("fi");
        assertThat(draft.getExamType().getId()).isEqualTo(2);
        assertThat(draft.getExpanded()).isTrue();
        ExamInspection draftInspection = Ebean.find(ExamInspection.class).where().eq("exam.id", id).findUnique();
        assertThat(draftInspection.getUser().getId()).isEqualTo(userId);
        int rowCount = Ebean.find(Exam.class).findRowCount();
        assertThat(rowCount).isEqualTo(originalRowCount + 1);
    }

    @Test
    @RunAsTeacher
    public void testCreateDraftExamAndEmailToStudent() {

        Exam draft = createDraftWithCourseAndUser();

        // email
        String templatePath = TEMPLATES_ROOT + "reviewReady/reviewReady.html";
        String template = null;
        try {
            template = readFile(templatePath, ENCODING);
        } catch (IOException e) {

        }
        assertThat(template).isNotNull();

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("teacher_name", draft.getGradedByUser().getFirstName() + " " + draft.getGradedByUser().getLastName() + " <" + draft.getGradedByUser().getEmail() + ">");
        stringValues.put("exam_info", draft.getName() + ", " + draft.getCourse().getCode());
        stringValues.put("review_link", hostname + "/#/feedback/exams/" + draft.getId());
        stringValues.put("main_system_name", baseSystemURL);

        //Replace template strings
        template = replaceAll(template, tagOpen, tagClosed, stringValues);

        //Send notification
        // async send mail
        final String subject = "Tenttivastauksesi on arvioitu";
        final String studentEmail = "";
        final String senderEmail = "";
        final String html = template;

        F.Promise<Integer> promiseOfInt = F.Promise.promise(new F.Function0<Integer>() {
            public Integer apply() {
                MailerAPI mail = fakeApplication().getWrappedApplication().plugin(MailerPlugin.class).get().email();

                mail.setSubject(subject);
                mail.setRecipient(studentEmail);
                mail.setFrom("Exam <sitnet@arcusys.fi>");
                mail.setReplyTo(senderEmail);
                mail.sendHtml(html);

                return 0;
            }
        });
        if(promiseOfInt.wrapped().isCompleted()) {
            assertThat(promiseOfInt.wrapped().value()).isEqualTo(0);
        }
    }

    @Test
    @RunAsTeacher
    public void testInspectionChangeTest() {

        Logger.info(" *** testInspectionChangeTest ***");
        int originalRowCount, rowCount;

        Exam draft = createDraftWithCourseAndUser();

        ExamInspection inspection = new ExamInspection();
        inspection.setAssignedBy(draft.getGradedByUser());

        originalRowCount = Ebean.find(Comment.class).findRowCount();
        Comment comment = new Comment();
        comment.setComment("test");
        comment.setCreator(draft.getGradedByUser());
        comment.setCreated(new Date());
        comment.save();
        rowCount = Ebean.find(Comment.class).findRowCount();
        assertThat(rowCount).isEqualTo(originalRowCount + 1);

        assertThat(comment).isNotNull();

        inspection.setComment(comment);
        inspection.setExam(draft);
        inspection.setReady(true);
        inspection.setAssignedBy(draft.getGradedByUser());
        inspection.setUser(draft.getGradedByUser());
        inspection.save();

        Logger.info("inspection id: " + inspection.getId());
        Logger.info("inspection has comment: " + (inspection.getComment() != null));

        assertThat(inspection).isNotNull();
        assertThat(inspection.getComment()).isNotNull();

        inspection.setReady(false);
        inspection.update();

        assertThat(inspection.isReady()).isFalse();

        Logger.info("inspection comment id:" + (inspection.getComment() != null ? inspection.getComment().getId() : -1));
        assertThat(inspection.getComment()).isNotNull();

        List<ExamInspection> inspections = Ebean.find(ExamInspection.class)
                .fetch("user")
                .fetch("exam")
                .fetch("exam.course")
                .where()
                .eq("exam.id", draft.getId())
                .findList();

        assertThat(inspections).isNotNull();
        assertThat(inspections).isNotEmpty();

        for (ExamInspection ei : inspections) {

            assertThat(ei.getExam()).isNotNull();
            assertThat(ei.getUser()).isNotNull();
            assertThat(ei.getExam().getCourse()).isNotNull();

            String templatePath = TEMPLATES_ROOT + "inspectionReady/inspectionReady.html";

            final String subject = "Test Exam";
            final String teacher_name = ei.getUser().getFirstName() + " " + ei.getUser().getLastName() + " <" + ei.getUser().getEmail() + ">";
            final String exam_info = ei.getExam().getName() + ", (" + ei.getExam().getCourse().getName() + ")";
            final String linkToInspection = hostname + "/#/exams/review/" + ei.getExam().getName();

            Map<String, String> stringValues = new HashMap<>();
            String template = null;
            try {
                template = readFile(templatePath, ENCODING);
            } catch (IOException e) {

            }
            assertThat(template).isNotNull();

            stringValues.put("teacher_name", teacher_name);
            stringValues.put("exam_info", exam_info);
            stringValues.put("inspection_link", linkToInspection);

            //Replace template strings
            template = replaceAll(template, tagOpen, tagClosed, stringValues);

            //Send notification
            // async send mail
            final String studentEmail = "";
            final String senderEmail = "";
            final String html = template;

            F.Promise<Integer> promiseOfInt = F.Promise.promise(new F.Function0<Integer>() {
                public Integer apply() {
                    MailerAPI mail = fakeApplication().getWrappedApplication().plugin(MailerPlugin.class).get().email();

                    mail.setSubject(subject);
                    mail.setRecipient(studentEmail);
                    mail.setFrom("Exam <sitnet@arcusys.fi>");
                    mail.setReplyTo(senderEmail);
                    mail.sendHtml(html);

                    return 0;
                }
            });
            if(promiseOfInt.wrapped().isCompleted()) {
                assertThat(promiseOfInt.wrapped().value()).isEqualTo(0);
            }

        }
    }

    @Test
    @RunAsTeacher
    public void testGetExam() throws Exception {
        // Setup
        long id = 1L;
        Exam expected = Ebean.find(Exam.class, id);
        // Execute
        Result result = get("/exams/" + id);

        // Verify that some paths exist in JSON, this is a significant set of information so really hard to test it's
        // all there :p
        assertThat(status(result)).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertPathsExist(node, getExamFields());
        assertPathCounts(node, 3, getExamSectionFieldsOfExam("*"));
        assertPathCounts(node, 2, getSectionQuestionFieldsOfSection("0", "*"));
        assertPathCounts(node, 3, getSectionQuestionFieldsOfSection("1", "*"));
        assertPathCounts(node, 3, getSectionQuestionFieldsOfSection("2", "*"));
        assertPathCounts(node, 2, "softwares[*].id", "softwares[*].name");
        assertPathCounts(node, 4, "examLanguages[*].code");

        // Verify some of the field values are as expected
        Exam returned = deserialize(Exam.class, node);
        assertThat(expected.getId()).isEqualTo(returned.getId());
        assertThat(expected.getName()).isEqualTo(returned.getName());
        assertThat(expected.getAnswerLanguage()).isEqualTo(returned.getAnswerLanguage());
        assertThat(expected.getCourse().getId()).isEqualTo(returned.getCourse().getId());
        assertThat(expected.getCreditType()).isEqualTo(returned.getCreditType());
        assertThat(expected.getCustomCredit()).isEqualTo(returned.getCustomCredit());
        assertThat(expected.getDuration()).isEqualTo(returned.getDuration());
        assertThat(expected.getEnrollInstruction()).isEqualTo(returned.getEnrollInstruction());
        assertThat(expected.getExamActiveEndDate()).isEqualTo(returned.getExamActiveEndDate());
        assertThat(expected.getExamActiveStartDate()).isEqualTo(returned.getExamActiveStartDate());
    }

    @Test
    @RunAsTeacher
    public void testGetStudentExamNotAllowed() {
        // Setup
        long id = 1L;
        Exam expected = Ebean.find(Exam.class, id);
        expected.setState(Exam.State.STUDENT_STARTED.toString());
        expected.update();

        // Execute
        Result result = get("/exams/" + id);
        assertThat(status(result)).isEqualTo(404);
    }

    private static void composeInspectionReady(User student, User reviewer, Exam exam) throws IOException {

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

        if(stringValues != null && original != null && !original.isEmpty()) {
            for (Map.Entry<String, String> entry : stringValues.entrySet()) {
                if (entry != null && entry.getKey() != null && original.indexOf(entry.getKey()) > -1) {
                    original = original.replace(beginTag + entry.getKey() + endTag, entry.getValue() != null && !entry.getValue().isEmpty() ? entry.getValue() : "");
                }
            }
        }
        return original;
    }

    private Exam createDraftWithCourseAndUser() {
        // Setup
        int originalRowCount = Ebean.find(Exam.class).findRowCount();

        Result result = get("/draft");
        assertThat(status(result)).isEqualTo(200);

        int rowCount = Ebean.find(Exam.class).findRowCount();
        assertThat(rowCount).isEqualTo(originalRowCount + 1);

        JsonNode node = Json.parse(contentAsString(result));
        Long id = node.get("id").asLong();
        assertPathsExist(node, "id");

        Exam draft = Ebean.find(Exam.class, id);
        assertThat(draft).isNotNull().toString();
        assertThat(draft.getState()).isEqualTo(Exam.State.DRAFT.toString());

        // set values
        draft.setState(Exam.State.GRADED_LOGGED.toString());
        draft.setCreditType("Final");
        draft.setGrade("3");
        draft.setGrading("0-5");

        final String courseCode = "0123456789";
        originalRowCount = Ebean.find(Course.class).findRowCount();

        Course course = new Course();
        course.setName("* * * test * * *");
        course.setCode(courseCode);
        course.setCredits(5d);
        course.save();

        rowCount = Ebean.find(Course.class).findRowCount();
        assertThat(rowCount).isEqualTo(originalRowCount + 1).toString();

        draft.setCourse(course);

        assertThat(draft.getCourse()).isNotNull();
        assertThat(draft.getCourse().getCode()).isEqualTo(courseCode);

        User teacher = Ebean.find(User.class).where().eq("email", "maika.ope@funet.fi").findUnique();

        if(teacher == null) {
            originalRowCount = Ebean.find(User.class).findRowCount();
            teacher = createTeacher();
            rowCount = Ebean.find(User.class).findRowCount();
            assertThat(rowCount).isEqualTo(originalRowCount + 1).toString();
        }
        draft.setGradedByUser(teacher);

        draft.update();

        assertThat(draft.getGradedByUser()).isNotNull();
        assertThat(draft.getGradedByUser().getEmail()).isEqualTo("maika.ope@funet.fi");

        return draft;
    }

    private static User createTeacher() {
        User teacher = new User();
        teacher.setEmail("maika.ope@funet.fi");
        teacher.setEppn("maikaope@funet.fi");
        teacher.setFirstName("Maika");
        teacher.setLastName("Ope");
        teacher.save();

        return teacher;
    }

    /**
     * Reads file content
     *
     * @param path     The file path
     * @param encoding The ENCODING in use
     * @return String       The file contents
     */
    private static String readFile(String path, Charset encoding)
            throws IOException {
        byte[] encoded = Files.readAllBytes(Paths.get(path));
        return new String(encoded, encoding);
    }

    private String[] getExamFields() {
        return new String[] {"id", "name", "course.id", "course.code", "course.name", "course.level",
                "course.courseUnitType", "course.credits", "course.institutionName", "course.department", "parent",
                "examType", "instruction", "enrollInstruction", "shared", "examActiveStartDate",
                "examActiveEndDate", "room", "duration", "grading", "grade", "customCredit", "totalScore",
                "answerLanguage","state", "examFeedback", "creditType", "expanded", "attachment", "creator.id",
                "creator.firstName", "creator.lastName"};
    }

    private String[] getExamSectionFieldsOfExam(String index) {
        String[] fields = {"name", "totalScore", "id", "expanded", "lotteryOn", "lotteryItemCount"};
        for (int i = 0; i < fields.length; ++i) {
            fields[i] = "examSections[" + index + "]." + fields[i];
        }
        return fields;
    }

    private String[] getSectionQuestionFieldsOfSection(String sectionIndex, String sectionQuestionIndex) {
        String[] fields = {"sequenceNumber", "question", "question.question", "question.answer"};
        for (int i = 0; i < fields.length; ++i) {
            fields[i] = "examSections[" + sectionIndex + "].sectionQuestions[" + sectionQuestionIndex + "]." + fields[i];
        }
        return fields;
    }
}