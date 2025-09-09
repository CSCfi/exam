// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.examination;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import controllers.admin.SettingsController;
import controllers.base.BaseController;
import controllers.iop.transfer.api.ExternalAttachmentLoader;
import impl.AutoEvaluationHandler;
import impl.mail.EmailComposer;
import io.ebean.DB;
import io.ebean.text.PathProperties;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import miscellaneous.config.ByodConfigHandler;
import miscellaneous.datetime.DateTimeHandler;
import models.admin.GeneralSettings;
import models.assessment.ExamInspection;
import models.enrolment.ExamEnrolment;
import models.enrolment.ExamParticipation;
import models.exam.Exam;
import models.facility.ExamRoom;
import models.iop.CollaborativeExam;
import models.questions.ClozeTestAnswer;
import models.questions.EssayAnswer;
import models.sections.ExamSectionQuestion;
import models.user.User;
import org.apache.pekko.actor.ActorSystem;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.Environment;
import play.db.ebean.Transactional;
import play.libs.concurrent.ClassLoaderExecutionContext;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import repository.ExaminationRepository;
import sanitizers.Attrs;
import sanitizers.ClozeTestAnswerSanitizer;
import sanitizers.EssayAnswerSanitizer;
import scala.concurrent.duration.Duration;
import security.Authenticated;
import system.interceptors.ExamActionRouter;
import system.interceptors.SensitiveDataPolicy;

@SensitiveDataPolicy(sensitiveFieldNames = { "score", "defaultScore", "correctOption", "claimChoiceType", "configKey" })
public class ExaminationController extends BaseController {

    protected final EmailComposer emailComposer;
    protected final ExaminationRepository examinationRepository;
    protected final ActorSystem actor;
    protected final ClassLoaderExecutionContext httpExecutionContext;
    private final AutoEvaluationHandler autoEvaluationHandler;
    protected final Environment environment;
    private final ExternalAttachmentLoader externalAttachmentLoader;
    private final ByodConfigHandler byodConfigHandler;
    protected final DateTimeHandler dateTimeHandler;

    private final Logger logger = LoggerFactory.getLogger(ExaminationController.class);

    @Inject
    public ExaminationController(
        EmailComposer emailComposer,
        ExaminationRepository examinationRepository,
        ActorSystem actor,
        AutoEvaluationHandler autoEvaluationHandler,
        Environment environment,
        ClassLoaderExecutionContext httpExecutionContext,
        ExternalAttachmentLoader externalAttachmentLoader,
        ByodConfigHandler byodConfigHandler,
        DateTimeHandler dateTimeHandler
    ) {
        this.emailComposer = emailComposer;
        this.examinationRepository = examinationRepository;
        this.actor = actor;
        this.autoEvaluationHandler = autoEvaluationHandler;
        this.environment = environment;
        this.httpExecutionContext = httpExecutionContext;
        this.externalAttachmentLoader = externalAttachmentLoader;
        this.byodConfigHandler = byodConfigHandler;
        this.dateTimeHandler = dateTimeHandler;
    }

    private Result postProcessClone(ExamEnrolment enrolment, Optional<Exam> oe) {
        if (oe.isEmpty()) {
            return internalServerError();
        }
        Exam newExam = oe.get();
        if (enrolment.getCollaborativeExam() != null) {
            try {
                externalAttachmentLoader.fetchExternalAttachmentsAsLocal(newExam).get();
            } catch (InterruptedException | ExecutionException e) {
                logger.error("Could not fetch external attachments!", e);
            }
        }
        newExam.setCloned(true);
        newExam.setDerivedMaxScores();
        examinationRepository.processClozeTestQuestions(newExam);
        return ok(newExam, getPath(false));
    }

    private CompletionStage<Result> postProcessExisting(
        Exam clone,
        User user,
        CollaborativeExam ce,
        Http.Request request
    ) {
        // sanity check
        if (!clone.hasState(Exam.State.INITIALIZED, Exam.State.STUDENT_STARTED)) {
            return wrapAsPromise(forbidden());
        }
        return examinationRepository
            .findEnrolment(user, clone, ce, false)
            .thenComposeAsync(
                optionalEnrolment -> {
                    if (optionalEnrolment.isEmpty()) {
                        return wrapAsPromise(forbidden());
                    }
                    ExamEnrolment enrolment = optionalEnrolment.get();
                    return getEnrolmentError(
                        // allow state = initialized
                        enrolment,
                        request
                    ).thenComposeAsync(
                            error -> {
                                if (error.isPresent()) {
                                    return wrapAsPromise(error.get());
                                }
                                return examinationRepository
                                    .createFinalExam(clone, user, enrolment)
                                    .thenComposeAsync(
                                        e -> wrapAsPromise(ok(e, getPath(false))),
                                        httpExecutionContext.current()
                                    );
                            },
                            httpExecutionContext.current()
                        );
                },
                httpExecutionContext.current()
            );
    }

