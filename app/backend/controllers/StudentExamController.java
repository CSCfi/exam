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

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import org.joda.time.DateTime;
import play.Environment;
import play.Logger;
import play.db.ebean.Transactional;
import play.mvc.Result;
import play.mvc.With;
import scala.concurrent.duration.Duration;

import backend.controllers.base.ActionMethod;
import backend.controllers.base.BaseController;
import backend.controllers.iop.collaboration.api.CollaborativeExamLoader;
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
import backend.models.sections.ExamSection;
import backend.models.sections.ExamSectionQuestion;
import backend.sanitizers.Attrs;
import backend.sanitizers.EssayAnswerSanitizer;
import backend.system.interceptors.ExamActionRouter;
import backend.system.interceptors.SensitiveDataPolicy;
import backend.util.AppUtil;
import backend.util.datetime.DateTimeUtils;

@SensitiveDataPolicy(sensitiveFieldNames = {"score", "defaultScore", "correctOption"})
@Restrict({@Group("STUDENT")})
public class StudentExamController extends BaseController {

    protected final EmailComposer emailComposer;
    protected final ActorSystem actor;
    private final AutoEvaluationHandler autoEvaluationHandler;
    private final CollaborativeExamLoader collaborativeExamLoader;
    protected final Environment environment;
    private final ExternalAttachmentLoader externalAttachmentLoader;

    @Inject
    public StudentExamController(EmailComposer emailComposer, ActorSystem actor,
                                 CollaborativeExamLoader collaborativeExamLoader,
                                 AutoEvaluationHandler autoEvaluationHandler,
                                 Environment environment,
                                 ExternalAttachmentLoader externalAttachmentLoader) {
        this.emailComposer = emailComposer;
        this.actor = actor;
        this.collaborativeExamLoader = collaborativeExamLoader;
        this.autoEvaluationHandler = autoEvaluationHandler;
        this.environment = environment;
        this.externalAttachmentLoader = externalAttachmentLoader;
    }

    private Optional<CollaborativeExam> getCollaborativeExam(String hash) {
        Optional<CollaborativeExam> ce = Ebean.find(CollaborativeExam.class).where().eq("hash", hash)
                .findOneOrEmpty();
        if (ce.isPresent()) {
            return ce;
        }
        Optional<Exam> exam = Ebean.find(Exam.class).where().eq("hash", hash).findOneOrEmpty();
        if (exam.isPresent()) {
            if (!exam.get().getExamEnrolments().isEmpty()) {
                CollaborativeExam ce2 = exam.get().getExamEnrolments().get(0).getCollaborativeExam();
                return ce2 == null ? Optional.empty() : Optional.of(ce2);
            }
        }
        return ce;
    }

    @ActionMethod
    @Transactional
    @ExamActionRouter
    public CompletionStage<Result> startExam(String hash) throws IOException {
        User user = getLoggedUser();
        String clientIp = request().remoteAddress();
        Optional<CollaborativeExam> oce = getCollaborativeExam(hash);
        CollaborativeExam ce = oce.orElse(null);
        return getPrototype(hash, ce).thenApplyAsync(optionalPrototype -> {
            Optional<Exam> possibleClone = getPossibleClone(hash, user, ce);
            // no exam found for hash
            if (!optionalPrototype.isPresent() && !possibleClone.isPresent()) {
                return notFound();
            }
            if (!possibleClone.isPresent()) {
                // Exam not started yet, create new exam for student
                Exam prototype = optionalPrototype.get();
                ExamEnrolment enrolment = getEnrolment(user, prototype, ce);
                Optional<Result> error = getEnrolmentError(enrolment, clientIp);
                if (error.isPresent()) {
                    return error.get();
                }
                Exam newExam = createNewExam(prototype, user, enrolment);
                if (enrolment.getCollaborativeExam() != null) {
                    try {
                        externalAttachmentLoader.fetchExternalAttachmentsAsLocal(newExam).get();
                    } catch (InterruptedException | ExecutionException e) {
                        Logger.error("Could not fetch external attachments!", e);
                    }
                }
                newExam.setCloned(true);
                newExam.setDerivedMaxScores();
                processClozeTestQuestions(newExam);
                return ok(newExam, getPath(false));
            } else {
                // Exam started already
                Exam clone = possibleClone.get();
                // sanity check
                if (clone.getState() != Exam.State.STUDENT_STARTED) {
                    return forbidden();
                }
                clone.setCloned(false);
                clone.setDerivedMaxScores();
                processClozeTestQuestions(clone);
                return ok(clone, getPath(false));
            }
        });
    }

