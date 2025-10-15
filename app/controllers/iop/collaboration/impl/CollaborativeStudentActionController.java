// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

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
import models.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;
import security.Authenticated;
import validation.core.Attrs;

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
        final WSRequest wsRequest = wsClient.url(url.get() + user.getEppn());
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