    private CompletionStage<Result> createClone(
        Exam prototype,
        User user,
        CollaborativeExam ce,
        Http.Request request,
        boolean isInitialization
    ) {
        return examinationRepository
            .findEnrolment(user, prototype, ce, isInitialization)
            .thenComposeAsync(
                optionalEnrolment -> {
                    if (optionalEnrolment.isEmpty()) {
                        return wrapAsPromise(forbidden());
                    }
                    ExamEnrolment enrolment = optionalEnrolment.get();
                    return getEnrolmentError(
                        // allow state = initialized
                        enrolment,
                        request
                    ).thenComposeAsync(
                            error -> {
                                if (error.isPresent()) {
                                    return wrapAsPromise(error.get());
                                }
                                return examinationRepository
                                    .createExam(prototype, user, enrolment)
                                    .thenApplyAsync(
                                        oe -> postProcessClone(enrolment, oe),
                                        httpExecutionContext.current()
                                    );
                            },
                            httpExecutionContext.current()
                        );
                },
                httpExecutionContext.current()
            );
    }

    private CompletionStage<Result> prepareExam(CollaborativeExam ce, String hash, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        PathProperties pp = getPath(false);
        return examinationRepository
            .getPrototype(hash, ce, pp)
            .thenComposeAsync(
                optionalPrototype ->
                    examinationRepository
                        .getPossibleClone(hash, user, ce, pp)
                        .thenComposeAsync(
                            possibleClone -> {
                                if (optionalPrototype.isEmpty() && possibleClone.isEmpty()) {
                                    return wrapAsPromise(notFound());
                                }
                                if (possibleClone.isEmpty()) {
                                    // Exam not started yet, create new exam for student
                                    return createClone(optionalPrototype.get(), user, ce, request, false);
                                } else {
                                    // Exam started already
                                    return postProcessExisting(possibleClone.get(), user, ce, request);
                                }
                            },
                            httpExecutionContext.current()
                        ),
                httpExecutionContext.current()
            );
    }

