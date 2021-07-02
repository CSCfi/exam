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

package controllers.iop.transfer.impl;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import controllers.base.BaseController;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import javax.inject.Inject;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;

public class OrganisationController extends BaseController {

    @Inject
    private WSClient wsClient;

    private static URL parseUrl() throws MalformedURLException {
        return new URL(
            ConfigFactory.load().getString("sitnet.integration.iop.host") + "/api/organisations?withFacilities=true"
        );
    }

    @Restrict({ @Group("STUDENT"), @Group("TEACHER") })
    public CompletionStage<Result> listOrganisations() throws MalformedURLException {
        URL url = parseUrl();
        WSRequest request = wsClient.url(url.toString());
        String localRef = ConfigFactory.load().getString("sitnet.integration.iop.organisationRef");

        Function<WSResponse, Result> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != 200) {
                return internalServerError(root.get("message").asText("Connection refused"));
            }
            if (root instanceof ArrayNode) {
                ArrayNode node = (ArrayNode) root;
                for (JsonNode n : node) {
                    ((ObjectNode) n).put("homeOrg", n.get("_id").asText().equals(localRef));
                }
            }
            return ok(root);
        };
        return request.get().thenApplyAsync(onSuccess);
    }
}
