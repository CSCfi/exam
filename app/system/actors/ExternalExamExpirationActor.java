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

package system.actors;

import akka.actor.AbstractActor;
import io.ebean.Ebean;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import javax.inject.Inject;
import models.Attachment;
import models.json.ExternalExam;
import models.questions.EssayAnswer;
import models.sections.ExamSectionQuestion;
import play.Logger;
import play.libs.ws.WSClient;
import util.config.ConfigReader;

public class ExternalExamExpirationActor extends AbstractActor {

    private static final Logger.ALogger logger = Logger.of(ExternalExamExpirationActor.class);
    private static final int MONTHS_UNTIL_EXPIRATION = 4;

    private final ConfigReader configReader;
    private final WSClient wsClient;

    @Inject
    public ExternalExamExpirationActor(ConfigReader configReader, WSClient wsClient) {
        this.configReader = configReader;
        this.wsClient = wsClient;
    }

    private Optional<URL> parseUrl(String id) {
        String url = configReader.getIopHost() + "/api/attachments/" + id;
        try {
            return Optional.of(new URL(url));
        } catch (MalformedURLException e) {
            return Optional.empty();
        }
    }

    private CompletableFuture<Void> deleteAttachment(Attachment attachment) {
        Optional<URL> url = parseUrl(attachment.getExternalId());
        return CompletableFuture.runAsync(() -> url.ifPresent(value -> wsClient.url(value.toString()).delete()));
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder()
            .match(
                String.class,
                s -> {
                    logger.debug("Starting external exam expiration check ->");
                    Set<ExternalExam> exams = Ebean
                        .find(ExternalExam.class)
                        .where()
                        .isNotNull("sent")
                        .jsonExists("content", "id")
                        .findSet();

                    for (ExternalExam ee : exams) {
                        if (ee.getSent() == null) {
                            continue;
                        }
                        Set<Attachment> attachments = ee
                            .deserialize()
                            .getExamSections()
                            .stream()
                            .flatMap(es -> es.getSectionQuestions().stream())
                            .map(ExamSectionQuestion::getEssayAnswer)
                            .filter(ea -> ea != null && ea.getAttachment() != null)
                            .map(EssayAnswer::getAttachment)
                            .collect(Collectors.toSet());
                        CompletableFuture
                            .allOf(attachments.stream().map(this::deleteAttachment).toArray(CompletableFuture[]::new))
                            .thenRunAsync(() -> {
                                if (ee.getSent().plusMonths(MONTHS_UNTIL_EXPIRATION).isBeforeNow()) {
                                    ee.setContent(Collections.emptyMap());
                                    ee.update();
                                    logger.info("Marked external exam {} as expired", ee.getId());
                                }
                            });
                    }
                    logger.debug("<- done");
                }
            )
            .build();
    }
}
