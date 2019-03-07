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
import io.ebean.text.PathProperties;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;

import backend.models.ExamEnrolment;
import backend.models.json.ExternalExam;

public class AssessmentTransferActor extends AbstractActor {

    private static final Logger.ALogger logger = Logger.of(AssessmentTransferActor.class);

    private WSClient wsClient;

    @Inject
    public AssessmentTransferActor(WSClient wsClient) {
        this.wsClient = wsClient;
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder().match(String.class, s -> {
            logger.debug("Assessment transfer check started ->");
            List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                    .where()
                    .isNotNull("externalExam")
                    .isNull("externalExam.sent")
                    .isNotNull("externalExam.started")
                    .isNotNull("externalExam.finished")
                    .isNotNull("reservation.externalRef")
                    .findList();
            enrolments.forEach(e -> {
                try {
                    send(e);
                } catch (IOException ex) {
                    logger.error("I/O failure while sending assessment to proxy server", ex);
                }
            });
            logger.debug("<- done");
        }).build();
    }

    private void send(ExamEnrolment enrolment) throws IOException {
        String ref = enrolment.getReservation().getExternalRef();
        logger.debug("Transferring back assessment for reservation " + ref);
        URL url = parseUrl(ref);
        WSRequest request = wsClient.url(url.toString());
        ExternalExam ee = enrolment.getExternalExam();
        Function<WSResponse, Void> onSuccess = response -> {
            if (response.getStatus() != 201) {
                logger.error("Failed in transferring assessment for reservation " + ref);
            } else {
                ee.setSent(DateTime.now());
                ee.update();
                logger.info("Assessment transfer for reservation " + ref + " processed successfully");
            }
            return null;
        };
        String json = Ebean.json().toJson(ee, PathProperties.parse("(*, creator(id))"));
        ObjectMapper om = new ObjectMapper();
        JsonNode node = om.readTree(json);
        request.post(node).thenApplyAsync(onSuccess);
    }

    private static URL parseUrl(String reservationRef) throws MalformedURLException {
        return new URL(ConfigFactory.load().getString("sitnet.integration.iop.host") +
                String.format("/api/enrolments/%s/assessment", reservationRef));
    }

}
