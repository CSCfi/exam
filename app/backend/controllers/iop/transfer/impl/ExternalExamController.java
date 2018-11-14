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

import backend.controllers.SettingsController;
import backend.controllers.StudentExamController;
import backend.controllers.base.BaseController;
import backend.controllers.iop.transfer.api.ExternalAttachmentLoader;
import backend.controllers.iop.transfer.api.ExternalExamAPI;
import backend.impl.AutoEvaluationHandler;
import backend.impl.NoShowHandler;
import backend.models.Attachment;
import backend.models.AutoEvaluationConfig;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamInspection;
import backend.models.ExamParticipation;
import backend.models.ExamSection;
import backend.models.ExamSectionQuestion;
import backend.models.ExamSectionQuestionOption;
import backend.models.GeneralSettings;
import backend.models.Reservation;
import backend.models.User;
import backend.models.json.ExternalExam;
import backend.models.questions.Question;
import backend.util.AppUtil;
import backend.util.JsonDeserializer;
import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import io.ebean.text.json.EJson;
import org.joda.time.DateTime;
import org.springframework.beans.BeanUtils;
import play.Logger;
import play.db.ebean.Transactional;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;

import javax.inject.Inject;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;


public class ExternalExamController extends BaseController implements ExternalExamAPI {

    @Inject
    private WSClient wsClient;

    @Inject
    private AutoEvaluationHandler autoEvaluationHandler;

    @Inject
    private NoShowHandler noShowHandler;

    @Inject
    private ExternalAttachmentLoader externalAttachmentLoader;

    private Exam createCopy(Exam src, Exam parent, User user) {
        Exam clone = new Exam();
        BeanUtils.copyProperties(src, clone, "id", "parent", "attachment", "examSections", "examEnrolments", "examParticipation",
                "examInspections", "autoEvaluationConfig", "creator", "created", "examOwners");
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
        Set<ExamSection> sections = new TreeSet<>();
        sections.addAll(src.getExamSections());
        for (ExamSection es : sections) {
            ExamSection esCopy = es.copyWithAnswers(clone);
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
    public CompletionStage<Result> addExamForAssessment(String ref) throws IOException {
        ExamEnrolment enrolment = getPrototype(ref);
        if (enrolment == null) {
            return wrapAsPromise(notFound());
        }
        JsonNode body = request().body().asJson();
        ExternalExam ee = JsonDeserializer.deserialize(ExternalExam.class, body);
        if (ee == null) {
            return wrapAsPromise(badRequest());
        }
        Exam parent = Ebean.find(Exam.class).where().eq("hash", ee.getExternalRef()).findOne();
        if (parent == null) {
            return wrapAsPromise(notFound());
        }
        Exam clone = createCopy(ee.deserialize(), parent, enrolment.getUser());
        enrolment.setExam(clone);
        enrolment.update();

        ExamParticipation ep = new ExamParticipation();
        ep.setExam(clone);
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
            autoEvaluationHandler.autoEvaluate(clone);
        }
        ep.save();

        // Fetch external attachments to local exam.
        externalAttachmentLoader.fetchExternalAttachmentsAsLocal(clone);
        return wrapAsPromise(created());
    }

    private PathProperties getPath() {
        String path = "(id, name, state, instruction, hash, duration, cloned, course(id, code, name), executionType(id, type), " + // (
                "autoEvaluationConfig(releaseType, releaseDate, amountDays, gradeEvaluations(percentage, grade(id, gradeScale(id)))), " +
                "examLanguages(code), attachment(*), examOwners(firstName, lastName)" +
                "examInspections(*, user(id, firstName, lastName)), " +
                "examType(id, type), creditType(id, type), gradeScale(id, displayName, grades(id, name)), " +
                "examSections(id, name, sequenceNumber, description, lotteryOn, lotteryItemCount," + // ((
                "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, " + // (((
                "question(id, type, question, attachment(*), options(id, option, correctOption, defaultScore)), " +
                "options(id, answered, score, option(id, option)), " +
                "essayAnswer(id, answer, objectVersion, attachment(*)), " +
                "clozeTestAnswer(id, question, answer, objectVersion)" +
                ")))";
        return PathProperties.parse(path);
    }

    @SubjectNotPresent
    public CompletionStage<Result> provideEnrolment(String ref) {
        ExamEnrolment enrolment = getPrototype(ref);
        if (enrolment == null) {
            return CompletableFuture.completedFuture(notFound());
        }
        final Exam exam = enrolment.getExam();
        final List<CompletableFuture<Void>> futures = new ArrayList<>();
        if (exam.getAttachment() != null) {
            futures.add(externalAttachmentLoader.createExternalAttachment(exam.getAttachment()));
        }
        exam.getExamSections().stream()
                .flatMap(examSection -> examSection.getSectionQuestions().stream())
                .map(ExamSectionQuestion::getQuestion)
                .filter(question -> question.getAttachment() != null)
                .distinct()
                .forEach(question -> futures.add(
                        externalAttachmentLoader.createExternalAttachment(question.getAttachment())
                ));
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenComposeAsync(aVoid -> wrapAsPromise(ok(exam, getPath())))
                .exceptionally(t -> {
                    Logger.error("Could not provide enrolment [id=" + enrolment.getId() + "]", t);
                    return internalServerError();
                });
    }

    @SubjectNotPresent
    public Result addNoShow(String ref) {
        ExamEnrolment enrolment = getPrototype(ref);
        if (enrolment == null) {
            Logger.error("No reservation found with ref {}", ref);
            return notFound();
        }
        noShowHandler.handleNoShowAndNotify(enrolment.getReservation());
        return ok();
    }

    @Override
    public CompletionStage<ExamEnrolment> requestEnrolment(User user, Reservation reservation) throws MalformedURLException {
        URL url = parseUrl("/api/enrolments/%s", reservation.getExternalRef());
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, ExamEnrolment> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != 200) {
                return null;
            }
            // Create external exam!
            Exam document = JsonDeserializer.deserialize(Exam.class, root);
            // Set references so that:
            // - external ref is the reference we got from outside. Must not be changed.
            // - local ref is an UUID X. It is used locally for referencing the exam
            // - content's hash is set to X in order to simplify things with frontend

            String externalRef = document.getHash();
            String ref = UUID.randomUUID().toString();
            document.setHash(ref);

            // Shuffle multi-choice options
            document.getExamSections().stream().flatMap(es -> es.getSectionQuestions().stream()).forEach(esq -> {
                List<ExamSectionQuestionOption> shuffled = new ArrayList<>(esq.getOptions());
                Collections.shuffle(shuffled);
                esq.setOptions(new HashSet<>(shuffled));
            });

            // Shuffle section questions if lottery on
            document.getExamSections().stream()
                    .filter(ExamSection::getLotteryOn)
                    .forEach(ExamSection::shuffleQuestions);

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
        PathProperties props = StudentExamController.getPath(true);
        props.apply(query);
        return query;
    }

    private static ExamEnrolment getPrototype(String ref) {
        return createQuery()
                .where()
                .eq("reservation.externalRef", ref)
                .isNull("exam.parent")
                .orderBy("exam.examSections.id, exam.examSections.sectionQuestions.sequenceNumber")
                .findOne();
    }

    private static URL parseUrl(String format, Object... args) throws MalformedURLException {
        final String path = args.length < 1 ? format : String.format(format, args);
        return new URL(ConfigFactory.load().getString("sitnet.integration.iop.host")
                + path);
    }


}
