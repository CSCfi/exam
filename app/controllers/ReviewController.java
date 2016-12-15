package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.FetchConfig;
import com.avaje.ebean.Query;
import com.fasterxml.jackson.databind.JsonNode;
import models.*;
import models.questions.EssayAnswer;
import models.questions.Question;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveOutputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.joda.time.DateTime;
import org.jsoup.Jsoup;
import play.Logger;
import play.data.DynamicForm;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.CsvBuilder;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.io.BufferedOutputStream;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.zip.GZIPOutputStream;

public class ReviewController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamStudentInfo(Long eid) {

        ExamParticipation participation = Ebean.find(ExamParticipation.class)
                .fetch("user", "id, firstName, lastName, email, userIdentifier")
                .where()
                .eq("exam.id", eid)
                .findUnique();

        if (participation == null) {
            return notFound();
        } else {
            return ok(participation);
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getParticipationsForExamAndUser(Long eid, Long uid) {
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam", "id, state")
                .fetch("exam.grade", "id, name")
                .where()
                .eq("user.id", uid)
                .eq("exam.parent.id", eid)
                .disjunction()
                .eq("exam.state", Exam.State.ABORTED)
                .eq("exam.state", Exam.State.GRADED)
                .eq("exam.state", Exam.State.GRADED_LOGGED)
                .eq("exam.state", Exam.State.ARCHIVED)
                .endJunction()
                .findList();
        return ok(participations);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getReservationInformationForExam(Long eid) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("exam.id", eid)
                .findUnique();
        if (enrolment == null || enrolment.getReservation() == null) {
            return notFound();
        }
        ExamMachine machine = enrolment.getReservation().getMachine();
        return ok(machine);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getEnrolmentsForExam(Long eid) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam", "id, name")
                .fetch("exam.course", "code")
                .fetch("user", "id")
                .fetch("reservation", "startAt")
                .fetch("reservation.machine", "name")
                .where()
                .eq("exam.id", eid)
                .findList();
        return ok(enrolments);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamReview(Long eid) {
        Exam exam = createQuery()
                .where()
                .eq("id", eid)
                .disjunction()
                .eq("state", Exam.State.ABORTED)
                .eq("state", Exam.State.REVIEW)
                .eq("state", Exam.State.REVIEW_STARTED)
                .eq("state", Exam.State.GRADED)
                .eq("state", Exam.State.GRADED_LOGGED)
                .eq("state", Exam.State.REJECTED)
                .eq("state", Exam.State.ARCHIVED)
                .endJunction()
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (!exam.isChildInspectedOrCreatedOrOwnedBy(user) && !user.hasRole("ADMIN", getSession()) &&
                !exam.isViewableForLanguageInspector(user)) {
            return forbidden("sitnet_error_access_forbidden");
        }
        return ok(exam);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamReviews(Long eid) {
        User user = getLoggedUser();
        Set<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("user", "id, firstName, lastName, email, userIdentifier")
                .fetch("exam", "id, name, state, gradedTime, customCredit, creditType, answerLanguage, trialCount")
                .fetch("exam.grade", "id, name")
                .fetch("exam.gradeScale")
                .fetch("exam.gradeScale.grades", new FetchConfig().query())
                .fetch("exam.creditType")
                .fetch("exam.examType")
                .fetch("exam.executionType")
                .fetch("exam.examFeedback")
                .fetch("exam.languageInspection")
                .fetch("exam.examSections.sectionQuestions.question") // for getting the scores (see below)
                .fetch("exam.examLanguages", new FetchConfig().query())
                .fetch("exam.course", "code, credits")
                .fetch("exam.course.gradeScale")
                .fetch("exam.course.gradeScale.grades", new FetchConfig().query())
                .fetch("exam.parent.gradeScale")
                .fetch("exam.parent.examOwners")
                .fetch("exam.parent.gradeScale.grades", new FetchConfig().query())
                .fetch("reservation", "retrialPermitted")
                .where()
                .eq("exam.parent.id", eid)
                .in("exam.state", Exam.State.ABORTED, Exam.State.REVIEW, Exam.State.REVIEW_STARTED,
                        Exam.State.GRADED, Exam.State.GRADED_LOGGED, Exam.State.REJECTED, Exam.State.ARCHIVED)
                .disjunction()
                .eq("exam.parent.examOwners", user)
                .eq("exam.examInspections.user", user)
                .endJunction()
                .findSet();
        participations.stream().map(ExamParticipation::getExam).forEach(exam -> {
            exam.setMaxScore();
            exam.setApprovedAnswerCount();
            exam.setRejectedAnswerCount();
            exam.setTotalScore();
        });
        return ok(participations);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result scoreExamQuestion(Long id) {
        DynamicForm df = formFactory.form().bindFromRequest();
        ExamSectionQuestion essayQuestion = Ebean.find(ExamSectionQuestion.class, id);
        if (essayQuestion == null) {
            return notFound("question not found");
        }
        EssayAnswer answer = essayQuestion.getEssayAnswer();
        if (answer == null) {
            // Question was not answered at all.
            answer = new EssayAnswer();
            answer.save();
            essayQuestion.setEssayAnswer(answer);
            essayQuestion.update();
        }
        answer.setEvaluatedScore(Integer.parseInt(df.get("evaluatedScore")));
        answer.update();
        return ok(Json.toJson(essayQuestion));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result reviewExam(Long id) {
        DynamicForm df = formFactory.form().bindFromRequest();
        Exam exam = Ebean.find(Exam.class).fetch("parent").fetch("parent.creator").where().idEq(id).findUnique();
        if (exam == null) {
            return notFound("sitnet_exam_not_found");
        }
        User user = getLoggedUser();
        if (!exam.getParent().isOwnedOrCreatedBy(user) && !user.hasRole("ADMIN", getSession())) {
            return forbidden("You are not allowed to modify this object");
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.REJECTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
            return forbidden("Not allowed to update grading of this exam");
        }

        Integer grade = df.get("grade") == null ? null : Integer.parseInt(df.get("grade"));
        String additionalInfo = df.get("additionalInfo") == null ? null : df.get("additionalInfo");
        if (grade != null) {
            Grade examGrade = Ebean.find(Grade.class, grade);
            GradeScale scale = exam.getGradeScale() == null ? exam.getCourse().getGradeScale() : exam.getGradeScale();
            if (scale.getGrades().contains(examGrade)) {
                exam.setGrade(examGrade);
                exam.setGradeless(false);
            } else {
                return badRequest("Invalid grade for this grade scale");
            }
        } else if (df.get("gradeless").equals("true")) {
            exam.setGrade(null);
            exam.setGradeless(true);
        } else {
            exam.setGrade(null);
        }
        String creditType = df.get("creditType.type");
        if (creditType == null) {
            creditType = df.get("creditType");
        }
        if (creditType != null) {
            ExamType eType = Ebean.find(ExamType.class)
                    .where()
                    .eq("type", creditType)
                    .findUnique();
            if (eType != null) {
                exam.setCreditType(eType);
            }
        } else {
            exam.setCreditType(null);
        }
        exam.setAdditionalInfo(additionalInfo);
        exam.setAnswerLanguage(df.get("answerLanguage"));
        exam.setState(Exam.State.valueOf(df.get("state")));

        if (df.get("customCredit") != null) {
            exam.setCustomCredit(Double.parseDouble(df.get("customCredit")));
        } else {
            exam.setCustomCredit(null);
        }
        // set user only if exam is really graded, not just modified
        if (exam.hasState(Exam.State.GRADED, Exam.State.GRADED_LOGGED, Exam.State.REJECTED)) {
            exam.setGradedTime(new Date());
            exam.setGradedByUser(getLoggedUser());
            if (exam.hasState(Exam.State.REJECTED)) {
                // inform student
                notifyPartiesAboutPrivateExamRejection(exam);
            }
        }
        exam.generateHash();
        exam.update();

        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result sendInspectionMessage(Long eid) {

        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        JsonNode body = request().body().asJson();
        if (!body.has("msg")) {
            return badRequest("no message received");
        }
        User loggedUser = getLoggedUser();
        List<ExamInspection> inspections = Ebean.find(ExamInspection.class)
                .fetch("user")
                .fetch("exam")
                .where()
                .eq("exam.id", exam.getId())
                .ne("user.id", loggedUser.getId())
                .findList();

        Set<User> recipients = inspections.stream()
                .map(ExamInspection::getUser)
                .collect(Collectors.toSet());

        // add owners to list, except those how are already in the list and self
        if (exam.getParent() != null) {
            for (User owner : exam.getParent().getExamOwners()) {
                if (owner.equals(loggedUser)) {
                    continue;
                }
                recipients.add(owner);
            }
        }
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            for (User user : recipients) {
                emailComposer.composeInspectionMessage(user, loggedUser, exam, body.get("msg").asText());
            }
        }, actor.dispatcher());
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result listNoShows(Long eid) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam", "id, name, state, gradedTime, customCredit, trialCount")
                .fetch("exam.executionType")
                .fetch("reservation")
                .fetch("user", "id, firstName, lastName, email, userIdentifier")
                .fetch("exam.course", "code, credits")
                .fetch("exam.grade", "id, name")
                .where()
                .eq("exam.id", eid)
                .eq("reservation.noShow", true)
                .orderBy("reservation.endAt")
                .findList();
        if (enrolments == null) {
            return notFound();
        } else {
            return ok(enrolments);
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertComment(Long eid, Long cid) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
            return forbidden();
        }
        Comment comment = bindForm(Comment.class);
        AppUtil.setCreator(comment, getLoggedUser());
        comment.save();

        exam.setExamFeedback(comment);
        exam.save();

        return ok(comment);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateComment(Long eid, Long cid) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
            return forbidden();
        }
        Comment form = bindForm(Comment.class);
        Comment comment = Ebean.find(Comment.class).fetch("creator", "firstName, lastName").where().idEq(cid).findUnique();
        if (comment == null) {
            return notFound();
        }
        if (form.getComment() != null) {
            AppUtil.setModifier(comment, getLoggedUser());
            comment.setComment(form.getComment());
            comment.save();
            exam.setExamFeedback(comment);
            exam.save();
        }
        return ok(comment);
    }


    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result archiveExams() {
        List<String> ids = parseArrayFieldFromBody("ids");
        if (ids.isEmpty()) {
            return badRequest();
        }
        List<Exam> exams = Ebean.find(Exam.class).where()
                .eq("state", Exam.State.GRADED_LOGGED)
                .idIn(ids)
                .findList();
        for (Exam e : exams) {
            e.setState(Exam.State.ARCHIVED);
            e.update();
        }
        return ok();
    }

    private static boolean isEligibleForArchiving(Exam exam, Date start, Date end) {
        return exam.hasState(Exam.State.ABORTED, Exam.State.REVIEW, Exam.State.REVIEW_STARTED)
                && !(start != null && exam.getCreated().before(start))
                && !(end != null && exam.getCreated().after(end));
    }

    private static void createSummaryFile(ArchiveOutputStream aos, Date start, Date end, Exam exam,
                                          Map<Long, String> questions) throws IOException {
        File file = File.createTempFile("summary", ".txt");
        FileOutputStream fos = new FileOutputStream(file);
        BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(fos));

        if (start != null || end != null) {
            DateFormat df = new SimpleDateFormat("dd.MM.yyyy");
            writer.write(String.format("period: %s-%s",
                    start == null ? "" : df.format(start), end == null ? "" : df.format(end)));
            writer.newLine();
        }
        writer.write(String.format("exam id: %d", exam.getId()));
        writer.newLine();
        writer.write(String.format("exam name: %s", exam.getName()));
        writer.newLine();
        writer.newLine();
        writer.write("questions");
        writer.newLine();
        for (Map.Entry<Long, String> entry : questions.entrySet()) {
            writer.write(String.format("%d: %s", entry.getKey(), Jsoup.parse(entry.getValue()).text()));
            writer.newLine();
        }
        writer.close();
        TarArchiveEntry entry = new TarArchiveEntry("summary.txt");
        entry.setSize(file.length());
        aos.putArchiveEntry(entry);
        IOUtils.copy(new FileInputStream(file), aos);
        aos.closeArchiveEntry();
    }

    private void createArchive(Exam prototype, ArchiveOutputStream aos, Date start, Date end) throws IOException {
        List<Exam> children = prototype.getChildren().stream()
                .filter(e -> isEligibleForArchiving(e, start, end))
                .collect(Collectors.toList());
        Map<Long, String> questions = new LinkedHashMap<>();
        for (Exam exam : children) {
            String uid = String.format("%s-%d", exam.getCreator().getUserIdentifier() == null ?
                    exam.getCreator().getId().toString() : exam.getCreator().getUserIdentifier(), exam.getId());
            for (ExamSection es : exam.getExamSections()) {
                List<ExamSectionQuestion> essays = es.getSectionQuestions().stream()
                        .filter(esq -> esq.getQuestion().getType() == Question.Type.EssayQuestion)
                        .collect(Collectors.toList());
                for (ExamSectionQuestion esq : essays) {
                    Long questionId = esq.getQuestion().getParent() == null ?
                            esq.getQuestion().getId() : esq.getQuestion().getParent().getId();
                    questions.put(questionId, esq.getQuestion().getQuestion());
                    String questionIdText = esq.getQuestion().getParent() == null ?
                            Long.toString(questionId) + "#original_question_removed" :
                            Long.toString(esq.getQuestion().getParent().getId());
                    EssayAnswer answer = esq.getEssayAnswer();
                    Attachment attachment;
                    File file = null;
                    if (answer != null && (attachment = answer.getAttachment()) != null) {
                        // attached answer
                        String fileName = attachment.getFileName();
                        file = new File(attachment.getFilePath());
                        if (file.exists()) {
                            String entryName = String.format("%d/%s/%s/%s", prototype.getId(), questionIdText, uid, fileName);
                            TarArchiveEntry entry = new TarArchiveEntry(entryName);
                            entry.setSize(file.length());
                            aos.putArchiveEntry(entry);
                            IOUtils.copy(new FileInputStream(file), aos);
                        } else {
                            Logger.warn("Attachment {} is not connected to a file on disk!", attachment.getId());
                        }
                    }
                    if (file == null || !file.exists()) {
                        // no attached answer, create empty directory
                        String entryName = String.format("%d/%d/%s/", prototype.getId(), questionId, uid);
                        TarArchiveEntry entry = new TarArchiveEntry(entryName);
                        aos.putArchiveEntry(entry);
                    }
                    aos.closeArchiveEntry();
                }
            }
        }
        createSummaryFile(aos, start, end, prototype, questions);
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result importGrades() {
        Http.MultipartFormData<File> body = request().body().asMultipartFormData();
        Http.MultipartFormData.FilePart<File> filePart = body.getFile("file");
        if (filePart == null) {
            return notFound();
        }
        File file = filePart.getFile();
        User user = getLoggedUser();
        boolean isAdmin = user.hasRole(Role.Name.ADMIN.toString(), getSession());
        try {
            CsvBuilder.parseGrades(file, user, isAdmin ? Role.Name.ADMIN : Role.Name.TEACHER);
        } catch (IOException e) {
            Logger.error("Failed to parse CSV file. Stack trace follows");
            e.printStackTrace();
            return internalServerError("sitnet_internal_error");
        }
        return ok();
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result getArchivedAttachments(Long eid, Optional<String> start, Optional<String> end) throws IOException {
        Exam prototype = Ebean.find(Exam.class, eid);
        if (prototype == null) {
            return notFound();
        }
        Date startDate = null;
        Date endDate = null;
        try {
            DateFormat df = new SimpleDateFormat("dd.MM.yyyy");
            if (start.isPresent()) {
                startDate = new DateTime(df.parse(start.get())).withTimeAtStartOfDay().toDate();
            }
            if (end.isPresent()) {
                endDate = new DateTime(df.parse(end.get())).withTimeAtStartOfDay().plusDays(1).toDate();
            }
        } catch (ParseException e) {
            return badRequest();
        }
        File tarball = File.createTempFile(eid.toString(), ".tar.gz");
        try (ArchiveOutputStream aos = new TarArchiveOutputStream(
                new GZIPOutputStream(
                        new BufferedOutputStream(
                                new FileOutputStream(tarball))))) {
            createArchive(prototype, aos, startDate, endDate);
            if (aos.getBytesWritten() == 0) {
                return notFound("sitnet_no_attachments_to_archive");
            }
        } catch (IOException e) {
            Logger.error("Failed in creating a tarball", e);
        }
        response().setHeader("Content-Disposition", "attachment; filename=\"" + tarball.getName() + "\"");
        String body = Base64.getEncoder().encodeToString(setData(tarball).toByteArray());
        return ok(body);
    }

    private void notifyPartiesAboutPrivateExamRejection(Exam exam) {
        User user = getLoggedUser();
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            emailComposer.composeInspectionReady(exam.getCreator(), user, exam);
            Logger.info("Inspection rejection notification email sent");
        }, actor.dispatcher());
    }

    private static Query<Exam> createQuery() {
        return Ebean.find(Exam.class)
                .fetch("course")
                .fetch("course.organisation")
                .fetch("course.gradeScale")
                .fetch("course.gradeScale.grades", new FetchConfig().query())
                .fetch("parent")
                .fetch("parent.creator")
                .fetch("parent.gradeScale")
                .fetch("parent.gradeScale.grades", new FetchConfig().query())
                .fetch("parent.examOwners", new FetchConfig().query())
                .fetch("examType")
                .fetch("executionType")
                .fetch("examSections")
                .fetch("examSections.sectionQuestions", "sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType", new FetchConfig().query())
                .fetch("examSections.sectionQuestions.question", "id, type, question, shared")
                .fetch("examSections.sectionQuestions.question.attachment", "fileName")
                .fetch("examSections.sectionQuestions.options")
                .fetch("examSections.sectionQuestions.options.option", "id, option, correctOption")
                .fetch("examSections.sectionQuestions.essayAnswer", "id, answer, evaluatedScore")
                .fetch("examSections.sectionQuestions.essayAnswer.attachment", "fileName")
                .fetch("gradeScale")
                .fetch("gradeScale.grades")
                .fetch("grade")
                .fetch("languageInspection")
                .fetch("languageInspection.assignee", "firstName, lastName, email")
                .fetch("languageInspection.statement")
                .fetch("languageInspection.statement.attachment")
                .fetch("examFeedback")
                .fetch("examFeedback.attachment")
                .fetch("creditType")
                .fetch("attachment")
                .fetch("examLanguages")
                .fetch("examOwners");
    }

}
