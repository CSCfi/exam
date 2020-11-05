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

import akka.actor.ActorSystem;
import backend.controllers.ExaminationController;
import backend.controllers.SettingsController;
import backend.controllers.base.BaseController;
import backend.controllers.iop.collaboration.api.CollaborativeExamLoader;
import backend.controllers.iop.transfer.api.ExternalAttachmentLoader;
import backend.controllers.iop.transfer.api.ExternalExamAPI;
import backend.impl.AutoEvaluationHandler;
import backend.impl.EmailComposer;
import backend.impl.NoShowHandler;
import backend.models.Attachment;
import backend.models.AutoEvaluationConfig;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamInspection;
import backend.models.ExamParticipation;
import backend.models.GeneralSettings;
import backend.models.Reservation;
import backend.models.User;
import backend.models.json.ExternalExam;
import backend.models.questions.Question;
import backend.models.sections.ExamSection;
import backend.models.sections.ExamSectionQuestion;
import backend.models.sections.ExamSectionQuestionOption;
import backend.util.AppUtil;
import backend.util.json.JsonDeserializer;
import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import io.ebean.text.json.EJson;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import org.joda.time.DateTime;
import org.springframework.beans.BeanUtils;
import play.Logger;
import play.db.ebean.Transactional;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;
import scala.concurrent.duration.Duration;

public class ExternalExamController extends BaseController implements ExternalExamAPI {
    @Inject
    private WSClient wsClient;

    @Inject
    private AutoEvaluationHandler autoEvaluationHandler;

    @Inject
    private NoShowHandler noShowHandler;

    @Inject
    private ExternalAttachmentLoader externalAttachmentLoader;

    @Inject
    private ActorSystem actor;

    @Inject
    private EmailComposer emailComposer;

    @Inject
    private CollaborativeExamLoader collaborativeExamLoader;

    private static final Logger.ALogger logger = Logger.of(ExternalExamController.class);

    private Exam createCopy(Exam src, Exam parent, User user) {
        Exam clone = new Exam();
        BeanUtils.copyProperties(
            src,
            clone,
            "id",
            "parent",
            "attachment",
            "examSections",
            "examEnrolments",
            "examParticipation",
            "examInspections",
            "autoEvaluationConfig",
            "creator",
            "created",
            "examOwners"
        );
        clone.setParent(parent);
        if (src.getAttachment() != null) {
            final Attachment copy = src.getAttachment().copy();
            copy.save();
            clone.setAttachment(copy);
        }
        AppUtil.setCreator(clone, user);
        AppUtil.setModifier(clone, user);
        clone.generateHash();
        clone.save();

        if (src.getAutoEvaluationConfig() != null) {
            AutoEvaluationConfig configClone = src.getAutoEvaluationConfig().copy();
            configClone.setExam(clone);
            configClone.save();
            clone.setAutoEvaluationConfig(configClone);
        }
        for (ExamInspection ei : src.getExamInspections()) {
            ExamInspection inspection = new ExamInspection();
            BeanUtils.copyProperties(ei, inspection, "id", "exam");
            inspection.setExam(clone);
            inspection.save();
        }
        Set<ExamSection> sections = new TreeSet<>(src.getExamSections());
        for (ExamSection es : sections) {
            ExamSection esCopy = es.copyWithAnswers(clone, parent != null);
            AppUtil.setCreator(esCopy, user);
            AppUtil.setModifier(esCopy, user);
            esCopy.save();
            for (ExamSectionQuestion esq : esCopy.getSectionQuestions()) {
                Question questionCopy = esq.getQuestion();
                AppUtil.setCreator(questionCopy, user);
                AppUtil.setModifier(questionCopy, user);
                questionCopy.update();
                esq.save();
            }
            clone.getExamSections().add(esCopy);
        }
        clone.save();
        return clone;
    }

