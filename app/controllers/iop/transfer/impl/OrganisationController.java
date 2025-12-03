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
import miscellaneous.cache.FacilityCache;
import miscellaneous.config.ConfigReader;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import system.interceptors.SensitiveDataPolicy;

public class OrganisationController extends BaseController {

    @Inject
    private WSClient wsClient;

    @Inject
    private ConfigReader configReader;

    @Inject
    private FacilityCache facilityCache;

    private URL parseUrl() throws MalformedURLException {
        return URI.create(configReader.getIopHost() + "/api/organisations?withFacilities=true").toURL();
    }

    @Restrict({ @Group("STUDENT"), @Group("TEACHER"), @Group("ADMIN") })
    @SensitiveDataPolicy(sensitiveFieldNames = { "internalPassword", "externalPassword" })
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
                for (JsonNode org : node) {
                    ((ObjectNode) org).put("homeOrg", org.get("_id").asText().equals(localRef));

                    // Cache facility data for external organizations and set the password requirement flag
                    if (org.has("facilities") && org.get("facilities").isArray()) {
                        ArrayNode facilities = (ArrayNode) org.get("facilities");
                        for (JsonNode facility : facilities) {
                            ObjectNode facilityObj = (ObjectNode) facility;
                            JsonNode passwordNode = facility.get("externalPassword");
                            boolean hasPassword =
                                passwordNode != null &&
                                !passwordNode.isNull() &&
                                !passwordNode.asText().trim().isEmpty();

                            // Set the flag for a client to know if a password is required
                            facilityObj.put("externalPasswordRequired", hasPassword);

                            if (facility.has("_id") && hasPassword) {
                                String facilityId = facility.get("_id").asText();
                                String password = facility.get("externalPassword").asText();
                                facilityCache.storeFacilityPassword(facilityId, password);
                            }
                        }
                    }
                }
            }
            return ok(root);
        };
        return request.get().thenApplyAsync(onSuccess);
    }
}
