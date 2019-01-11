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

package backend.controllers.iop.transfer.impl;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.inject.Inject;

import akka.actor.ActorSystem;
import backend.controllers.iop.transfer.api.ExternalAttachmentLoader;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import io.ebean.Ebean;
import io.ebean.text.PathProperties;
import org.joda.time.DateTime;
import play.Environment;
import play.data.DynamicForm;
import play.mvc.Result;
import play.mvc.Results;

import backend.controllers.StudentExamController;
import backend.controllers.base.ActionMethod;
import backend.controllers.iop.collaboration.api.CollaborativeExamLoader;
import backend.impl.AutoEvaluationHandler;
import backend.impl.EmailComposer;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.sections.ExamSectionQuestion;
import backend.models.User;
import backend.models.json.ExternalExam;
import backend.models.questions.ClozeTestAnswer;
import backend.models.questions.EssayAnswer;
import backend.models.questions.Question;
import backend.system.interceptors.SensitiveDataPolicy;
import backend.util.datetime.DateTimeUtils;

@SensitiveDataPolicy(sensitiveFieldNames = {"score", "defaultScore", "correctOption"})
@Restrict({@Group("STUDENT")})
public class ExternalStudentExamController extends StudentExamController {

    @Inject
    public ExternalStudentExamController(EmailComposer emailComposer, ActorSystem actor,
                                         CollaborativeExamLoader collaborativeExamLoader,
                                         AutoEvaluationHandler autoEvaluationHandler, Environment environment,
                                         ExternalAttachmentLoader externalAttachmentLoader) {
        super(emailComposer, actor, collaborativeExamLoader, autoEvaluationHandler, environment, externalAttachmentLoader);
    }

    @ActionMethod
    @Override
    public CompletionStage<Result> startExam(String hash) throws IOException {
        User user = getLoggedUser();
        Optional<ExternalExam> optional = getExternalExam(hash, user);
        if (!optional.isPresent()) {
            return wrapAsPromise(forbidden());
        }
        ExternalExam externalExam = optional.get();
        Optional<ExamEnrolment> optionalEnrolment = getEnrolment(user, externalExam);
        if (!optionalEnrolment.isPresent()) {
            return wrapAsPromise(forbidden());
        }
        ExamEnrolment enrolment = optionalEnrolment.get();
        Exam newExam = externalExam.deserialize();
        Optional<Result> error = getEnrolmentError(enrolment, request().remoteAddress());
        if (error.isPresent()) {
            return wrapAsPromise(error.get());
        }
        if (newExam.getState().equals(Exam.State.PUBLISHED)) {
            newExam.setState(Exam.State.STUDENT_STARTED);
            try {
                externalExam.serialize(newExam);
            } catch (IOException e) {
                return wrapAsPromise(internalServerError());
            }
            DateTime now = DateTimeUtils.adjustDST(DateTime.now(), enrolment.getReservation().getMachine().getRoom());
            externalExam.setStarted(now);
            externalExam.update();
        }
        newExam.setCloned(false);
        newExam.setExternal(true);
        newExam.setDerivedMaxScores();
        processClozeTestQuestions(newExam);
        return wrapAsPromise(ok(newExam, getPath(false)));
    }

