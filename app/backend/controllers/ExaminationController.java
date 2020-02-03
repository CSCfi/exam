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
import java.util.Collections;
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
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import scala.concurrent.duration.Duration;

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
import backend.models.Reservation;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.models.questions.ClozeTestAnswer;
import backend.models.questions.EssayAnswer;
import backend.models.questions.Question;
import backend.models.sections.ExamSection;
import backend.models.sections.ExamSectionQuestion;
import backend.sanitizers.Attrs;
import backend.sanitizers.EssayAnswerSanitizer;
import backend.security.Authenticated;
import backend.system.interceptors.ExamActionRouter;
import backend.system.interceptors.SensitiveDataPolicy;
import backend.util.AppUtil;
import backend.util.config.ByodConfigHandler;
import backend.util.datetime.DateTimeUtils;

@SensitiveDataPolicy(sensitiveFieldNames = {"score", "defaultScore", "correctOption", "configKey"})
public class ExaminationController extends BaseController {

    protected final EmailComposer emailComposer;
    protected final ActorSystem actor;
    private final AutoEvaluationHandler autoEvaluationHandler;
    private final CollaborativeExamLoader collaborativeExamLoader;
    protected final Environment environment;
    private final ExternalAttachmentLoader externalAttachmentLoader;
    private final ByodConfigHandler byodConfigHandler;

    private static final Logger.ALogger logger = Logger.of(ExaminationController.class);

