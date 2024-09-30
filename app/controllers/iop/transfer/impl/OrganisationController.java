// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.base.BaseController;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import javax.inject.Inject;
import miscellaneous.config.ConfigReader;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;

public class OrganisationController extends BaseController {

    @Inject
    private WSClient wsClient;

    @Inject
    private ConfigReader configReader;

    private URL parseUrl() throws MalformedURLException {
        return URI.create(configReader.getIopHost() + "/api/organisations?withFacilities=true").toURL();
    }

    @Restrict({ @Group("STUDENT"), @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> listOrganisations() throws MalformedURLException {
        URL url = parseUrl();
        WSRequest request = wsClient.url(url.toString());
        String localRef = configReader.getHomeOrganisationRef();

        Function<WSResponse, Result> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != Http.Status.OK) {
                return internalServerError(root.get("message").asText("Connection refused"));
            }
            if (root instanceof ArrayNode node) {
                for (JsonNode n : node) {
                    ((ObjectNode) n).put("homeOrg", n.get("_id").asText().equals(localRef));
                }
            }
            return ok(root);
        };
        return request.get().thenApplyAsync(onSuccess);
    }
}
