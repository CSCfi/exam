package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.FetchConfig;
import com.fasterxml.jackson.databind.JsonNode;
import models.*;
import models.questions.Answer;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveOutputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.joda.time.DateTime;
import org.jsoup.Jsoup;
import play.Logger;
import play.data.DynamicForm;
import play.mvc.Http;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.CsvBuilder;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.io.*;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.zip.GZIPOutputStream;

import static util.java.AttachmentUtils.setData;

public class ReviewController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateInspection(Long id, boolean ready) {

        ExamInspection inspection = Ebean.find(ExamInspection.class, id);

        if (inspection == null) {
            return notFound();
        }
        inspection.setReady(ready);
        inspection.update();

        return ok();
    }

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
        Exam exam = Exam.createQuery()
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
        if (!exam.isInspectedOrCreatedOrOwnedBy(user, true) && !user.hasRole("ADMIN", getSession()) &&
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
                .fetch("exam.gradeScale.grades")
                .fetch("exam.creditType")
                .fetch("exam.examType")
                .fetch("exam.examFeedback")
                .fetch("exam.languageInspection")
                .fetch("exam.examSections.sectionQuestions.question")
                .fetch("exam.examLanguages")
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
            } else {
                return badRequest("Invalid grade for this grade scale");
            }
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


    @Restrict({@Group("TEACHER")})
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
        DateFormat df = new SimpleDateFormat("dd.MM.yyyy");
        writer.write(String.format("period: %s-%s", df.format(start), df.format(end)));
        writer.newLine();
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
        List<Exam> children = prototype.getChildren().stream().filter(
                (e) -> isEligibleForArchiving(e, start, end)).collect(Collectors.toList());
        Map<Long, String> questions = new LinkedHashMap<>();
        for (Exam exam : children) {
            String uid = exam.getCreator().getUserIdentifier() == null ?
                    exam.getCreator().getId().toString() : exam.getCreator().getUserIdentifier();
            for (ExamSection es : exam.getExamSections()) {
                for (ExamSectionQuestion esq : es.getSectionQuestions()) {
                    questions.put(esq.getQuestion().getId(), esq.getQuestion().getQuestion());
                    Long questionId = esq.getQuestion().getParent().getId();
                    Answer answer = esq.getQuestion().getAnswer();
                    Attachment attachment;
                    File file = null;
                    if (answer != null && (attachment = answer.getAttachment()) != null) {
                        // attached answer
                        String fileName = attachment.getFileName();
                        file = new File(String.format("%s/%s", attachment.getFilePath(), fileName));
                        if (file.exists()) {
                            String entryName = String.format("%d/%d/%s/%s", prototype.getId(), questionId, uid, fileName);
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
        try {
            CsvBuilder.parseGrades(file, user, user.hasRole(Role.Name.ADMIN.toString(), getSession()));
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
        return ok(Base64.getEncoder().encode(setData(tarball).toByteArray()));
    }

    private void notifyPartiesAboutPrivateExamRejection(Exam exam) {
        User user = getLoggedUser();
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            emailComposer.composeInspectionReady(exam.getCreator(), user, exam);
            Logger.info("Inspection rejection notification email sent");
        }, actor.dispatcher());
    }

}