    @ActionMethod
    @Transactional
    public Result turnExam(String hash) {
        User user = getLoggedUser();

        Exam exam = Ebean.find(Exam.class)
                .fetch("examSections.sectionQuestions.question")
                .where()
                .eq("creator", user)
                .eq("hash", hash)
                .findOne();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        ExamParticipation p = Ebean.find(ExamParticipation.class)
                .where()
                .eq("exam.id", exam.getId())
                .eq("user", user)
                .isNull("ended")
                .findOne();

        if (p != null) {
            DateTime now = DateTimeUtils.adjustDST(DateTime.now(), p.getReservation().getMachine().getRoom());
            p.setEnded(now);
            p.setDuration(new DateTime(p.getEnded().getMillis() - p.getStarted().getMillis()));

            GeneralSettings settings = SettingsController.getOrCreateSettings("review_deadline", null, "14");
            int deadlineDays = Integer.parseInt(settings.getValue());
            DateTime deadline = p.getEnded().plusDays(deadlineDays);
            p.setDeadline(deadline);
            p.save();
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

    @ActionMethod
    @Transactional
    public Result abortExam(String hash) {
        User user = getLoggedUser();
        Exam exam = Ebean.find(Exam.class).where()
                .eq("creator", user)
                .eq("hash", hash)
                .findOne();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        ExamParticipation p = Ebean.find(ExamParticipation.class)
                .where()
                .eq("exam.id", exam.getId())
                .eq("user", user)
                .isNull("ended")
                .findOne();

        if (p != null) {
            DateTime now = DateTimeUtils.adjustDST(DateTime.now(), p.getReservation().getMachine().getRoom());
            p.setEnded(now);
            p.setDuration(new DateTime(p.getEnded().getMillis() - p.getStarted().getMillis()));
            p.save();
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

    @With(EssayAnswerSanitizer.class)
    @ActionMethod
    public Result answerEssay(String hash, Long questionId) {
        return getEnrolmentError(hash, request().remoteAddress()).orElseGet(() -> {

            String essayAnswer = request().attrs().getOptional(Attrs.ESSAY_ANSWER).orElse(null);
            Optional<Long> objectVersion = request().attrs().getOptional(Attrs.OBJECT_VERSION);
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
        });
    }

    @ActionMethod
    public Result answerMultiChoice(String hash, Long qid) {
        return getEnrolmentError(hash, request().remoteAddress()).orElseGet(() -> {
            ArrayNode node = (ArrayNode) request().body().asJson().get("oids");
            List<Long> optionIds = StreamSupport.stream(node.spliterator(), false)
                    .map(JsonNode::asLong)
                    .collect(Collectors.toList());
            ExamSectionQuestion question =
                    Ebean.find(ExamSectionQuestion.class, qid);
            if (question == null) {
                return forbidden();
            }
            question.getOptions().forEach(o -> {
                o.setAnswered(optionIds.contains(o.getId()));
                o.update();
            });
            return ok();
        });
    }

    @With(EssayAnswerSanitizer.class)
    @ActionMethod
    public Result answerClozeTest(String hash, Long questionId) {
        return getEnrolmentError(hash, request().remoteAddress()).orElseGet(() -> {
            ExamSectionQuestion esq = Ebean.find(ExamSectionQuestion.class, questionId);
            if (esq == null) {
                return forbidden();
            }
            ClozeTestAnswer answer = esq.getClozeTestAnswer();
            if (answer == null) {
                answer = new ClozeTestAnswer();
            } else {
                long objectVersion = request().attrs().get(Attrs.OBJECT_VERSION);
                answer.setObjectVersion(objectVersion);
            }
            answer.setAnswer(request().attrs().getOptional(Attrs.ESSAY_ANSWER).orElse(null));
            answer.save();
            return ok(answer, PathProperties.parse("(id, objectVersion, answer)"));
        });
    }

    private CompletionStage<Optional<Exam>> getPrototype(String hash, CollaborativeExam ce) {
        if (ce != null) {
            return collaborativeExamLoader.downloadExam(ce);
        }
        Exam exam = createQuery()
                .where()
                .eq("hash", hash)
                .isNull("parent")
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
                .findOne();
        if (exam == null) {
            return CompletableFuture.supplyAsync(Optional::empty);
        }
        return CompletableFuture.supplyAsync(() -> Optional.of(exam));
    }

    private static Optional<Exam> getPossibleClone(String hash, User user, CollaborativeExam ce) {
        ExpressionList<Exam> query = createQuery().where()
                .eq("hash", hash)
                .eq("creator", user);
        if (ce == null) {
            query = query.isNotNull("parent");
        }
        return query.orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber").findOneOrEmpty();

    }

    private static Exam createNewExam(Exam prototype, User user, ExamEnrolment enrolment) {
        boolean isCollaborative = enrolment.getCollaborativeExam() != null;
        Set<Long> ids = enrolment.getReservation().getOptionalSections().stream()
                .map(ExamSection::getId).collect(Collectors.toSet());
        Exam studentExam = prototype.copyForStudent(user, isCollaborative, ids);
        studentExam.setState(Exam.State.STUDENT_STARTED);
        studentExam.setCreator(user);
        if (!isCollaborative) {
            studentExam.setParent(prototype);
        }
        studentExam.generateHash();
        studentExam.save();

        enrolment.setExam(studentExam);
        enrolment.save();

        ExamParticipation examParticipation = new ExamParticipation();
        examParticipation.setUser(user);
        examParticipation.setExam(studentExam);
        examParticipation.setCollaborativeExam(enrolment.getCollaborativeExam());
        examParticipation.setReservation(enrolment.getReservation());
        DateTime now = DateTimeUtils.adjustDST(DateTime.now(), enrolment.getReservation().getMachine().getRoom());
        examParticipation.setStarted(now);
        examParticipation.save();
        return studentExam;
    }

    private static ExamEnrolment getEnrolment(User user, Exam prototype, CollaborativeExam ce) {
        DateTime now = DateTimeUtils.adjustDST(DateTime.now());
        return Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("user.id", user.getId())
                .or()
                .eq("exam.id", prototype.getId())
                .eq("collaborativeExam.id", ce != null ? ce.getId() : -1)
                .endOr()
                .le("reservation.startAt", now.toDate())
                .gt("reservation.endAt", now.toDate())
                .findOne();
    }

    protected Optional<Result> getEnrolmentError(ExamEnrolment enrolment, String clientIP) {
        // If this is null, it means someone is either trying to access an exam by wrong hash
        // or the reservation is not in effect right now.
        if (enrolment == null) {
            return Optional.of(forbidden("sitnet_reservation_not_found"));
        }
        // Exam and enrolment found. Is student on the right machine?
        if (enrolment.getReservation() == null) {
            return Optional.of(forbidden("sitnet_reservation_not_found"));
        } else if (enrolment.getReservation().getMachine() == null) {
            return Optional.of(forbidden("sitnet_reservation_machine_not_found"));
        } else if (!environment.isDev() && !enrolment.getReservation().getMachine().getIpAddress().equals(clientIP)) {
            ExamRoom examRoom = Ebean.find(ExamRoom.class)
                    .fetch("mailAddress")
                    .where()
                    .eq("id", enrolment.getReservation().getMachine().getRoom().getId())
                    .findOne();
            if (examRoom == null) {
                return Optional.of(notFound());
            }
            String message = "sitnet_wrong_exam_machine " + examRoom.getName()
                    + ", " + examRoom.getMailAddress().toString()
                    + ", sitnet_exam_machine " + enrolment.getReservation().getMachine().getName();
            return Optional.of(forbidden(message));
        }
        return Optional.empty();
    }


    public static PathProperties getPath(boolean includeEnrolment) {
        String path = "(id, name, state, instruction, hash, duration, cloned, external, course(id, code, name), executionType(id, type), " + // (
                "examLanguages(code), attachment(fileName), examOwners(firstName, lastName)" +
                "examInspections(*, user(id, firstName, lastName))" +
                "examSections(id, name, sequenceNumber, description, lotteryOn, lotteryItemCount," + // ((
                "examMaterials(name, author, isbn), " +
                "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, " + // (((
                "question(id, type, question, attachment(id, fileName))" +
                "options(id, answered, option(id, option))" +
                "essayAnswer(id, answer, objectVersion, attachment(fileName))" +
                "clozeTestAnswer(id, question, answer, objectVersion)" +
                ")))";
        return PathProperties.parse(includeEnrolment ? String.format("(exam%s)", path) : path);
    }

    private static Query<Exam> createQuery() {
        Query<Exam> query = Ebean.find(Exam.class);
        PathProperties props = getPath(false);
        props.apply(query);
        return query;
    }

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
                    esq.update();
                    questionsToHide.add(esq.getQuestion());
                });
        questionsToHide.forEach(q -> q.setQuestion(null));
    }


    private Optional<Result> getEnrolmentError(String hash, String clientIp) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                .eq("exam.hash", hash)
                .eq("exam.creator", getLoggedUser())
                .eq("exam.state", Exam.State.STUDENT_STARTED)
                .findOne();
        return getEnrolmentError(enrolment, clientIp);
    }

    private void notifyTeachers(Exam exam) {
        Set<User> recipients = new HashSet<>();
        recipients.addAll(exam.getParent().getExamOwners());
        recipients.addAll(exam.getExamInspections().stream().map(
                ExamInspection::getUser).collect(Collectors.toSet()));
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS),
                () -> AppUtil.notifyPrivateExamEnded(recipients, exam, emailComposer),
                actor.dispatcher());
    }

}