    @Inject
    public ExaminationController(EmailComposer emailComposer, ActorSystem actor,
                                 CollaborativeExamLoader collaborativeExamLoader,
                                 AutoEvaluationHandler autoEvaluationHandler,
                                 Environment environment,
                                 ExternalAttachmentLoader externalAttachmentLoader,
                                 ByodConfigHandler byodConfigHandler) {
        this.emailComposer = emailComposer;
        this.actor = actor;
        this.collaborativeExamLoader = collaborativeExamLoader;
        this.autoEvaluationHandler = autoEvaluationHandler;
        this.environment = environment;
        this.externalAttachmentLoader = externalAttachmentLoader;
        this.byodConfigHandler = byodConfigHandler;
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

    @Authenticated
    @Restrict({@Group("STUDENT")})
    @ExamActionRouter
    public CompletionStage<Result> startExam(String hash, Http.Request request) throws IOException {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Optional<CollaborativeExam> oce = getCollaborativeExam(hash);
        CollaborativeExam ce = oce.orElse(null);
        return getPrototype(hash, ce).thenApplyAsync(optionalPrototype -> {
            Optional<Exam> possibleClone = getPossibleClone(hash, user, ce);
            // no exam found for hash
            if (optionalPrototype.isEmpty() && possibleClone.isEmpty()) {
                return notFound();
            }
            if (possibleClone.isEmpty()) {
                // Exam not started yet, create new exam for student
                Exam prototype = optionalPrototype.get();
                ExamEnrolment enrolment = getEnrolment(user, prototype, ce);
                Optional<Result> error = getEnrolmentError(enrolment, request);
                if (error.isPresent()) {
                    return error.get();
                }
                Exam newExam = Ebean.executeCall(() -> createNewExam(prototype, user, enrolment));
                if (enrolment.getCollaborativeExam() != null) {
                    try {
                        externalAttachmentLoader.fetchExternalAttachmentsAsLocal(newExam).get();
                    } catch (InterruptedException | ExecutionException e) {
                        logger.error("Could not fetch external attachments!", e);
                    }
                }
                newExam.setCloned(true);
                newExam.setDerivedMaxScores();
                processClozeTestQuestions(newExam);
                return ok(newExam, getPath(false));
            } else {
                // Exam started already
                return getEnrolmentError(hash, request).orElseGet(() -> {
                    Exam clone = possibleClone.get();
                    // sanity check
                    if (clone.getState() != Exam.State.STUDENT_STARTED) {
                        return forbidden();
                    }
                    clone.setCloned(false);
                    clone.setDerivedMaxScores();
                    processClozeTestQuestions(clone);
                    return ok(clone, getPath(false));
                });
            }
        });
    }

    @Authenticated
    @Restrict({@Group("STUDENT")})
    @Transactional
    public Result turnExam(String hash, Http.Request request) {
        return getEnrolmentError(hash, request).orElseGet(() -> {
            User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
            Exam exam = Ebean.find(Exam.class)
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

                GeneralSettings settings = SettingsController.getOrCreateSettings("review_deadline", null, "14");
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
        });
    }

    @Authenticated
    @Restrict({@Group("STUDENT")})
    @Transactional
    public Result abortExam(String hash, Http.Request request) {
        return getEnrolmentError(hash, request).orElseGet(() -> {
            User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
            Exam exam = Ebean.find(Exam.class).where()
                    .eq("creator", user)
                    .eq("hash", hash)
                    .findOne();
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
        });
    }

    @Authenticated
    @With(EssayAnswerSanitizer.class)
    @Restrict({@Group("STUDENT")})
    public Result answerEssay(String hash, Long questionId, Http.Request request) {
        return getEnrolmentError(hash, request).orElseGet(() -> {
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
        });
    }

    @Authenticated
    @Restrict({@Group("STUDENT")})
    public Result answerMultiChoice(String hash, Long qid, Http.Request request) {
        return getEnrolmentError(hash, request).orElseGet(() -> {
            ArrayNode node = (ArrayNode) request.body().asJson().get("oids");
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

    @Authenticated
    @With(EssayAnswerSanitizer.class)
    @Restrict({@Group("STUDENT")})
    public Result answerClozeTest(String hash, Long questionId, Http.Request request) {
        return getEnrolmentError(hash, request).orElseGet(() -> {
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

    private Optional<ExamParticipation> findParticipation(Exam exam, User user) {
        return Ebean.find(ExamParticipation.class)
                .where()
                .eq("exam.id", exam.getId())
                .eq("user", user)
                .isNull("ended")
                .findOneOrEmpty();
    }

    private void setDurations(ExamParticipation ep) {
        DateTime now = ep.getReservation() == null ?
                DateTimeUtils.adjustDST(DateTime.now()) :
                DateTimeUtils.adjustDST(DateTime.now(), ep.getReservation().getMachine().getRoom());
        ep.setEnded(now);
        ep.setDuration(new DateTime(ep.getEnded().getMillis() - ep.getStarted().getMillis()));
    }

    private static Exam createNewExam(Exam prototype, User user, ExamEnrolment enrolment) {
        boolean isCollaborative = enrolment.getCollaborativeExam() != null;
        Reservation reservation = enrolment.getReservation();
        // TODO: support for optional sections in BYOD exams
        Set<Long> ids = reservation == null ? Collections.emptySet() :
                reservation.getOptionalSections().stream()
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
        examParticipation.setReservation(reservation);
        if (enrolment.getExaminationEventConfiguration() != null) {
            examParticipation.setExaminationEvent(enrolment.getExaminationEventConfiguration().getExaminationEvent());
        }
        DateTime now = reservation == null ? DateTimeUtils.adjustDST(DateTime.now()) :
                DateTimeUtils.adjustDST(DateTime.now(), enrolment.getReservation().getMachine().getRoom());
        examParticipation.setStarted(now);
        examParticipation.save();
        return studentExam;
    }

    private boolean isInEffect(ExamEnrolment ee) {
        DateTime now = DateTimeUtils.adjustDST(DateTime.now());
        if (ee.getReservation() != null) {
            return ee.getReservation().getStartAt().isBefore(now) && ee.getReservation().getEndAt().isAfter(now);
        } else if (ee.getExaminationEventConfiguration() != null) {
            DateTime start = ee.getExaminationEventConfiguration().getExaminationEvent().getStart();
            DateTime end = start.plusMinutes(ee.getExam().getDuration());
            return start.isBefore(now) && end.isAfter(now);
        }
        return false;
    }

    private ExamEnrolment getEnrolment(User user, Exam prototype, CollaborativeExam ce) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .fetch("examinationEventConfiguration")
                .fetch("examinationEventConfiguration.examinationEvent")
                .where()
                .eq("user.id", user.getId())
                .or()
                .eq("exam.id", prototype.getId())
                .and()
                .eq("collaborativeExam.id", ce != null ? ce.getId() : -1)
                .isNull("exam.id")
                .endAnd()
                .endOr()
                .findList()
                .stream()
                .filter(this::isInEffect)
                .collect(Collectors.toList());

        if (enrolments.size() > 1) {
            logger.error("multiple enrolments found during examination");
        }
        return enrolments.isEmpty() ? null : enrolments.get(0);
    }

    protected Optional<Result> getEnrolmentError(ExamEnrolment enrolment, Http.Request request) {
        // If this is null, it means someone is either trying to access an exam by wrong hash
        // or the reservation is not in effect right now.
        if (enrolment == null) {
            return Optional.of(forbidden("sitnet_reservation_not_found"));
        }
        boolean isByod = enrolment.getExam() != null && enrolment.getExam().getRequiresUserAgentAuth();
        if (isByod) {
            return byodConfigHandler.checkUserAgent(request,
                    enrolment.getExaminationEventConfiguration().getConfigKey());
        } else if (enrolment.getReservation() == null) {
            return Optional.of(forbidden("sitnet_reservation_not_found"));
        } else if (enrolment.getReservation().getMachine() == null) {
            return Optional.of(forbidden("sitnet_reservation_machine_not_found"));
        } else if (!environment.isDev() &&
                !enrolment.getReservation().getMachine().getIpAddress().equals(request.remoteAddress())) {
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
        String path = "(id, name, state, instruction, hash, duration, cloned, external, requiresUserAgentAuth, " +
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


    private Optional<Result> getEnrolmentError(String hash, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                .eq("exam.hash", hash)
                .eq("exam.creator", user)
                .eq("exam.state", Exam.State.STUDENT_STARTED)
                .findOne();
        return getEnrolmentError(enrolment, request);
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
