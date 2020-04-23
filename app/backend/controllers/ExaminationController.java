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

import akka.actor.ActorSystem;
import backend.controllers.base.BaseController;
import backend.controllers.iop.transfer.api.ExternalAttachmentLoader;
import backend.impl.AutoEvaluationHandler;
import backend.impl.EmailComposer;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamInspection;
import backend.models.ExamParticipation;
import backend.models.ExamRoom;
import backend.models.GeneralSettings;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.models.questions.ClozeTestAnswer;
import backend.models.questions.EssayAnswer;
import backend.models.questions.Question;
import backend.models.sections.ExamSectionQuestion;
import backend.repository.ExaminationRepository;
import backend.sanitizers.Attrs;
import backend.sanitizers.ClozeTestAnswerSanitizer;
import backend.sanitizers.EssayAnswerSanitizer;
import backend.security.Authenticated;
import backend.system.interceptors.ExamActionRouter;
import backend.system.interceptors.SensitiveDataPolicy;
import backend.util.AppUtil;
import backend.util.config.ByodConfigHandler;
import backend.util.datetime.DateTimeUtils;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import io.ebean.Ebean;
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
import org.joda.time.DateTime;
import play.Environment;
import play.Logger;
import play.db.ebean.Transactional;
import play.libs.concurrent.HttpExecutionContext;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import scala.concurrent.duration.Duration;

@SensitiveDataPolicy(sensitiveFieldNames = { "score", "defaultScore", "correctOption", "configKey" })
public class ExaminationController extends BaseController {
    protected final EmailComposer emailComposer;
    protected final ExaminationRepository examinationRepository;
    protected final ActorSystem actor;
    protected final HttpExecutionContext httpExecutionContext;
    private final AutoEvaluationHandler autoEvaluationHandler;
    protected final Environment environment;
    private final ExternalAttachmentLoader externalAttachmentLoader;
    private final ByodConfigHandler byodConfigHandler;

    private static final Logger.ALogger logger = Logger.of(ExaminationController.class);

