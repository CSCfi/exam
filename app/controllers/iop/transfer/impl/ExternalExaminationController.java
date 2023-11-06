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

package controllers.iop.transfer.impl;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import controllers.ExaminationController;
import controllers.iop.transfer.api.ExternalAttachmentLoader;
import impl.AutoEvaluationHandler;
import impl.EmailComposer;
import io.ebean.DB;
import io.ebean.text.PathProperties;
import io.vavr.Tuple;
import io.vavr.Tuple2;
import io.vavr.control.Either;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import models.Exam;
import models.ExamEnrolment;
import models.User;
import models.json.ExternalExam;
import models.questions.ClozeTestAnswer;
import models.questions.EssayAnswer;
import models.questions.Question;
import models.sections.ExamSectionQuestion;
import org.apache.pekko.actor.ActorSystem;
import org.joda.time.DateTime;
import play.Environment;
import play.libs.concurrent.ClassLoaderExecutionContext;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import repository.ExaminationRepository;
import sanitizers.Attrs;
import sanitizers.EssayAnswerSanitizer;
import security.Authenticated;
import system.interceptors.SensitiveDataPolicy;
import util.config.ByodConfigHandler;
import util.datetime.DateTimeHandler;

@SensitiveDataPolicy(sensitiveFieldNames = { "score", "defaultScore", "correctOption", "configKey" })
@Restrict({ @Group("STUDENT") })
public class ExternalExaminationController extends ExaminationController {

    @Inject
    public ExternalExaminationController(
        EmailComposer emailComposer,
        ActorSystem actor,
        ExaminationRepository examinationRepository,
        AutoEvaluationHandler autoEvaluationHandler,
        Environment environment,
        ClassLoaderExecutionContext httpExecutionContext,
        ExternalAttachmentLoader externalAttachmentLoader,
        ByodConfigHandler byodConfigHandler,
        DateTimeHandler dateTimeHandler
    ) {
        super(
            emailComposer,
            examinationRepository,
            actor,
            autoEvaluationHandler,
            environment,
            httpExecutionContext,
            externalAttachmentLoader,
            byodConfigHandler,
            dateTimeHandler
        );
    }

    @Authenticated
    @Override
    public CompletionStage<Result> startExam(String hash, Http.Request request) throws IOException {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Optional<ExternalExam> optional = getExternalExam(hash, user);
        if (optional.isEmpty()) {
            return wrapAsPromise(forbidden());
        }
        ExternalExam externalExam = optional.get();
        Optional<ExamEnrolment> optionalEnrolment = getEnrolment(user, externalExam);
        if (optionalEnrolment.isEmpty()) {
            return wrapAsPromise(forbidden());
        }
        ExamEnrolment enrolment = optionalEnrolment.get();
        Exam newExam = externalExam.deserialize();
        return getEnrolmentError(enrolment, request)
            .thenApplyAsync(error -> {
                if (error.isPresent()) {
                    return error.get();
                }
                if (newExam.getState().equals(Exam.State.PUBLISHED)) {
                    newExam.setState(Exam.State.STUDENT_STARTED);
                    try {
                        externalExam.serialize(newExam);
                    } catch (IOException e) {
                        return internalServerError();
                    }
                    DateTime now = dateTimeHandler.adjustDST(
                        DateTime.now(),
                        enrolment.getReservation().getMachine().getRoom()
                    );
                    externalExam.setStarted(now);
                    externalExam.update();
                }
                newExam.setCloned(false);
                newExam.setExternal(true);
                newExam.setDerivedMaxScores();
                processClozeTestQuestions(newExam);
                return ok(newExam, getPath(false));
            });
    }

