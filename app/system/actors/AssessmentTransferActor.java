// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.ebean.DB;
import io.ebean.text.PathProperties;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.List;
import java.util.function.Function;
import javax.inject.Inject;
import models.ExamEnrolment;
import models.json.ExternalExam;
import org.apache.pekko.actor.AbstractActor;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import util.config.ConfigReader;

public class AssessmentTransferActor extends AbstractActor {

    private final Logger logger = LoggerFactory.getLogger(AssessmentTransferActor.class);

    private final WSClient wsClient;
    private final ConfigReader configReader;

    @Inject
    public AssessmentTransferActor(WSClient wsClient, ConfigReader configReader) {
        this.wsClient = wsClient;
        this.configReader = configReader;
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder()
            .match(
                String.class,
                s -> {
                    logger.debug("Assessment transfer check started ->");
                    List<ExamEnrolment> enrolments = DB
                        .find(ExamEnrolment.class)
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
                }
            )
            .build();
    }

    private void send(ExamEnrolment enrolment) throws IOException {
        String ref = enrolment.getReservation().getExternalRef();
        logger.debug("Transferring back assessment for reservation {}", ref);
        URL url = parseUrl(ref);
        WSRequest request = wsClient.url(url.toString());
        ExternalExam ee = enrolment.getExternalExam();
        Function<WSResponse, Void> onSuccess = response -> {
            if (response.getStatus() != Http.Status.CREATED) {
                logger.error("Failed in transferring assessment for reservation {}", ref);
            } else {
                ee.setSent(DateTime.now());
                ee.update();
                logger.info("Assessment transfer for reservation {} processed successfully", ref);
            }
            return null;
        };
        String json = DB.json().toJson(ee, PathProperties.parse("(*, creator(id))"));
        ObjectMapper om = new ObjectMapper();
        JsonNode node = om.readTree(json);
        request.post(node).thenApplyAsync(onSuccess);
    }

    private URL parseUrl(String reservationRef) throws MalformedURLException {
        return URI
            .create(configReader.getIopHost() + String.format("/api/enrolments/%s/assessment", reservationRef))
            .toURL();
    }
}