    @Override
    protected void processClozeTestQuestions(Exam exam) {
        Set<Question> questionsToHide = new HashSet<>();
        exam.getExamSections().stream()
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

    @ActionMethod
    @Override
    public Result turnExam(String hash) {
        return terminateExam(hash, Exam.State.REVIEW);
    }

    @ActionMethod
    @Override
    public Result abortExam(String hash) {
        return terminateExam(hash, Exam.State.ABORTED);
    }

    @ActionMethod
    @Override
    public Result answerMultiChoice(String hash, Long qid) {
        User user = getLoggedUser();
        return getEnrolmentError(hash, user).orElseGet(() -> {
            Optional<ExternalExam> optional = getExternalExam(hash, user);
            if (!optional.isPresent()) {
                return forbidden();
            }
            ExternalExam ee = optional.get();
            ArrayNode node = (ArrayNode) request().body().asJson().get("oids");
            List<Long> optionIds = StreamSupport.stream(node.spliterator(), false)
                    .map(JsonNode::asLong)
                    .collect(Collectors.toList());
            Optional<ExamSectionQuestion> question;
            Exam content;
            try {
                content = ee.deserialize();
                question = findQuestion(qid, content);
            } catch (IOException e) {
                return internalServerError();
            }
            return question
                    .map(q -> processOptions(optionIds, q, ee, content))
                    .orElseGet(Results::forbidden);
        });
    }

    @ActionMethod
    @Override
    public Result answerEssay(String hash, Long qid) {
        User user = getLoggedUser();
        return getEnrolmentError(hash, user).orElseGet(() -> {
            Optional<ExternalExam> optional = getExternalExam(hash, user);
            if (!optional.isPresent()) {
                return forbidden();
            }
            ExternalExam ee = optional.get();
            DynamicForm df = formFactory.form().bindFromRequest();
            String essayAnswer = df.get("answer");

            Optional<ExamSectionQuestion> optionalQuestion;
            Exam content;
            try {
                content = ee.deserialize();
                optionalQuestion = findQuestion(qid, content);
            } catch (IOException e) {
                return internalServerError();
            }
            if (!optionalQuestion.isPresent()) {
                return forbidden();
            }
            ExamSectionQuestion question = optionalQuestion.get();
            EssayAnswer answer = question.getEssayAnswer();
            if (answer == null) {
                answer = new EssayAnswer();
            } else if (df.get("objectVersion") != null) {
                long objectVersion = Long.parseLong(df.get("objectVersion"));
                if (answer.getObjectVersion() > objectVersion) {
                    // Optimistic locking problem
                    return forbidden("sitnet_error_data_has_changed");
                }
                answer.setObjectVersion(objectVersion + 1);
            }
            answer.setAnswer(essayAnswer);
            question.setEssayAnswer(answer);
            try {
                ee.serialize(content);
            } catch (IOException e) {
                return internalServerError();
            }
            return ok(answer);
        });
    }

    @ActionMethod
    @Override
    public Result answerClozeTest(String hash, Long qid) {
        User user = getLoggedUser();
        return getEnrolmentError(hash, user).orElseGet(() -> {
            Optional<ExternalExam> optional = getExternalExam(hash, user);
            if (!optional.isPresent()) {
                return forbidden();
            }
            ExternalExam ee = optional.get();
            Optional<ExamSectionQuestion> optionalQuestion;
            Exam content;
            try {
                content = ee.deserialize();
                optionalQuestion = findQuestion(qid, content);
            } catch (IOException e) {
                return internalServerError();
            }
            if (!optionalQuestion.isPresent()) {
                return forbidden();
            }
            ExamSectionQuestion esq = optionalQuestion.get();
            JsonNode node = request().body().asJson();
            ClozeTestAnswer answer = esq.getClozeTestAnswer();
            if (answer == null) {
                answer = new ClozeTestAnswer();
                esq.setClozeTestAnswer(answer);
            } else {
                long objectVersion = node.get("objectVersion").asLong();
                if (answer.getObjectVersion() > objectVersion) {
                    // Optimistic locking problem
                    return forbidden("sitnet_error_data_has_changed");
                }
                answer.setObjectVersion(objectVersion + 1);
            }
            answer.setAnswer(node.get("answer").toString());
            try {
                ee.serialize(content);

            } catch (IOException e) {
                return internalServerError();
            }
            return ok(answer, PathProperties.parse("(id, objectVersion, answer)"));
        });
    }

    private Optional<ExamSectionQuestion> findQuestion(Long qid, Exam content) throws IOException {
        return content.getExamSections().stream()
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
        return Ebean.find(ExternalExam.class).where()
                .eq("hash", hash)
                .eq("creator", user)
                .forUpdate()
                .findOneOrEmpty();
    }

    private Optional<ExamEnrolment> getEnrolment(User user, ExternalExam prototype) {
        DateTime now = DateTimeUtils.adjustDST(DateTime.now());
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
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

    private Optional<Result> getEnrolmentError(String hash, User user) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                .eq("externalExam.hash", hash)
                .eq("externalExam.creator", user)
                .jsonEqualTo("externalExam.content", "state", Exam.State.STUDENT_STARTED.toString())
                .findOne();
        return getEnrolmentError(enrolment, request().remoteAddress());
    }

    private Result terminateExam(String hash, Exam.State newState) {
        User user = getLoggedUser();
        ExternalExam ee = Ebean.find(ExternalExam.class).where()
                .eq("hash", hash)
                .eq("creator", user)
                .findOne();
        if (ee == null) {
            return forbidden();
        }
        Optional<ExamEnrolment> optionalEnrolment = getEnrolment(user, ee);
        if (!optionalEnrolment.isPresent()) {
            return forbidden();
        }
        ExamEnrolment enrolment = optionalEnrolment.get();
        DateTime now = DateTimeUtils.adjustDST(DateTime.now(), enrolment.getReservation().getMachine().getRoom());
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