    private void processClozeTestQuestions(Exam exam) {
        Set<Question> questionsToHide = new HashSet<>();
        exam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getQuestion().getType() == Question.Type.ClozeTestQuestion)
            .forEach(esq -> {
                ClozeTestAnswer answer = esq.getClozeTestAnswer();
                if (answer == null) {
                    answer = new ClozeTestAnswer();
                }
                answer.setQuestion(esq);
                esq.setClozeTestAnswer(answer);
                questionsToHide.add(esq.getQuestion());
            });
        questionsToHide.forEach(q -> q.setQuestion(null));
    }

    @Authenticated
    @Override
    public CompletionStage<Result> turnExam(String hash, Http.Request request) {
        return CompletableFuture.completedFuture(
            terminateExam(hash, Exam.State.REVIEW, request.attrs().get(Attrs.AUTHENTICATED_USER))
        );
    }

    @Authenticated
    @Override
    public CompletionStage<Result> abortExam(String hash, Http.Request request) {
        return CompletableFuture.completedFuture(
            terminateExam(hash, Exam.State.ABORTED, request.attrs().get(Attrs.AUTHENTICATED_USER))
        );
    }

    @Authenticated
    @Override
    public CompletionStage<Result> answerMultiChoice(String hash, Long qid, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return getEnrolmentError(hash, user, request)
            .thenApplyAsync(err ->
                err.orElseGet(() -> {
                    Optional<ExternalExam> optional = getExternalExam(hash, user);
                    if (optional.isEmpty()) {
                        return forbidden();
                    }
                    ExternalExam ee = optional.get();
                    ArrayNode node = (ArrayNode) request.body().asJson().get("oids");
                    List<Long> optionIds = StreamSupport
                        .stream(node.spliterator(), false)
                        .map(JsonNode::asLong)
                        .toList();
                    return findSectionQuestion(ee, qid)
                        .map(t -> processOptions(optionIds, t._2, ee, t._1))
                        .getOrElseGet(Function.identity());
                })
            );
    }

    @Authenticated
    @With(EssayAnswerSanitizer.class)
    @Override
    public CompletionStage<Result> answerEssay(String hash, Long qid, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return getEnrolmentError(hash, user, request)
            .thenApplyAsync(err ->
                err.orElseGet(() -> {
                    Optional<ExternalExam> optional = getExternalExam(hash, user);
                    if (optional.isEmpty()) {
                        return forbidden();
                    }
                    ExternalExam ee = optional.get();
                    String essayAnswer = request.attrs().getOptional(Attrs.ESSAY_ANSWER).orElse(null);
                    Optional<Long> objectVersion = request.attrs().getOptional(Attrs.OBJECT_VERSION);
                    Optional<ExamSectionQuestion> optionalQuestion;
                    Exam content;
                    try {
                        content = ee.deserialize();
                        optionalQuestion = findQuestion(qid, content);
                    } catch (IOException e) {
                        return internalServerError();
                    }
                    if (optionalQuestion.isEmpty()) {
                        return forbidden();
                    }
                    ExamSectionQuestion question = optionalQuestion.get();
                    EssayAnswer answer = question.getEssayAnswer();
                    if (answer == null) {
                        answer = new EssayAnswer();
                    } else if (objectVersion.isPresent()) {
                        if (answer.getObjectVersion() > objectVersion.get()) {
                            // Optimistic locking problem
                            return forbidden("sitnet_error_data_has_changed");
                        }
                        answer.setObjectVersion(objectVersion.get() + 1);
                    }
                    answer.setAnswer(essayAnswer);
                    question.setEssayAnswer(answer);
                    try {
                        ee.serialize(content);
                    } catch (IOException e) {
                        return internalServerError();
                    }
                    return ok(answer);
                })
            );
    }

    private Either<Result, Tuple2<Exam, ExamSectionQuestion>> findSectionQuestion(ExternalExam ee, Long qid) {
        Optional<ExamSectionQuestion> optionalQuestion;
        Exam content;
        try {
            content = ee.deserialize();
            optionalQuestion = findQuestion(qid, content);
        } catch (IOException e) {
            return Either.left(internalServerError());
        }
        return optionalQuestion
            .<Either<Result, Tuple2<Exam, ExamSectionQuestion>>>map(examSectionQuestion ->
                Either.right(Tuple.of(content, examSectionQuestion))
            )
            .orElseGet(() -> Either.left(forbidden()));
    }

    @Authenticated
    @With(EssayAnswerSanitizer.class)
    @Override
    public CompletionStage<Result> answerClozeTest(String hash, Long qid, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return getEnrolmentError(hash, user, request)
            .thenApplyAsync(err ->
                err.orElseGet(() -> {
                    Optional<ExternalExam> optional = getExternalExam(hash, user);
                    if (optional.isEmpty()) {
                        return forbidden();
                    }
                    ExternalExam ee = optional.get();
                    return findSectionQuestion(ee, qid)
                        .map(t -> {
                            ExamSectionQuestion esq = t._2;
                            ClozeTestAnswer answer = esq.getClozeTestAnswer();
                            if (answer == null) {
                                answer = new ClozeTestAnswer();
                                esq.setClozeTestAnswer(answer);
                            } else {
                                long objectVersion = request.attrs().get(Attrs.OBJECT_VERSION);
                                if (answer.getObjectVersion() > objectVersion) {
                                    // Optimistic locking problem
                                    return forbidden("sitnet_error_data_has_changed");
                                }
                                answer.setObjectVersion(objectVersion + 1);
                            }
                            answer.setAnswer(request.attrs().getOptional(Attrs.ESSAY_ANSWER).orElse(null));
                            try {
                                ee.serialize(t._1);
                            } catch (IOException e) {
                                return internalServerError();
                            }
                            return ok(answer, PathProperties.parse("(id, objectVersion, answer)"));
                        })
                        .getOrElseGet(Function.identity());
                })
            );
    }

    private Optional<ExamSectionQuestion> findQuestion(Long qid, Exam content) {
        return content
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getId().equals(qid))
            .findFirst();
    }

    private Result processOptions(List<Long> oids, ExamSectionQuestion esq, ExternalExam ee, Exam content) {
        esq.getOptions().forEach(o -> o.setAnswered(oids.contains(o.getId())));
        try {
            ee.serialize(content);
        } catch (IOException e) {
            return internalServerError();
        }
        return ok();
    }

    private Optional<ExternalExam> getExternalExam(String hash, User user) {
        return DB.find(ExternalExam.class).where().eq("hash", hash).eq("creator", user).forUpdate().findOneOrEmpty();
    }

    private Optional<ExamEnrolment> getEnrolment(User user, ExternalExam prototype) {
        DateTime now = dateTimeHandler.adjustDST(DateTime.now());
        ExamEnrolment enrolment = DB
            .find(ExamEnrolment.class)
            .fetch("reservation")
            .fetch("reservation.machine")
            .fetch("reservation.machine.room")
            .where()
            .eq("user.id", user.getId())
            .eq("externalExam.hash", prototype.getHash())
            .le("reservation.startAt", now.toDate())
            .gt("reservation.endAt", now.toDate())
            .eq("reservation.externalUserRef", user.getEppn())
            .findOne();
        return Optional.ofNullable(enrolment);
    }

    private CompletionStage<Optional<Result>> getEnrolmentError(String hash, User user, Http.Request request) {
        ExamEnrolment enrolment = DB
            .find(ExamEnrolment.class)
            .where()
            .eq("externalExam.hash", hash)
            .eq("externalExam.creator", user)
            .jsonEqualTo("externalExam.content", "state", Exam.State.STUDENT_STARTED.toString())
            .findOne();
        return getEnrolmentError(enrolment, request);
    }

    private Result terminateExam(String hash, Exam.State newState, User user) {
        ExternalExam ee = DB.find(ExternalExam.class).where().eq("hash", hash).eq("creator", user).findOne();
        if (ee == null) {
            return forbidden();
        }
        Optional<ExamEnrolment> optionalEnrolment = getEnrolment(user, ee);
        if (optionalEnrolment.isEmpty()) {
            return forbidden();
        }
        ExamEnrolment enrolment = optionalEnrolment.get();
        DateTime now = dateTimeHandler.adjustDST(DateTime.now(), enrolment.getReservation().getMachine().getRoom());
        ee.setFinished(now);
        try {
            Exam content = ee.deserialize();
            if (content.getState().equals(Exam.State.STUDENT_STARTED)) {
                content.setState(newState);
            }
            ee.serialize(content);
        } catch (IOException e) {
            return internalServerError();
        }
        return ok();
    }
}