    @SubjectNotPresent
    @Transactional
    public CompletionStage<Result> addExamForAssessment(String ref, Http.Request request) throws IOException {
        Optional<ExamEnrolment> option = getPrototype(ref);
        if (option.isEmpty()) {
            return CompletableFuture.completedFuture(notFound());
        }
        ExamEnrolment enrolment = option.get();
        JsonNode body = request.body().asJson();
        ExternalExam ee = JsonDeserializer.deserialize(ExternalExam.class, body);
        if (ee == null) {
            return wrapAsPromise(badRequest());
        }
        Exam parent = Ebean.find(Exam.class).where().eq("hash", ee.getExternalRef()).findOne();
        if (parent == null && enrolment.getCollaborativeExam() == null) {
            return wrapAsPromise(notFound());
        }
        Exam clone = createCopy(ee.deserialize(), parent, enrolment.getUser());
        enrolment.setExam(clone);
        enrolment.update();

        ExamParticipation ep = new ExamParticipation();
        ep.setExam(clone);
        ep.setCollaborativeExam(enrolment.getCollaborativeExam());
        ep.setUser(enrolment.getUser());
        ep.setStarted(ee.getStarted());
        ep.setEnded(ee.getFinished());
        ep.setReservation(enrolment.getReservation());
        ep.setDuration(new DateTime(ee.getFinished().getMillis() - ee.getStarted().getMillis()));

        if (clone.getState().equals(Exam.State.REVIEW)) {
            GeneralSettings settings = SettingsController.getOrCreateSettings("review_deadline", null, "14");
            int deadlineDays = Integer.parseInt(settings.getValue());
            DateTime deadline = ee.getFinished().plusDays(deadlineDays);
            ep.setDeadline(deadline);
            if (clone.isPrivate()) {
                notifyTeachers(clone);
            }
            autoEvaluationHandler.autoEvaluate(clone);
        }
        ep.save();
        if (enrolment.getCollaborativeExam() != null) {
            return collaborativeExamLoader
                .createAssessment(ep)
                .thenComposeAsync(
                    ok -> CompletableFuture.supplyAsync(ok ? Results::created : Results::internalServerError)
                );
        } else {
            // Fetch external attachments to local exam.
            externalAttachmentLoader.fetchExternalAttachmentsAsLocal(clone);
            return wrapAsPromise(created());
        }
    }

    private void notifyTeachers(Exam exam) {
        Set<User> recipients = Stream
            .concat(
                exam.getParent().getExamOwners().stream(),
                exam.getExamInspections().stream().map(ExamInspection::getUser)
            )
            .collect(Collectors.toSet());
        actor
            .scheduler()
            .scheduleOnce(
                Duration.create(1, TimeUnit.SECONDS),
                () -> AppUtil.notifyPrivateExamEnded(recipients, exam, emailComposer),
                actor.dispatcher()
            );
    }

    private PathProperties getPath() {
        String path =
            "(id, name, state, instruction, hash, duration, cloned, subjectToLanguageInspection, " +
            "implementation, trialCount, anonymous, " +
            "course(id, code, name, gradeScale(id, displayName, grades(id, name))), executionType(id, type), " + // (
            "autoEvaluationConfig(releaseType, releaseDate, amountDays, gradeEvaluations(percentage, grade(id, gradeScale(id)))), " +
            "examLanguages(code), attachment(*), examOwners(firstName, lastName)" +
            "examInspections(*, user(id, firstName, lastName)), " +
            "examType(id, type), creditType(id, type), gradeScale(id, displayName, grades(id, name)), " +
            "examSections(id, name, sequenceNumber, description, lotteryOn, optional, lotteryItemCount," + // ((
            "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, " + // (((
            "question(id, type, question, attachment(*), options(id, option, correctOption, defaultScore, claimChoiceType)), " +
            "options(id, answered, score, option(id, option)), " +
            "essayAnswer(id, answer, objectVersion, attachment(*)), " +
            "clozeTestAnswer(id, question, answer, objectVersion)" +
            ")))";
        return PathProperties.parse(path);
    }

    @SubjectNotPresent
    public CompletionStage<Result> provideEnrolment(String ref) {
        Optional<ExamEnrolment> option = getPrototype(ref);
        if (option.isEmpty()) {
            return CompletableFuture.completedFuture(notFound());
        }
        ExamEnrolment enrolment = option.get();
        if (enrolment.getCollaborativeExam() != null) {
            return collaborativeExamLoader
                .downloadExam(enrolment.getCollaborativeExam())
                .thenApplyAsync(
                    oe -> {
                        if (oe.isPresent()) {
                            return ok(oe.get(), getPath());
                        } else {
                            return internalServerError("could not download collaborative exam");
                        }
                    }
                );
        } else {
            final Exam exam = enrolment.getExam();

            final List<CompletableFuture<Void>> futures = new ArrayList<>();
            if (exam.getAttachment() != null) {
                futures.add(externalAttachmentLoader.createExternalAttachment(exam.getAttachment()));
            }
            exam
                .getExamSections()
                .stream()
                .flatMap(examSection -> examSection.getSectionQuestions().stream())
                .map(ExamSectionQuestion::getQuestion)
                .filter(question -> question.getAttachment() != null)
                .distinct()
                .forEach(
                    question -> futures.add(externalAttachmentLoader.createExternalAttachment(question.getAttachment()))
                );
            return CompletableFuture
                .allOf(futures.toArray(new CompletableFuture[0]))
                .thenComposeAsync(aVoid -> wrapAsPromise(ok(exam, getPath())))
                .exceptionally(
                    t -> {
                        logger.error("Could not provide enrolment [id=" + enrolment.getId() + "]", t);
                        return internalServerError();
                    }
                );
        }
    }

