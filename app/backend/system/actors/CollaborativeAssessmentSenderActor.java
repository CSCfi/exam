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

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;
import java.util.function.Function;
import javax.inject.Inject;

import akka.actor.AbstractActor;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;

import backend.models.Exam;
import backend.models.ExamEnrolment;

public class CollaborativeAssessmentSenderActor extends AbstractActor {

    private WSClient wsClient;

    @Inject
    public CollaborativeAssessmentSenderActor(WSClient wsClient) {
        this.wsClient = wsClient;
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

    private JsonNode serialize(String data) throws IOException {
        ObjectMapper om = new ObjectMapper();
        return om.readTree(data);
    }

    private static PathProperties getPath() {
        String path = "(*, exam(id, name, state, instruction, hash, duration, executionType(id, type), " + // (
                "examLanguages(code), attachment(fileName), examOwners(firstName, lastName)" +
                "autoEvaluationConfig(*, gradeEvaluations(*, grade(*)))" +
                "examInspections(*, user(id, firstName, lastName))" +
                "gradeScale(*, grades(*))" +
                "examSections(id, name, sequenceNumber, description, lotteryOn, lotteryItemCount," + // ((
                "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, " + // (((
                "question(id, type, question, attachment(id, fileName), options(*))" +
                "options(*, option(*))" +
                "essayAnswer(id, answer, objectVersion, attachment(fileName))" +
                "clozeTestAnswer(id, question, answer, objectVersion)" +
                ")), examParticipation(started, ended)))";
        return PathProperties.parse(path);
    }

    private void send(ExamEnrolment enrolment, PathProperties pp) throws IOException {
        String ref = enrolment.getCollaborativeExam().getExternalRef();
        Logger.debug("Sending back collaborative assessment for exam " + ref);
        URL url = parseUrl(ref);
        WSRequest request = wsClient.url(url.toString());
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

        JsonNode body =  serialize(Ebean.json().toJson(enrolment, pp));
        request.post(body).thenApplyAsync(onSuccess);
    }

    private static URL parseUrl(String examRef) throws MalformedURLException {
        return new URL(ConfigFactory.load().getString("sitnet.integration.iop.host") +
                String.format("/api/exams/%s/assessments", examRef));
    }

}
