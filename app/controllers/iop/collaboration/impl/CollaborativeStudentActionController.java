/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */

package controllers.iop.collaboration.impl;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import models.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;
import sanitizers.Attrs;
import security.Authenticated;

public class CollaborativeStudentActionController extends CollaborationController {

    private final WSClient wsClient;

    private final Logger logger = LoggerFactory.getLogger(CollaborativeStudentActionController.class);

    @Inject
    public CollaborativeStudentActionController(WSClient wsClient) {
        this.wsClient = wsClient;
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> getFinishedExams(Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        final Optional<URL> url = parseUrl();
        if (url.isEmpty()) {
            return wrapAsPromise(internalServerError());
        }
        final WSRequest wsRequest = wsClient.url(url.get().toString() + user.getEppn());
        return wsRequest
            .get()
            .thenComposeAsync(response -> {
                if (response.getStatus() != Http.Status.OK) {
                    return wrapAsPromise(Results.status(response.getStatus()));
                }
                final JsonNode root = response.asJson();
                calculateScores(root);
                return wrapAsPromise(ok(root));
            });
    }

    Optional<URL> parseUrl() {
        String url = String.format("%s/api/assessments/user?eppn=", configReader.getIopHost());
        try {
            return Optional.of(URI.create(url).toURL());
        } catch (MalformedURLException e) {
            logger.error("Malformed URL", e);
            return Optional.empty();
        }
    }
}