    @SubjectNotPresent
    public Result addNoShow(String ref) {
        return getPrototype(ref)
            .map(
                e -> {
                    noShowHandler.handleNoShowAndNotify(e.getReservation());
                    return ok();
                }
            )
            .orElse(notFound());
    }

    @Override
    public CompletionStage<ExamEnrolment> requestEnrolment(User user, Reservation reservation)
        throws MalformedURLException {
        URL url = parseUrl(reservation.getExternalRef());
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, ExamEnrolment> onSuccess = response -> {
            if (response.getStatus() != Http.Status.OK) {
                return null;
            }
            JsonNode root = response.asJson();
            // Create external exam!
            Exam document = JsonDeserializer.deserialize(Exam.class, root);
            // Set references so that:
            // - external ref is the reference we got from outside. Must not be changed.
            // - local ref is an UUID X. It is used locally for referencing the exam
            // - content's hash is set to X in order to simplify things with frontend

            String externalRef = document.getHash();
            String ref = UUID.randomUUID().toString();
            document.setHash(ref);

            // Filter out optional sections
            ArrayNode optionalSectionsNode = root.has("optionalSections")
                ? (ArrayNode) root.get("optionalSections")
                : Json.newArray();
            Set<Long> ids = StreamSupport
                .stream(optionalSectionsNode.spliterator(), false)
                .map(JsonNode::asLong)
                .collect(Collectors.toSet());
            document.setExamSections(
                document
                    .getExamSections()
                    .stream()
                    .filter(es -> !es.isOptional() || ids.contains(es.getId()))
                    .collect(Collectors.toSet())
            );

            // Shuffle multi-choice options
            document
                .getExamSections()
                .stream()
                .flatMap(es -> es.getSectionQuestions().stream())
                .forEach(
                    esq -> {
                        Question.Type questionType = Optional
                            .ofNullable(esq.getQuestion())
                            .map(Question::getType)
                            .orElseGet(null);
                        if (questionType == Question.Type.ClaimChoiceQuestion) {
                            Set<ExamSectionQuestionOption> sorted = esq
                                .getOptions()
                                .stream()
                                .collect(
                                    Collectors.toCollection(
                                        () -> new TreeSet<>(Comparator.comparingLong(esqo -> esqo.getOption().getId()))
                                    )
                                );
                            esq.setOptions(sorted);
                        } else {
                            List<ExamSectionQuestionOption> shuffled = new ArrayList<>(esq.getOptions());
                            Collections.shuffle(shuffled);
                            esq.setOptions(new HashSet<>(shuffled));
                        }
                    }
                );

            // Shuffle section questions if lottery on
            document.getExamSections().stream().filter(ExamSection::isLotteryOn).forEach(ExamSection::shuffleQuestions);

            Map<String, Object> content;
            try {
                ObjectMapper om = new ObjectMapper();
                String txt = om.writeValueAsString(document);
                content = EJson.parseObject(txt);
            } catch (IOException e) {
                return null;
            }
            ExternalExam ee = new ExternalExam();
            ee.setExternalRef(externalRef);
            ee.setHash(ref);
            ee.setContent(content);
            ee.setCreator(user);
            ee.setCreated(DateTime.now());
            ee.save();

            ExamEnrolment enrolment = new ExamEnrolment();
            enrolment.setExternalExam(ee);
            enrolment.setReservation(reservation);
            enrolment.setUser(user);
            enrolment.save();
            return enrolment;
        };
        return request.get().thenApplyAsync(onSuccess);
    }

    private static Query<ExamEnrolment> createQuery() {
        Query<ExamEnrolment> query = Ebean.find(ExamEnrolment.class);
        PathProperties props = ExaminationController.getPath(true);
        props.apply(query);
        return query;
    }

    private static Optional<ExamEnrolment> getPrototype(String ref) {
        return createQuery()
            .where()
            .eq("reservation.externalRef", ref)
            .or()
            .isNull("exam.parent")
            .isNotNull("collaborativeExam")
            .endOr()
            .orderBy("exam.examSections.id, exam.examSections.sectionQuestions.sequenceNumber")
            .findOneOrEmpty();
    }

    private static URL parseUrl(Object... args) throws MalformedURLException {
        final String path = args.length < 1 ? "/api/enrolments/%s" : String.format("/api/enrolments/%s", args);
        return new URL(ConfigFactory.load().getString("sitnet.integration.iop.host") + path);
    }
}
