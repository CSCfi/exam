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

package backend.system.actors;

import akka.actor.AbstractActor;
import backend.controllers.iop.transfer.api.ExternalAttachmentLoader;
import backend.models.Attachment;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;

import javax.inject.Inject;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;

public class CollaborativeAssessmentSenderActor extends AbstractActor {

    private WSClient wsClient;
    private ExternalAttachmentLoader externalAttachmentLoader;

    @Inject
    public CollaborativeAssessmentSenderActor(WSClient wsClient, ExternalAttachmentLoader externalAttachmentLoader) {
        this.wsClient = wsClient;
        this.externalAttachmentLoader = externalAttachmentLoader;
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder().match(String.class, s -> {
            Logger.debug("{}: Running collaborative assessment sender ...", getClass().getCanonicalName());
            Query<ExamEnrolment> query = Ebean.find(ExamEnrolment.class);
            PathProperties pp = getPath();
            pp.apply(query);
            List<ExamEnrolment> enrolments = query.where()
                    .isNotNull("collaborativeExam")
                    .in("exam.state", Exam.State.ABORTED, Exam.State.REVIEW)
                    .isNull("sentForReview")
                    .isNotNull("exam.examParticipation.started")
                    .isNotNull("exam.examParticipation.ended")
                    .findList();
            enrolments.forEach(e -> {
                try {
                    send(e, pp);
                } catch (IOException ex) {
                    Logger.error("I/O failure while sending exam to XM");
                }
            });
        }).build();
    }

    private static PathProperties getPath() {
        String path = "(*, exam(id, name, state, instruction, hash, duration, executionType(id, type), " + // (
                "examLanguages(code), attachment(id, externalId, fileName), examOwners(firstName, lastName)" +
                "autoEvaluationConfig(*, gradeEvaluations(*, grade(*)))" +
                "examInspections(*, user(id, firstName, lastName))" +
                "gradeScale(*, grades(*))" +
                "examSections(id, name, sequenceNumber, description, lotteryOn, lotteryItemCount," + // ((
                "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, " + // (((
                "question(id, type, question, attachment(id, externalId, fileName), options(*))" +
                "options(*, option(*))" +
                "essayAnswer(id, answer, objectVersion, attachment(id, externalId, fileName))" +
                "clozeTestAnswer(id, question, answer, objectVersion)" +
                ")), examParticipation(started, ended)))";
        return PathProperties.parse(path);
    }

    private void send(ExamEnrolment enrolment, PathProperties pp) throws IOException {
        String ref = enrolment.getCollaborativeExam().getExternalRef();
        Logger.debug("Sending back collaborative assessment for exam " + ref);
        URL url = parseUrl(ref);
        List<CompletableFuture> futures = new ArrayList<>();
        // Create external attachments.
        if (enrolment.getExam().getAttachment() != null) {
            futures.add(externalAttachmentLoader.createExternalAttachment(enrolment.getExam().getAttachment()));
        }
        enrolment.getExam().getExamSections().stream()
                .flatMap(s -> s.getSectionQuestions().stream())
                .flatMap(sq -> {
                    List<Attachment> attachments = new ArrayList<>();
                    if (sq.getEssayAnswer() != null && sq.getEssayAnswer().getAttachment() != null) {
                        attachments.add(sq.getEssayAnswer().getAttachment());
                    }
                    if (sq.getQuestion().getAttachment() != null) {
                        attachments.add(sq.getQuestion().getAttachment());
                    }
                    return attachments.stream();
                }).forEach(a -> futures.add(externalAttachmentLoader.createExternalAttachment(a)));

        WSRequest request = wsClient.url(url.toString());
        request.setContentType("application/json");
        Function<WSResponse, Void> onSuccess = response -> {
            if (response.getStatus() != 201) {
                Logger.error("Failed in sending assessment for exam " + ref);
            } else {
                enrolment.setSentForReview(DateTime.now());
                enrolment.update();
                Logger.info("Assessment for exam " + ref + " processed successfully");
            }
            return null;
        };

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenComposeAsync(aVoid -> request.post(Ebean.json().toJson(enrolment, pp)))
                .thenApplyAsync(onSuccess)
                .exceptionally(t -> {
                    Logger.error("Could not send assessment to xm! [id=" + enrolment.getId() + "]", t);
                    return null;
                });
    }

    private static URL parseUrl(String examRef) throws MalformedURLException {
        return new URL(ConfigFactory.load().getString("sitnet.integration.iop.host") +
                String.format("/api/exams/%s/assessments", examRef));
    }

}