    @Inject
    public ExaminationController(
        EmailComposer emailComposer,
        ExaminationRepository examinationRepository,
        ActorSystem actor,
        AutoEvaluationHandler autoEvaluationHandler,
        Environment environment,
        HttpExecutionContext httpExecutionContext,
        ExternalAttachmentLoader externalAttachmentLoader,
        ByodConfigHandler byodConfigHandler
    ) {
        this.emailComposer = emailComposer;
        this.examinationRepository = examinationRepository;
        this.actor = actor;
        this.autoEvaluationHandler = autoEvaluationHandler;
        this.environment = environment;
        this.httpExecutionContext = httpExecutionContext;
        this.externalAttachmentLoader = externalAttachmentLoader;
        this.byodConfigHandler = byodConfigHandler;
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @ExamActionRouter
    public CompletionStage<Result> startExam(String hash, Http.Request request) throws IOException {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        PathProperties pp = getPath(false);
        CompletionStage<Optional<CollaborativeExam>> getCollaborativeExam = examinationRepository.getCollaborativeExam(
            hash
        );
        return getCollaborativeExam.thenComposeAsync(
            oce -> {
                CollaborativeExam ce = oce.orElse(null);
                CompletionStage<Optional<Exam>> getPrototype = examinationRepository.getPrototype(hash, ce, pp);
                CompletionStage<Optional<Exam>> getClone = examinationRepository.getPossibleClone(hash, user, ce, pp);
                return getPrototype.thenComposeAsync(
                    optionalPrototype ->
                        getClone.thenComposeAsync(
                            possibleClone -> {
                                if (optionalPrototype.isEmpty() && possibleClone.isEmpty()) {
                                    return wrapAsPromise(notFound());
                                }
                                if (possibleClone.isEmpty()) {
                                    // Exam not started yet, create new exam for student
                                    Exam prototype = optionalPrototype.get();
                                    CompletionStage<Optional<ExamEnrolment>> findEnrolment = examinationRepository.findEnrolment(
                                        user,
                                        prototype,
                                        ce
                                    );
                                    return findEnrolment.thenComposeAsync(
                                        optionalEnrolment -> {
                                            if (optionalEnrolment.isEmpty()) {
                                                return wrapAsPromise(forbidden());
                                            }
                                            ExamEnrolment enrolment = optionalEnrolment.get();
                                            CompletionStage<Optional<Result>> getEnrolmentError = getEnrolmentError(
                                                enrolment,
                                                request
                                            );
                                            return getEnrolmentError.thenComposeAsync(
                                                error -> {
                                                    if (error.isPresent()) {
                                                        return wrapAsPromise(error.get());
                                                    }
                                                    CompletionStage<Optional<Exam>> createExam = examinationRepository.createExam(
                                                        prototype,
                                                        user,
                                                        enrolment
                                                    );
                                                    return createExam.thenComposeAsync(
                                                        oe -> {
                                                            if (oe.isEmpty()) {
                                                                return CompletableFuture.completedFuture(
                                                                    internalServerError()
                                                                );
                                                            }
                                                            Exam newExam = oe.get();
                                                            if (enrolment.getCollaborativeExam() != null) {
                                                                try {
                                                                    externalAttachmentLoader
                                                                        .fetchExternalAttachmentsAsLocal(newExam)
                                                                        .get();
                                                                } catch (InterruptedException | ExecutionException e) {
                                                                    logger.error(
                                                                        "Could not fetch external attachments!",
                                                                        e
                                                                    );
                                                                }
                                                            }
                                                            newExam.setCloned(true);
                                                            newExam.setDerivedMaxScores();
                                                            processClozeTestQuestions(newExam);
                                                            return checkStudentSession(
                                                                request,
                                                                request.session(),
                                                                ok(newExam, getPath(false))
                                                            );
                                                        },
                                                        httpExecutionContext.current()
                                                    );
                                                },
                                                httpExecutionContext.current()
                                            );
                                        },
                                        httpExecutionContext.current()
                                    );
                                } else {
                                    // Exam started already
                                    CompletionStage<Optional<Result>> getEnrolmentError = getEnrolmentError(
                                        hash,
                                        request
                                    );
                                    return getEnrolmentError.thenComposeAsync(
                                        err -> {
                                            if (err.isPresent()) {
                                                return wrapAsPromise(err.get());
                                            }
                                            Exam clone = possibleClone.get();
                                            // sanity check
                                            if (clone.getState() != Exam.State.STUDENT_STARTED) {
                                                return wrapAsPromise(forbidden());
                                            }
                                            clone.setCloned(false);
                                            clone.setDerivedMaxScores();
                                            processClozeTestQuestions(clone);
                                            return checkStudentSession(
                                                request,
                                                request.session(),
                                                ok(clone, getPath(false))
                                            );
                                        }
                                    );
                                }
                            }
                        ),
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
        return getEnrolmentError(hash, request)
            .thenApplyAsync(
                oe ->
                    oe.orElseGet(
                        () -> {
                            User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                            Exam exam = Ebean
                                .find(Exam.class)
                                .fetch("examSections.sectionQuestions.question")
                                .where()
                                .eq("creator", user)
                                .eq("hash", hash)
                                .findOne();
                            if (exam == null) {
                                return notFound("sitnet_error_exam_not_found");
                            }
                            Optional<ExamParticipation> oep = findParticipation(exam, user);

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
                                return ok("Exam sent for review");
                            } else {
                                return ok("exam already returned");
                            }
                        }
                    )
            );
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @Transactional
    public CompletionStage<Result> abortExam(String hash, Http.Request request) {
        return getEnrolmentError(hash, request)
            .thenApplyAsync(
                oe ->
                    oe.orElseGet(
                        () -> {
                            User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                            Exam exam = Ebean.find(Exam.class).where().eq("creator", user).eq("hash", hash).findOne();
                            if (exam == null) {
                                return notFound("sitnet_error_exam_not_found");
                            }
                            Optional<ExamParticipation> oep = findParticipation(exam, user);

                            if (oep.isPresent()) {
                                setDurations(oep.get());
                                oep.get().save();
                                exam.setState(Exam.State.ABORTED);
                                exam.update();
                                if (exam.isPrivate()) {
                                    notifyTeachers(exam);
                                }
                                return ok("Exam aborted");
                            } else {
                                return forbidden("Exam already returned");
                            }
                        }
                    )
            );
    }

    @Authenticated
    @With(EssayAnswerSanitizer.class)
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> answerEssay(String hash, Long questionId, Http.Request request) {
        return getEnrolmentError(hash, request)
            .thenApplyAsync(
                oe ->
                    oe.orElseGet(
                        () -> {
                            String essayAnswer = request.attrs().getOptional(Attrs.ESSAY_ANSWER).orElse(null);
                            Optional<Long> objectVersion = request.attrs().getOptional(Attrs.OBJECT_VERSION);
                            ExamSectionQuestion question = Ebean.find(ExamSectionQuestion.class, questionId);
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
                        }
                    )
            );
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> answerMultiChoice(String hash, Long qid, Http.Request request) {
        return getEnrolmentError(hash, request)
            .thenApplyAsync(
                oe ->
                    oe.orElseGet(
                        () -> {
                            ArrayNode node = (ArrayNode) request.body().asJson().get("oids");
                            List<Long> optionIds = StreamSupport
                                .stream(node.spliterator(), false)
                                .map(JsonNode::asLong)
                                .collect(Collectors.toList());
                            ExamSectionQuestion question = Ebean.find(ExamSectionQuestion.class, qid);
                            if (question == null) {
                                return forbidden();
                            }
                            question
                                .getOptions()
                                .forEach(
                                    o -> {
                                        o.setAnswered(optionIds.contains(o.getId()));
                                        o.update();
                                    }
                                );
                            return ok();
                        }
                    )
            );
    }

    @Authenticated
    @With(ClozeTestAnswerSanitizer.class)
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> answerClozeTest(String hash, Long questionId, Http.Request request) {
        return getEnrolmentError(hash, request)
            .thenApplyAsync(
                oe ->
                    oe.orElseGet(
                        () -> {
                            ExamSectionQuestion esq = Ebean.find(ExamSectionQuestion.class, questionId);
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
                        }
                    )
            );
    }

    private Optional<ExamParticipation> findParticipation(Exam exam, User user) {
        return Ebean
            .find(ExamParticipation.class)
            .where()
            .eq("exam.id", exam.getId())
            .eq("user", user)
            .isNull("ended")
            .findOneOrEmpty();
    }

    private void setDurations(ExamParticipation ep) {
        DateTime now = ep.getReservation() == null
            ? DateTimeUtils.adjustDST(DateTime.now())
            : DateTimeUtils.adjustDST(DateTime.now(), ep.getReservation().getMachine().getRoom());
        ep.setEnded(now);
        ep.setDuration(new DateTime(ep.getEnded().getMillis() - ep.getStarted().getMillis()));
    }

    protected CompletionStage<Optional<Result>> getEnrolmentError(ExamEnrolment enrolment, Http.Request request) {
        // If this is null, it means someone is either trying to access an exam by wrong hash
        // or the reservation is not in effect right now.
        if (enrolment == null) {
            return CompletableFuture.completedFuture(Optional.of(forbidden("sitnet_reservation_not_found")));
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
            return CompletableFuture.completedFuture(Optional.of(forbidden("sitnet_reservation_not_found")));
        } else if (enrolment.getReservation().getMachine() == null) {
            return CompletableFuture.completedFuture(Optional.of(forbidden("sitnet_reservation_machine_not_found")));
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
                            "sitnet_wrong_exam_machine " +
                            room.getName() +
                            ", " +
                            room.getMailAddress().toString() +
                            ", sitnet_exam_machine " +
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
            "course(id, code, name), executionType(id, type), " + // (
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

    protected void processClozeTestQuestions(Exam exam) {
        Set<Question> questionsToHide = new HashSet<>();
        exam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getQuestion().getType() == Question.Type.ClozeTestQuestion)
            .forEach(
                esq -> {
                    ClozeTestAnswer answer = esq.getClozeTestAnswer();
                    if (answer == null) {
                        answer = new ClozeTestAnswer();
                    }
                    answer.setQuestion(esq);
                    esq.setClozeTestAnswer(answer);
                    esq.update();
                    questionsToHide.add(esq.getQuestion());
                }
            );
        questionsToHide.forEach(q -> q.setQuestion(null));
    }

    private CompletionStage<Optional<Result>> getEnrolmentError(String hash, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment = Ebean
            .find(ExamEnrolment.class)
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
                () -> AppUtil.notifyPrivateExamEnded(recipients, exam, emailComposer),
                actor.dispatcher()
            );
    }
}
