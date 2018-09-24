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

package backend.controllers;

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
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.zip.GZIPOutputStream;
import javax.inject.Inject;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.FetchConfig;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveOutputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import org.jsoup.Jsoup;
import play.Logger;
import play.data.DynamicForm;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import scala.concurrent.duration.Duration;

import backend.controllers.base.BaseController;
import backend.impl.EmailComposer;
import backend.models.*;
import backend.models.base.GeneratedIdentityModel;
import backend.models.questions.ClozeTestAnswer;
import backend.models.questions.EssayAnswer;
import backend.models.questions.Question;
import backend.sanitizers.Attrs;
import backend.sanitizers.CommaJoinedListSanitizer;
import backend.system.interceptors.Anonymous;
import backend.util.AppUtil;
import backend.util.CsvBuilder;

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
                .findOne();

        if (participation == null) {
            return notFound();
        } else {
            return ok(participation);
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    @Anonymous(filteredProperties = {"user", "preEnrolledUserEmail", "grade"})
    public Result getParticipationsForExamAndUser(Long eid) {
        final Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound();
        }
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam", "id, state, anonymous")
                .fetch("exam.grade", "id, name")
                .where()
                .eq("user", exam.getCreator())
                .eq("exam.parent", exam.getParent())
                .disjunction()
                .eq("exam.state", Exam.State.ABORTED)
                .eq("exam.state", Exam.State.GRADED)
                .eq("exam.state", Exam.State.GRADED_LOGGED)
                .eq("exam.state", Exam.State.ARCHIVED)
                .endJunction()
                .findList();
        return writeAnonymousResult(ok(participations), exam.isAnonymous());
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    @Anonymous(filteredProperties = {"user", "preEnrolledUserEmail"})
    public Result listNoShowsForExamAndUser(Long eid) {
        final Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound();
        }
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("reservation", "startAt, endAt, noShow")
                .where()
                .eq("user", exam.getCreator())
                .eq("exam", exam.getParent())
                .eq("reservation.noShow", true)
                .orderBy("reservation.endAt")
                .findList();
        return writeAnonymousResult(ok(enrolments), exam.isAnonymous());
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getReservationInformationForExam(Long eid) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("exam.id", eid)
                .findOne();
        if (enrolment == null || enrolment.getReservation() == null) {
            return notFound();
        }
        ExamMachine machine = enrolment.getReservation().getMachine();
        return ok(machine);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    @Anonymous(filteredProperties = {"user", "preEnrolledUserEmail", "creator", "modifier"})
    public Result getExamReview(Long eid) {
        ExpressionList<Exam> query = createQuery()
                .where()
                .eq("id", eid)
                .disjunction()
                .eq("state", Exam.State.REVIEW)
                .eq("state", Exam.State.REVIEW_STARTED)
                .eq("state", Exam.State.GRADED)
                .eq("state", Exam.State.GRADED_LOGGED)
                .eq("state", Exam.State.REJECTED)
                .eq("state", Exam.State.ARCHIVED);
        User user = getLoggedUser();
        boolean isAdmin = user.hasRole(Role.Name.ADMIN.toString(), getSession());
        if (isAdmin) {
            query = query.eq("state", Exam.State.ABORTED);
        }
        query = query.endJunction();
        Exam exam = query.orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber").findOne();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        if (!exam.isChildInspectedOrCreatedOrOwnedBy(user) && !isAdmin && !exam.isViewableForLanguageInspector(user)) {
            return forbidden("sitnet_error_access_forbidden");
        }
        exam.getExamSections().stream()
                .flatMap(es -> es.getSectionQuestions().stream())
                .filter(esq -> esq.getQuestion().getType() == Question.Type.ClozeTestQuestion)
                .forEach(esq -> {
                    if (esq.getClozeTestAnswer() == null) {
                        ClozeTestAnswer cta = new ClozeTestAnswer();
                        cta.save();
                        esq.setClozeTestAnswer(cta);
                        esq.update();
                    }
                    esq.getClozeTestAnswer().setQuestionWithResults(esq);
                });
        return writeAnonymousResult(ok(exam), exam.isAnonymous());
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    @Anonymous(filteredProperties = {"user", "creator", "modifier"})
    public Result getExamReviews(Long eid) {
        User user = getLoggedUser();
        PathProperties pp = PathProperties.parse("(" +
                "id, name, anonymous, state, gradedTime, customCredit, creditType, gradeless, answerLanguage, trialCount, " +
                "gradeScale(grades(*)), creditType(*), examType(*), executionType(*), examFeedback(*), grade(*)" +
                "examInspections(ready, user(id, firstName, lastName, email)), " +
                "examSections(sectionQuestions(*, clozeTestAnswer(*), question(*), essayAnswer(*), options(*, option(*)))), " +
                "languageInspection(*), examLanguages(*)" +
                "parent(examOwners(firstName, lastName, email)), " +
                "examParticipation(*, user(id, firstName, lastName, email, userIdentifier), reservation(retrialPermitted))" +
                ")");
        Query<Exam> query = Ebean.find(Exam.class);
        pp.apply(query);
        query.fetchQuery("course", "code, credits")
                .fetch("course.gradeScale.grades");
        query.where()
                .eq("parent.id", eid)
                .in("state", Exam.State.ABORTED, Exam.State.REVIEW, Exam.State.REVIEW_STARTED,
                        Exam.State.GRADED, Exam.State.GRADED_LOGGED, Exam.State.REJECTED, Exam.State.ARCHIVED);
        if (!user.hasRole(Role.Name.ADMIN.toString(), getSession())) {
            query.where().disjunction()
                    .eq("parent.examOwners", user)
                    .eq("examInspections.user", user)
                    .endJunction();
        }
        Set<Exam> exams = query.findSet();

        Set<Long> anonIds = new HashSet<>();
        Set<ExamParticipation> participations = exams.stream().map(e -> {
            e.setMaxScore();
            e.setApprovedAnswerCount();
            e.setRejectedAnswerCount();
            e.setTotalScore();
            ExamParticipation ep = e.getExamParticipation();
            ep.setExam(e);
            if (e.isAnonymous()) {
                anonIds.add(ep.getId());
            }
            return ep;
        }).collect(Collectors.toSet());

        final Result result = ok(participations);
        return writeAnonymousResult(result, anonIds);
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
        String essayScore = df.get("evaluatedScore");
        Double score = essayScore == null ? null : Double.parseDouble(essayScore);
        answer.setEvaluatedScore(round(score));
        answer.update();
        return ok();
    }

    @Restrict({@Group("TEACHER")})
    public Result updateAssessmentInfo(Long id) {
        String info = request().body().asJson().get("assessmentInfo").asText();
        Optional<Exam> option = Ebean.find(Exam.class).fetch("parent.creator")
                .where()
                .idEq(id)
                .eq("state", Exam.State.GRADED_LOGGED)
                .findOneOrEmpty();
        if (!option.isPresent()) {
            return notFound("sitnet_exam_not_found");
        }
        Exam exam = option.get();
        if (exam.getState() != Exam.State.GRADED_LOGGED || !isAllowedToModify(exam, getLoggedUser(), exam.getState())) {
            return forbidden("You are not allowed to modify this object");
        }
        exam.setAssessmentInfo(info);
        exam.update();
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result reviewExam(Long id) {
        DynamicForm df = formFactory.form().bindFromRequest();
        Exam exam = Ebean.find(Exam.class).fetch("parent").fetch("parent.creator").where().idEq(id).findOne();
        if (exam == null) {
            return notFound("sitnet_exam_not_found");
        }
        User user = getLoggedUser();
        Exam.State newState = Exam.State.valueOf(df.get("state"));
        if (!isAllowedToModify(exam, user, newState)) {
            return forbidden("You are not allowed to modify this object");
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.REJECTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
            return forbidden("Not allowed to update grading of this exam");
        }

        if (isRejectedInLanguageInspection(exam, user, newState)) {
            // Just update state, do not allow other modifications here
            return updateReviewState(exam, newState, true);
        }
        Integer grade = df.get("grade") == null ? null : Integer.parseInt(df.get("grade"));
        String additionalInfo = df.get("additionalInfo");
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
                    .findOne();
            if (eType != null) {
                exam.setCreditType(eType);
            }
        } else {
            exam.setCreditType(null);
        }
        exam.setAdditionalInfo(additionalInfo);
        exam.setAnswerLanguage(df.get("answerLanguage"));

        if (df.get("customCredit") != null) {
            exam.setCustomCredit(Double.parseDouble(df.get("customCredit")));
        } else {
            exam.setCustomCredit(null);
        }
        return updateReviewState(exam, newState, false);
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
    @Anonymous(filteredProperties = {"user"})
    public Result listNoShows(Long eid) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam", "id, name, state, gradedTime, customCredit, trialCount, anonymous")
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
        }

        final Result result = ok(enrolments);
        Set<Long> anonIds = enrolments.stream().filter(e -> e.getExam().isAnonymous())
                .map(GeneratedIdentityModel::getId)
                .collect(Collectors.toSet());
        return writeAnonymousResult(result, anonIds);
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
        Comment comment = Ebean.find(Comment.class).fetch("creator", "firstName, lastName").where().idEq(cid).findOne();
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
    public Result addInspectionComment(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return notFound("Inspection not found");
        }
        DynamicForm df = formFactory.form().bindFromRequest();
        InspectionComment ic = new InspectionComment();
        User user = getLoggedUser();
        AppUtil.setCreator(ic, user);
        AppUtil.setModifier(ic, user);
        ic.setComment(df.get("comment"));
        ic.setExam(exam);
        ic.save();
        return ok(ic, PathProperties.parse("(creator(firstName, lastName, email), created, comment)"));
    }

    private List<String> parseArrayFieldFromBody(String field) {
        DynamicForm df = formFactory.form().bindFromRequest();
        String args = df.get(field);
        String[] array;
        if (args == null || args.isEmpty()) {
            array = new String[]{};
        } else {
            array = args.split(",");
        }
        return Arrays.asList(array);
    }


    @With(CommaJoinedListSanitizer.class)
    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result archiveExams() {
        Collection<Long> ids = request().attrs().get(Attrs.ID_COLLECTION);
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

    private static boolean isEligibleForArchiving(Exam exam, DateTime start, DateTime end) {
        return exam.hasState(Exam.State.ABORTED, Exam.State.REVIEW, Exam.State.REVIEW_STARTED)
                && !(start != null && exam.getCreated().isBefore(start))
                && !(end != null && exam.getCreated().isAfter(end));
    }

    private static void createSummaryFile(ArchiveOutputStream aos, DateTime start, DateTime end, Exam exam,
                                          Map<Long, String> questions) throws IOException {
        File file = File.createTempFile("summary", ".txt");
        FileOutputStream fos = new FileOutputStream(file);
        BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(fos));

        if (start != null || end != null) {
            DateTimeFormatter dtf = DateTimeFormat.forPattern("dd.MM.yyyy");
            writer.write(String.format("period: %s-%s",
                    start == null ? "" : dtf.print(start), end == null ? "" : dtf.print(end)));
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

    private void createArchive(Exam prototype, ArchiveOutputStream aos, DateTime start, DateTime end) throws IOException {
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
        DateTime startDate = null;
        DateTime endDate = null;
        try {
            DateFormat df = new SimpleDateFormat("dd.MM.yyyy");
            if (start.isPresent()) {
                startDate = new DateTime(df.parse(start.get())).withTimeAtStartOfDay();
            }
            if (end.isPresent()) {
                endDate = new DateTime(df.parse(end.get())).withTimeAtStartOfDay().plusDays(1);
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


    private boolean isRejectedInLanguageInspection(Exam exam, User user, Exam.State newState) {
        LanguageInspection li = exam.getLanguageInspection();
        return newState == Exam.State.REJECTED && li != null && !li.getApproved() &&
                li.getFinishedAt() != null && user.hasPermission(Permission.Type.CAN_INSPECT_LANGUAGE);
    }

    private boolean isAllowedToModify(Exam exam, User user, Exam.State newState) {
        return exam.getParent().isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession()) ||
                isRejectedInLanguageInspection(exam, user, newState);
    }

    private Result updateReviewState(Exam exam, Exam.State newState, boolean stateOnly) {
        exam.setState(newState);
        // set grading info only if exam is really graded, not just modified
        if (exam.hasState(Exam.State.GRADED, Exam.State.GRADED_LOGGED, Exam.State.REJECTED)) {
            if (!stateOnly) {
                exam.setGradedTime(DateTime.now());
                exam.setGradedByUser(getLoggedUser());
            }
            if (exam.hasState(Exam.State.REJECTED)) {
                // inform student
                notifyPartiesAboutPrivateExamRejection(exam);
            }
        }
        exam.generateHash();
        exam.update();
        return ok();
    }

    private void notifyPartiesAboutPrivateExamRejection(Exam exam) {
        User user = getLoggedUser();
        final Set<User> examinators = exam.getExecutionType().getType().equals(
                ExamExecutionType.Type.MATURITY.toString())
                ? exam.getParent().getExamOwners() : Collections.emptySet();
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            emailComposer.composeInspectionReady(exam.getCreator(), user, exam, examinators);
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
                .fetch("examEnrolments")
                .fetch("examEnrolments.reservation")
                .fetch("examEnrolments.reservation.machine")
                .fetch("examEnrolments.reservation.machine.room")
                .fetch("examInspections")
                .fetch("examInspections.user")
                .fetch("examParticipation")
                .fetch("examParticipation.user")
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
                .fetch("examSections.sectionQuestions.clozeTestAnswer", "id, question, answer, score")
                .fetch("gradeScale")
                .fetch("gradeScale.grades")
                .fetch("grade")
                .fetch("inspectionComments")
                .fetch("inspectionComments.creator", "firstName, lastName, email")
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