    private CompletionStage<Result> prepareExam(String hash, Http.Request request) {
        return examinationRepository
            .getCollaborativeExam(hash)
            .thenComposeAsync(oce -> prepareExam(oce.orElse(null), hash, request), httpExecutionContext.current());
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @ExamActionRouter
    public CompletionStage<Result> startExam(String hash, Http.Request request) throws IOException {
        return prepareExam(hash, request);
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @ExamActionRouter
    public CompletionStage<Result> initializeExam(String hash, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        PathProperties pp = getPath(false);
        return examinationRepository
            .getCollaborativeExam(hash)
            .thenComposeAsync(
                oce -> {
                    CollaborativeExam ce = oce.orElse(null);
                    return examinationRepository
                        .getPrototype(hash, ce, pp)
                        .thenComposeAsync(
                            oe -> {
                                if (oe.isEmpty()) {
                                    return wrapAsPromise(ok()); // check
                                }
                                return examinationRepository
                                    .getPossibleClone(hash, user, ce, pp)
                                    .thenComposeAsync(
                                        pc -> {
                                            if (pc.isPresent()) return wrapAsPromise(ok());
                                            else {
                                                return createClone(oe.get(), user, ce, request, true);
                                            }
                                        },
                                        httpExecutionContext.current()
                                    );
                            },
                            httpExecutionContext.current()
                        );
                },
                httpExecutionContext.current()
            );
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @Transactional
    public CompletionStage<Result> turnExam(String hash, Http.Request request) {
        return getEnrolmentError(hash, request).thenApplyAsync(oe ->
                oe.orElseGet(() -> {
                    User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                    Exam exam = DB.find(Exam.class)
                        .fetch("examSections.sectionQuestions.question")
                        .where()
                        .eq("creator", user)
                        .eq("hash", hash)
                        .findOne();
                    if (exam == null) {
                        return notFound("i18n_error_exam_not_found");
                    }
                    Optional<ExamParticipation> oep = findParticipation(exam, user);
                    Http.Session session = request.session().removing("ongoingExamHash");
                    if (oep.isPresent()) {
                        ExamParticipation ep = oep.get();
                        setDurations(ep);

                        GeneralSettings settings = SettingsController.getOrCreateSettings(
                            "review_deadline",
                            null,
                            "14"
                        );
                        int deadlineDays = Integer.parseInt(settings.getValue());
                        DateTime deadline = ep.getEnded().plusDays(deadlineDays);
                        ep.setDeadline(deadline);
                        ep.save();
                        exam.setState(Exam.State.REVIEW);
                        exam.update();
                        if (exam.isPrivate()) {
                            notifyTeachers(exam);
                        }
                        autoEvaluationHandler.autoEvaluate(exam);
                    }
                    return ok().withSession(session);
                })
            );
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @Transactional
    public CompletionStage<Result> abortExam(String hash, Http.Request request) {
        return getEnrolmentError(hash, request).thenApplyAsync(oe ->
                oe.orElseGet(() -> {
                    User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                    Exam exam = DB.find(Exam.class).where().eq("creator", user).eq("hash", hash).findOne();
                    if (exam == null) {
                        return notFound("i18n_error_exam_not_found");
                    }
                    Optional<ExamParticipation> oep = findParticipation(exam, user);
                    Http.Session session = request.session().removing("ongoingExamHash");
                    if (oep.isPresent()) {
                        setDurations(oep.get());
                        oep.get().save();
                        exam.setState(Exam.State.ABORTED);
                        exam.update();
                        if (exam.isPrivate()) {
                            notifyTeachers(exam);
                        }
                        return ok().withSession(session);
                    } else {
                        return forbidden().withSession(session);
                    }
                })
            );
    }

    @Authenticated
    @With(EssayAnswerSanitizer.class)
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> answerEssay(String hash, Long questionId, Http.Request request) {
        return getEnrolmentError(hash, request).thenApplyAsync(oe ->
                oe.orElseGet(() -> {
                    String essayAnswer = request.attrs().getOptional(Attrs.ESSAY_ANSWER).orElse(null);
                    Optional<Long> objectVersion = request.attrs().getOptional(Attrs.OBJECT_VERSION);
                    ExamSectionQuestion question = DB.find(ExamSectionQuestion.class, questionId);
                    if (question == null) {
                        return forbidden();
                    }
                    EssayAnswer answer = question.getEssayAnswer();
                    if (answer == null) {
                        answer = new EssayAnswer();
                    } else if (objectVersion.isPresent()) {
                        answer.setObjectVersion(objectVersion.get());
                    }
                    answer.setAnswer(essayAnswer);
                    answer.save();
                    question.setEssayAnswer(answer);
                    question.save();
                    return ok(answer);
                })
            );
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> answerMultiChoice(String hash, Long qid, Http.Request request) {
        return getEnrolmentError(hash, request).thenApplyAsync(oe ->
                oe.orElseGet(() -> {
                    ArrayNode node = (ArrayNode) request.body().asJson().get("oids");
                    List<Long> optionIds = StreamSupport.stream(node.spliterator(), false)
                        .map(JsonNode::asLong)
                        .toList();
                    ExamSectionQuestion question = DB.find(ExamSectionQuestion.class, qid);
                    if (question == null) {
                        return forbidden();
                    }
                    question
                        .getOptions()
                        .forEach(o -> {
                            o.setAnswered(optionIds.contains(o.getId()));
                            o.update();
                        });
                    return ok();
                })
            );
    }

    @Authenticated
    @With(ClozeTestAnswerSanitizer.class)
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> answerClozeTest(String hash, Long questionId, Http.Request request) {
        return getEnrolmentError(hash, request).thenApplyAsync(oe ->
                oe.orElseGet(() -> {
                    ExamSectionQuestion esq = DB.find(ExamSectionQuestion.class, questionId);
                    if (esq == null) {
                        return forbidden();
                    }
                    ClozeTestAnswer answer = esq.getClozeTestAnswer();
                    if (answer == null) {
                        answer = new ClozeTestAnswer();
                    } else {
                        long objectVersion = request.attrs().get(Attrs.OBJECT_VERSION);
                        answer.setObjectVersion(objectVersion);
                    }
                    answer.setAnswer(request.attrs().getOptional(Attrs.ESSAY_ANSWER).orElse(null));
                    answer.save();
                    return ok(answer, PathProperties.parse("(id, objectVersion, answer)"));
                })
            );
    }

    private Optional<ExamParticipation> findParticipation(Exam exam, User user) {
        return DB.find(ExamParticipation.class)
            .where()
            .eq("exam.id", exam.getId())
            .eq("user", user)
            .isNull("ended")
            .findOneOrEmpty();
    }

    private void setDurations(ExamParticipation ep) {
        DateTime now;
        if (ep.getExam().getImplementation() != Exam.Implementation.AQUARIUM) {
            now = DateTime.now();
        } else {
            now = ep.getReservation() == null
                ? dateTimeHandler.adjustDST(DateTime.now())
                : dateTimeHandler.adjustDST(DateTime.now(), ep.getReservation().getMachine().getRoom());
        }
        ep.setEnded(now);
        ep.setDuration(new DateTime(ep.getEnded().getMillis() - ep.getStarted().getMillis()));
    }

    protected CompletionStage<Optional<Result>> getEnrolmentError(ExamEnrolment enrolment, Http.Request request) {
        // If this is null, it means someone is either trying to access an exam by wrong hash
        // or the reservation is not in effect right now.
        if (enrolment == null) {
            return CompletableFuture.completedFuture(Optional.of(forbidden("i18n_reservation_not_found")));
        }
        Exam exam = enrolment.getExam();
        boolean isByod = exam != null && exam.getImplementation() == Exam.Implementation.CLIENT_AUTH;
        boolean isUnchecked = exam != null && exam.getImplementation() == Exam.Implementation.WHATEVER;
        if (isByod) {
            return CompletableFuture.completedFuture(
                byodConfigHandler.checkUserAgent(request, enrolment.getExaminationEventConfiguration().getConfigKey())
            );
        } else if (isUnchecked) {
            return CompletableFuture.completedFuture(Optional.empty());
        } else if (enrolment.getReservation() == null) {
            return CompletableFuture.completedFuture(Optional.of(forbidden("i18n_reservation_not_found")));
        } else if (enrolment.getReservation().getMachine() == null) {
            return CompletableFuture.completedFuture(Optional.of(forbidden("i18n_reservation_machine_not_found")));
        } else if (
            !environment.isDev() &&
            !enrolment.getReservation().getMachine().getIpAddress().equals(request.remoteAddress())
        ) {
            return examinationRepository
                .findRoom(enrolment)
                .thenApplyAsync(
                    or -> {
                        if (or.isEmpty()) {
                            return Optional.of(notFound());
                        }
                        ExamRoom room = or.get();
                        String message =
                            "i18n_wrong_exam_machine " +
                            room.getName() +
                            ", " +
                            room.getMailAddress().toString() +
                            ", i18n_exam_machine " +
                            enrolment.getReservation().getMachine().getName();
                        return Optional.of(forbidden(message));
                    },
                    httpExecutionContext.current()
                );
        }
        return CompletableFuture.completedFuture(Optional.empty());
    }

    public static PathProperties getPath(boolean includeEnrolment) {
        String path =
            "(id, name, state, instruction, hash, duration, cloned, external, implementation, " +
            "course(id, code, name), examType(id, type), executionType(id, type), " + // (
            "examParticipation(id), " + //
            "examLanguages(code), attachment(fileName), examOwners(firstName, lastName)" +
            "examInspections(*, user(id, firstName, lastName))" +
            "examSections(id, name, sequenceNumber, description, lotteryOn, lotteryItemCount," + // ((
            "examMaterials(name, author, isbn), " +
            "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, derivedMinScore, " + // (((
            "question(id, type, question, attachment(id, fileName))" +
            "options(id, answered, option(id, option))" +
            "essayAnswer(id, answer, objectVersion, attachment(fileName))" +
            "clozeTestAnswer(id, question, answer, objectVersion)" +
            ")))";
        return PathProperties.parse(includeEnrolment ? String.format("(exam%s)", path) : path);
    }

    private CompletionStage<Optional<Result>> getEnrolmentError(String hash, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment = DB.find(ExamEnrolment.class)
            .where()
            .eq("exam.hash", hash)
            .eq("exam.creator", user)
            .eq("exam.state", Exam.State.STUDENT_STARTED)
            .findOne();
        return getEnrolmentError(enrolment, request);
    }

    private void notifyTeachers(Exam exam) {
        Set<User> recipients = new HashSet<>();
        recipients.addAll(exam.getParent().getExamOwners());
        recipients.addAll(exam.getExamInspections().stream().map(ExamInspection::getUser).collect(Collectors.toSet()));
        actor
            .scheduler()
            .scheduleOnce(
                Duration.create(1, TimeUnit.SECONDS),
                () -> {
                    recipients.forEach(r -> {
                        emailComposer.composePrivateExamEnded(r, exam);
                        logger.info("Email sent to {}", r.getEmail());
                    });
                },
                actor.dispatcher()
            );
    }
}
