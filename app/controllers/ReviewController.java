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

package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import controllers.base.BaseController;
import impl.EmailComposer;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.FetchConfig;
import io.ebean.Query;
import io.ebean.text.PathProperties;
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
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.zip.GZIPOutputStream;
import javax.inject.Inject;
import models.Attachment;
import models.Comment;
import models.Exam;
import models.ExamEnrolment;
import models.ExamFeedbackConfig;
import models.ExamInspection;
import models.ExamParticipation;
import models.ExamType;
import models.Grade;
import models.GradeScale;
import models.InspectionComment;
import models.LanguageInspection;
import models.Permission;
import models.Role;
import models.User;
import models.base.GeneratedIdentityModel;
import models.questions.ClozeTestAnswer;
import models.questions.EssayAnswer;
import models.questions.Question;
import models.sections.ExamSection;
import models.sections.ExamSectionQuestion;
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
import play.i18n.Lang;
import play.i18n.MessagesApi;
import play.libs.Files.TemporaryFile;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.CommaJoinedListSanitizer;
import sanitizers.CommentSanitizer;
import scala.concurrent.duration.Duration;
import security.Authenticated;
import system.interceptors.Anonymous;
import util.csv.CsvBuilder;
import util.file.FileHandler;

public class ReviewController extends BaseController {

    private static final double HUNDRED = 100d;

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected CsvBuilder csvBuilder;

    @Inject
    protected FileHandler fileHandler;

    @Inject
    protected ActorSystem actor;

    @Inject
    protected MessagesApi messaging;

    private static final Logger.ALogger logger = Logger.of(ReviewController.class);

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Anonymous(filteredProperties = { "user", "preEnrolledUserEmail", "grade" })
    public Result getParticipationsForExamAndUser(Long eid, Http.Request request) {
        final Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound();
        }

        List<ExamParticipation> participations = Ebean
            .find(ExamParticipation.class)
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
        return writeAnonymousResult(request, ok(participations), exam.isAnonymous());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Anonymous(filteredProperties = { "user", "preEnrolledUserEmail" })
    public Result listNoShowsForExamAndUser(Long eid, Http.Request request) {
        final Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound();
        }
        List<ExamEnrolment> enrolments = Ebean
            .find(ExamEnrolment.class)
            .fetch("reservation", "startAt, endAt")
            .fetch("examinationEventConfiguration.examinationEvent", "start")
            .where()
            .eq("user", exam.getCreator())
            .eq("exam", exam.getParent())
            .eq("noShow", true)
            .orderBy("reservation.endAt")
            .findList();
        return writeAnonymousResult(request, ok(enrolments), exam.isAnonymous());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Anonymous(filteredProperties = { "user", "preEnrolledUserEmail", "creator", "modifier", "reservation" })
    public Result getExamReview(Long eid, Http.Request request) {
        ExpressionList<ExamParticipation> query = createQuery()
            .where()
            .eq("exam.id", eid)
            .disjunction()
            .eq("exam.state", Exam.State.REVIEW)
            .eq("exam.state", Exam.State.REVIEW_STARTED)
            .eq("exam.state", Exam.State.GRADED)
            .eq("exam.state", Exam.State.GRADED_LOGGED)
            .eq("exam.state", Exam.State.REJECTED)
            .eq("exam.state", Exam.State.ARCHIVED);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        boolean isAdmin = user.hasRole(Role.Name.ADMIN);
        if (isAdmin) {
            query = query.eq("exam.state", Exam.State.ABORTED);
        }
        query = query.endJunction();
        ExamParticipation examParticipation = query.findOne();
        if (examParticipation == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        Exam exam = examParticipation.getExam();
        if (!exam.isChildInspectedOrCreatedOrOwnedBy(user) && !isAdmin && !exam.isViewableForLanguageInspector(user)) {
            return forbidden("sitnet_error_access_forbidden");
        }

        String blankAnswerText = messaging.get(Lang.forCode(user.getLanguage().getCode()), "clozeTest.blank.answer");
        exam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getQuestion().getType() == Question.Type.ClozeTestQuestion)
            .forEach(esq -> {
                if (esq.getClozeTestAnswer() == null) {
                    ClozeTestAnswer cta = new ClozeTestAnswer();
                    cta.save();
                    esq.setClozeTestAnswer(cta);
                    esq.update();
                }
                esq.getClozeTestAnswer().setQuestionWithResults(esq, blankAnswerText, true);
            });
        return writeAnonymousResult(request, ok(examParticipation), exam.isAnonymous());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Anonymous(filteredProperties = { "user", "creator", "modifier" })
    public Result getExamReviews(Long eid, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        PathProperties pp = PathProperties.parse(
            "(" +
            "id, name, anonymous, state, gradedTime, customCredit, creditType, gradeless, answerLanguage, trialCount, " +
            "implementation, gradeScale(grades(*)), creditType(*), examType(*), executionType(*), examFeedback(*), grade(*), " +
            "course(code, name, gradeScale(grades(*))), " +
            "examSections(name, sectionQuestions(*, clozeTestAnswer(*), question(*), essayAnswer(*), options(*, option(*)))), " +
            "languageInspection(*), examLanguages(*), examFeedback(*), grade(name), " +
            "parent(name, examActiveStartDate, examActiveEndDate, course(code, name), examOwners(firstName, lastName, email)), " +
            "examParticipation(*, user(id, firstName, lastName, email, userIdentifier)), " +
            "examEnrolments(retrialPermitted)" +
            ")"
        );
        Query<Exam> query = Ebean.find(Exam.class);
        pp.apply(query);
        query
            .fetchQuery("course", "code, credits")
            .fetch("course.gradeScale.grades")
            .fetchQuery("examInspections", "ready")
            .fetch("examInspections.user", "id, firstName, lastName, email")
            .fetchQuery("examLanguages")
            .fetchQuery("examEnrolments");
        query
            .where()
            .eq("parent.id", eid)
            .in(
                "state",
                Exam.State.ABORTED,
                Exam.State.REVIEW,
                Exam.State.REVIEW_STARTED,
                Exam.State.GRADED,
                Exam.State.GRADED_LOGGED,
                Exam.State.REJECTED,
                Exam.State.ARCHIVED
            );
        if (!user.hasRole(Role.Name.ADMIN)) {
            query.where().disjunction().eq("parent.examOwners", user).eq("examInspections.user", user).endJunction();
        }
        Set<Exam> exams = query.findSet();

        Set<Long> anonIds = new HashSet<>();
        Set<ExamParticipation> participations = exams
            .stream()
            .map(e -> {
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
            })
            .collect(Collectors.toSet());

        final Result result = ok(participations);
        return writeAnonymousResult(request, result, anonIds);
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result scoreExamQuestion(Long id, Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
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

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result forceScoreExamQuestion(Long id, Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
        Optional<ExamSectionQuestion> oeq = Ebean
            .find(ExamSectionQuestion.class)
            .fetch("examSection.exam.parent.examOwners")
            .where()
            .idEq(id)
            .ne("question.type", Question.Type.EssayQuestion)
            .findOneOrEmpty();
        if (oeq.isEmpty()) {
            return notFound("question not found");
        }
        ExamSectionQuestion question = oeq.get();
        Exam exam = question.getExamSection().getExam();
        if (isDisallowedToScore(exam, request.attrs().get(Attrs.AUTHENTICATED_USER))) {
            return forbidden("No permission to update scoring of this exam");
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.REJECTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
            return forbidden("Not allowed to update scoring of this exam");
        }
        Double forcedScore = df.get("forcedScore") == null ? null : Double.parseDouble(df.get("forcedScore"));
        if (
            forcedScore != null &&
            (forcedScore < question.getMinScore() || forcedScore > question.getMaxAssessedScore())
        ) {
            return badRequest("score out of acceptable range");
        }
        question.setForcedScore(forcedScore);
        question.update();
        return ok();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER") })
    public Result updateAssessmentInfo(Long id, Http.Request request) {
        String info = request.body().asJson().get("assessmentInfo").asText();
        Optional<Exam> option = Ebean
            .find(Exam.class)
            .fetch("parent.creator")
            .where()
            .idEq(id)
            .in("state", Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)
            .findOneOrEmpty();
        if (option.isEmpty()) {
            return notFound("sitnet_exam_not_found");
        }
        Exam exam = option.get();
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (
            !exam.hasState(Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) ||
            isDisallowedToModify(exam, user, exam.getState())
        ) {
            return forbidden("You are not allowed to modify this object");
        }
        exam.setAssessmentInfo(info);
        exam.update();
        return ok();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result reviewExam(Long id, Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
        Exam exam = Ebean.find(Exam.class).fetch("parent").fetch("parent.creator").where().idEq(id).findOne();
        if (exam == null) {
            return notFound("sitnet_exam_not_found");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Exam.State newState = Exam.State.valueOf(df.get("state"));
        if (isDisallowedToModify(exam, user, newState)) {
            return forbidden("You are not allowed to modify this object");
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.REJECTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
            return forbidden("Not allowed to update grading of this exam");
        }

        if (isRejectedInLanguageInspection(exam, user, newState)) {
            // Just update state, do not allow other modifications here
            return updateReviewState(user, exam, newState, true);
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
        } else if (df.get("gradeless") != null && df.get("gradeless").equals("true")) {
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
            ExamType eType = Ebean.find(ExamType.class).where().eq("type", creditType).findOne();
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
        return updateReviewState(user, exam, newState, false);
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result sendInspectionMessage(Long eid, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        JsonNode body = request.body().asJson();
        if (!body.has("msg")) {
            return badRequest("no message received");
        }
        User loggedUser = request.attrs().get(Attrs.AUTHENTICATED_USER);

        List<ExamInspection> inspections = Ebean
            .find(ExamInspection.class)
            .fetch("user")
            .fetch("exam")
            .where()
            .eq("exam.id", exam.getId())
            .ne("user.id", loggedUser.getId())
            .findList();
        Set<User> recipients = inspections.stream().map(ExamInspection::getUser).collect(Collectors.toSet());
        // add owners to list, except those how are already in the list and self
        if (exam.getParent() != null) {
            recipients.addAll(
                exam.getParent().getExamOwners().stream().filter(o -> !o.equals(loggedUser)).collect(Collectors.toSet())
            );
        }
        actor
            .scheduler()
            .scheduleOnce(
                Duration.create(1, TimeUnit.SECONDS),
                () -> {
                    for (User user : recipients) {
                        emailComposer.composeInspectionMessage(user, loggedUser, exam, body.get("msg").asText());
                    }
                },
                actor.dispatcher()
            );
        return ok();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Anonymous(filteredProperties = { "user" })
    public Result listNoShows(Long eid, Http.Request request) {
        List<ExamEnrolment> enrolments = Ebean
            .find(ExamEnrolment.class)
            .fetch("exam", "id, name, state, gradedTime, customCredit, trialCount, anonymous")
            .fetch("exam.executionType")
            .fetch("reservation")
            .fetch("examinationEventConfiguration.examinationEvent")
            .fetch("user", "id, firstName, lastName, email, userIdentifier")
            .fetch("exam.course", "code, credits")
            .fetch("exam.grade", "id, name")
            .where()
            .or()
            .eq("exam.id", eid)
            .eq("exam.parent.id", eid)
            .endOr()
            .eq("noShow", true)
            .orderBy("reservation.endAt")
            .findList();
        final Result result = ok(enrolments);
        Set<Long> anonIds = enrolments
            .stream()
            .filter(e -> e.getExam().isAnonymous())
            .map(GeneratedIdentityModel::getId)
            .collect(Collectors.toSet());
        return writeAnonymousResult(request, result, anonIds);
    }

    @Authenticated
    @With(CommentSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result updateComment(Long eid, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
            return forbidden();
        }
        Optional<String> commentText = request.attrs().getOptional(Attrs.COMMENT);
        Optional<Long> commentId = request.attrs().getOptional(Attrs.COMMENT_ID);
        Comment comment = commentId.isEmpty()
            ? new Comment()
            : Ebean.find(Comment.class).fetch("creator", "firstName, lastName").where().idEq(commentId.get()).findOne();
        if (comment == null) {
            return notFound();
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (commentText.isPresent()) {
            comment.setComment(commentText.get());
            comment.setModifierWithDate(user);
            if (comment.getId() == null) { // new comment
                comment.setCreatorWithDate(user);
                comment.save();
                exam.setExamFeedback(comment);
                exam.save();
            } else {
                comment.update();
            }
        }
        comment.update();
        return ok(comment);
    }

    @Authenticated
    @With(CommentSanitizer.class)
    @Restrict({ @Group("STUDENT") })
    public Result setCommentStatusRead(Long eid, Long cid, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.ARCHIVED)) {
            return forbidden();
        }
        Comment comment = Ebean.find(Comment.class, cid);
        if (comment == null) {
            return notFound();
        }
        Optional<Boolean> feedbackStatus = request.attrs().getOptional(Attrs.FEEDBACK_STATUS);
        if (feedbackStatus.isPresent()) {
            comment.setModifierWithDate(request.attrs().get(Attrs.AUTHENTICATED_USER));
            comment.setFeedbackStatus(feedbackStatus.get());
        }
        comment.update();
        return ok(comment);
    }

    @Authenticated
    @With(CommentSanitizer.class)
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public Result addInspectionComment(Long id, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return notFound("Inspection not found");
        }
        InspectionComment ic = new InspectionComment();
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ic.setCreatorWithDate(user);
        ic.setModifierWithDate(user);
        ic.setComment(request.attrs().getOptional(Attrs.COMMENT).orElse(null));
        ic.setExam(exam);
        ic.save();
        return ok(ic, PathProperties.parse("(creator(firstName, lastName, email), created, comment)"));
    }

    @With(CommaJoinedListSanitizer.class)
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public Result archiveExams(Http.Request request) {
        Collection<Long> ids = request.attrs().get(Attrs.ID_COLLECTION);
        List<Exam> exams = Ebean.find(Exam.class).where().eq("state", Exam.State.GRADED_LOGGED).idIn(ids).findList();
        for (Exam e : exams) {
            e.setState(Exam.State.ARCHIVED);
            e.update();
        }
        return ok();
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public Result hasLockedAssessments(Long eid) {
        // if no assessments => everything
        // if assessments and type == locked => none
        // else date only
        Set<Exam> assessments = Ebean
            .find(Exam.class)
            .where()
            .eq("parent.id", eid)
            .in("state", Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED, Exam.State.REJECTED)
            //.isNotNull("parent.examFeedbackConfig")
            .findSet();
        if (assessments.isEmpty()) {
            return ok(Json.newObject().put("status", "everything"));
        } else {
            Exam exam = Ebean.find(Exam.class, eid);
            if (
                exam != null &&
                exam.getExamFeedbackConfig() != null &&
                exam.getExamFeedbackConfig().getReleaseType() == ExamFeedbackConfig.ReleaseType.GIVEN_DATE
            ) {
                return ok(Json.newObject().put("status", "date"));
            } else {
                return ok(Json.newObject().put("status", "nothing"));
            }
        }
    }

    private static boolean isEligibleForArchiving(Exam exam, DateTime start, DateTime end) {
        return (
            exam.hasState(Exam.State.ABORTED, Exam.State.REVIEW, Exam.State.REVIEW_STARTED) &&
            !(start != null && exam.getCreated().isBefore(start)) &&
            !(end != null && exam.getCreated().isAfter(end))
        );
    }

    private static void createSummaryFile(
        ArchiveOutputStream aos,
        DateTime start,
        DateTime end,
        Exam exam,
        Map<Long, String> questions
    ) throws IOException {
        File file = File.createTempFile("summary", ".txt");
        FileOutputStream fos = new FileOutputStream(file);
        BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(fos));

        if (start != null || end != null) {
            DateTimeFormatter dtf = DateTimeFormat.forPattern("dd.MM.yyyy");
            writer.write(
                String.format("period: %s-%s", start == null ? "" : dtf.print(start), end == null ? "" : dtf.print(end))
            );
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

    private void createArchive(Exam prototype, ArchiveOutputStream aos, DateTime start, DateTime end)
        throws IOException {
        List<Exam> children = prototype
            .getChildren()
            .stream()
            .filter(e -> isEligibleForArchiving(e, start, end))
            .collect(Collectors.toList());
        Map<Long, String> questions = new LinkedHashMap<>();
        for (Exam exam : children) {
            String uid = String.format(
                "%s-%d",
                exam.getCreator().getUserIdentifier() == null
                    ? exam.getCreator().getId().toString()
                    : exam.getCreator().getUserIdentifier(),
                exam.getId()
            );
            for (ExamSection es : exam.getExamSections()) {
                List<ExamSectionQuestion> essays = es
                    .getSectionQuestions()
                    .stream()
                    .filter(esq -> esq.getQuestion().getType() == Question.Type.EssayQuestion)
                    .collect(Collectors.toList());
                for (ExamSectionQuestion esq : essays) {
                    Long questionId = esq.getQuestion().getParent() == null
                        ? esq.getQuestion().getId()
                        : esq.getQuestion().getParent().getId();
                    questions.put(questionId, esq.getQuestion().getQuestion());
                    String questionIdText = esq.getQuestion().getParent() == null
                        ? questionId + "#original_question_removed"
                        : Long.toString(esq.getQuestion().getParent().getId());
                    EssayAnswer answer = esq.getEssayAnswer();
                    Attachment attachment;
                    File file = null;
                    if (answer != null && (attachment = answer.getAttachment()) != null) {
                        // attached answer
                        String fileName = attachment.getFileName();
                        file = new File(attachment.getFilePath());
                        if (file.exists()) {
                            String entryName = String.format(
                                "%d/%s/%s/%s",
                                prototype.getId(),
                                questionIdText,
                                uid,
                                fileName
                            );
                            TarArchiveEntry entry = new TarArchiveEntry(entryName);
                            entry.setSize(file.length());
                            aos.putArchiveEntry(entry);
                            IOUtils.copy(new FileInputStream(file), aos);
                        } else {
                            logger.warn("Attachment {} is not connected to a file on disk!", attachment.getId());
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

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public Result importGrades(Http.Request request) {
        Http.MultipartFormData<TemporaryFile> body = request.body().asMultipartFormData();
        Http.MultipartFormData.FilePart<TemporaryFile> filePart = body.getFile("file");
        if (filePart == null) {
            return notFound();
        }
        File file = filePart.getRef().path().toFile();
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        boolean isAdmin = user.hasRole(Role.Name.ADMIN);
        try {
            csvBuilder.parseGrades(file, user, isAdmin ? Role.Name.ADMIN : Role.Name.TEACHER);
        } catch (Exception e) {
            logger.error("Failed to parse CSV file. Stack trace follows");
            e.printStackTrace();
            return internalServerError("sitnet_internal_error");
        }
        return ok();
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
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
        try (
            TarArchiveOutputStream aos = new TarArchiveOutputStream(
                new GZIPOutputStream(new BufferedOutputStream(new FileOutputStream(tarball)))
            )
        ) {
            aos.setLongFileMode(TarArchiveOutputStream.LONGFILE_POSIX);
            createArchive(prototype, aos, startDate, endDate);
            if (aos.getBytesWritten() == 0) {
                return notFound("sitnet_no_attachments_to_archive");
            }
        } catch (IOException e) {
            logger.error("Failed in creating a tarball", e);
        }
        String contentDisposition = fileHandler.getContentDisposition(tarball);
        byte[] data = fileHandler.read(tarball);
        String body = Base64.getEncoder().encodeToString(data);
        return ok(body).withHeader("Content-Disposition", contentDisposition);
    }

    private boolean isRejectedInLanguageInspection(Exam exam, User user, Exam.State newState) {
        LanguageInspection li = exam.getLanguageInspection();
        return (
            newState == Exam.State.REJECTED &&
            li != null &&
            !li.getApproved() &&
            li.getFinishedAt() != null &&
            user.hasPermission(Permission.Type.CAN_INSPECT_LANGUAGE)
        );
    }

    private boolean isDisallowedToModify(Exam exam, User user, Exam.State newState) {
        return (
            !exam.getParent().isOwnedOrCreatedBy(user) &&
            !user.hasRole(Role.Name.ADMIN) &&
            !isRejectedInLanguageInspection(exam, user, newState)
        );
    }

    private boolean isDisallowedToScore(Exam exam, User user) {
        return (!exam.getParent().isInspectedOrCreatedOrOwnedBy(user) && !user.hasRole(Role.Name.ADMIN));
    }

    private Result updateReviewState(User user, Exam exam, Exam.State newState, boolean stateOnly) {
        exam.setState(newState);
        // set grading info only if exam is really graded, not just modified
        if (exam.hasState(Exam.State.GRADED, Exam.State.GRADED_LOGGED, Exam.State.REJECTED)) {
            if (!stateOnly) {
                exam.setGradedTime(DateTime.now());
                exam.setGradedByUser(user);
            }
            if (exam.hasState(Exam.State.REJECTED)) {
                // inform student
                notifyPartiesAboutPrivateExamRejection(user, exam);
            }
        }
        exam.update();
        return ok();
    }

    private void notifyPartiesAboutPrivateExamRejection(User user, Exam exam) {
        actor
            .scheduler()
            .scheduleOnce(
                Duration.create(1, TimeUnit.SECONDS),
                () -> {
                    emailComposer.composeInspectionReady(exam.getCreator(), user, exam);
                    logger.info("Inspection rejection notification email sent");
                },
                actor.dispatcher()
            );
    }

    private Double round(Double src) {
        return src == null ? null : Math.round(src * 100) / HUNDRED;
    }

    private static Query<ExamParticipation> createQuery() {
        return Ebean
            .find(ExamParticipation.class)
            .fetch(
                "exam",
                "state, name, additionalInfo, gradedTime, gradeless, assessmentInfo, subjectToLanguageInspection, answerLanguage, customCredit"
            )
            .fetch("exam.course")
            .fetch("exam.course.organisation")
            .fetch("exam.course.gradeScale")
            .fetch("exam.course.gradeScale.grades", new FetchConfig().query())
            .fetch("exam.parent")
            .fetch("exam.parent.creator")
            .fetch("exam.parent.gradeScale")
            .fetch("exam.parent.gradeScale.grades", new FetchConfig().query())
            .fetch("exam.parent.examOwners", new FetchConfig().query())
            .fetch("exam.parent.examFeedbackConfig")
            .fetch("exam.examEnrolments")
            .fetch("exam.examEnrolments.reservation")
            .fetch("exam.examEnrolments.reservation.machine")
            .fetch("exam.examEnrolments.reservation.machine.room")
            .fetch("exam.examEnrolments.examinationEventConfiguration")
            .fetch("exam.examEnrolments.examinationEventConfiguration.examinationEvent")
            .fetch("exam.examInspections")
            .fetch("exam.examInspections.user")
            .fetch("user", "firstName, lastName, email, userIdentifier")
            .fetch("exam.examType")
            .fetch("exam.executionType")
            .fetch("exam.examSections")
            .fetch(
                "exam.examSections.sectionQuestions",
                "sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType",
                new FetchConfig().query()
            )
            .fetch("exam.examSections.sectionQuestions.question", "id, type, question, shared")
            .fetch("exam.examSections.sectionQuestions.question.attachment", "fileName")
            .fetch("exam.examSections.sectionQuestions.options")
            .fetch("exam.examSections.sectionQuestions.options.option", "id, option, correctOption, claimChoiceType")
            .fetch("exam.examSections.sectionQuestions.essayAnswer", "id, answer, evaluatedScore")
            .fetch("exam.examSections.sectionQuestions.essayAnswer.attachment", "fileName")
            .fetch("exam.examSections.sectionQuestions.clozeTestAnswer", "id, question, answer, score")
            .fetch("exam.gradeScale")
            .fetch("exam.gradeScale.grades")
            .fetch("exam.grade")
            .fetch("exam.inspectionComments")
            .fetch("exam.inspectionComments.creator", "firstName, lastName, email")
            .fetch("exam.languageInspection")
            .fetch("exam.languageInspection.assignee", "firstName, lastName, email")
            .fetch("exam.languageInspection.statement")
            .fetch("exam.languageInspection.statement.attachment")
            .fetch("exam.examFeedback")
            .fetch("exam.examFeedback.attachment")
            .fetch("exam.creditType")
            .fetch("exam.attachment")
            .fetch("exam.examLanguages")
            .fetch("exam.examOwners");
    }
}
