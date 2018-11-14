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

package backend.controllers.iop.transfer.impl;


import java.net.MalformedURLException;
import java.net.URL;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import javax.inject.Inject;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.text.PathProperties;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;
import play.mvc.Results;

import backend.controllers.base.BaseController;
import backend.controllers.iop.transfer.api.ExternalFacilityAPI;
import backend.models.ExamRoom;

public class FacilityController extends BaseController implements ExternalFacilityAPI {

    @Inject
    private WSClient wsClient;

    private static URL parseUrl(String facilityRef) throws MalformedURLException {
        StringBuilder url = new StringBuilder(ConfigFactory.load().getString("sitnet.integration.iop.host"));
        String orgRef = ConfigFactory.load().getString("sitnet.integration.iop.organisationRef");
        url.append(String.format("/api/organisations/%s/facilities", orgRef));
        if (facilityRef != null) {
            url.append(String.format("/%s", facilityRef));
        }
        return new URL(url.toString());
    }

    private static URL parseExternalUrl(String orgRef) throws MalformedURLException {
        return new URL(ConfigFactory.load().getString("sitnet.integration.iop.host") +
                String.format("/api/organisations/%s/facilities", orgRef));
    }

    private String toJson(ExamRoom room) {
        PathProperties pp = PathProperties.parse(
                "(*, defaultWorkingHours(*), calendarExceptionEvents(*), mailAddress(*), " +
                        "examStartingHours(*), accessibilities(*))");
        return Ebean.json().toJson(room, pp);
    }

    @Restrict({@Group("ADMIN")})
    public CompletionStage<Result> updateFacility(Long id) throws MalformedURLException {
        ExamRoom room = Ebean.find(ExamRoom.class, id);
        if (room == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        URL url = parseUrl(room.getExternalRef());
        WSRequest request = wsClient.url(url.toString()).setContentType("application/json");
        if (room.getExternalRef() == null && !room.getState().equals(ExamRoom.State.INACTIVE.toString())) {
            // Add new
            Function<WSResponse, Result>  onSuccess = response -> {
                JsonNode root = response.asJson();
                if (response.getStatus() != 201) {
                    return internalServerError(root.get("message").asText("Connection refused"));
                }
                String externalRef = root.get("id").asText();
                room.setExternalRef(externalRef);
                room.update();
                return ok(Json.newObject().put("externalRef", externalRef));
            };
            return request.post(toJson(room)).thenApplyAsync(onSuccess);
        } else if (room.getExternalRef() != null){
            // Remove
            Function<WSResponse, Result>  onSuccess = response -> {
                int status = response.getStatus();
                if (status == 404 || status == 200) {
                    // 404 would mean that facility does not exist remotely, remove its reference here also
                    room.setExternalRef(null);
                    room.update();
                } else {
                    return internalServerError("Connection refused");
                }
                return ok(Json.newObject().set("externalRef", NullNode.getInstance()));
            };
            return request.delete().thenApplyAsync(onSuccess);
        } else {
            // Tried to add an inactive facility
            return CompletableFuture.supplyAsync(Results::badRequest);
        }
    }

    @Restrict({@Group("STUDENT")})
    public CompletionStage<Result> listFacilities(Optional<String> organisation) throws MalformedURLException {
        if (!organisation.isPresent()) {
            return wrapAsPromise(badRequest());
        }
        URL url = parseExternalUrl(organisation.get());
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, Result>  onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != 200) {
                return internalServerError(root.get("message").asText("Connection refused"));
            }
            return ok(root);
        };
        return request.get().thenApplyAsync(onSuccess);
    };

    @Override
    public CompletionStage<Result> updateFacility(ExamRoom room) throws MalformedURLException {
        URL url = parseUrl(room.getExternalRef());
        WSRequest request = wsClient.url(url.toString()).setContentType("application/json");
        return request.put(toJson(room)).thenApplyAsync(response -> ok(room));
    }

    @Override
    public CompletionStage<Result> activateFacility(Long roomId) throws MalformedURLException {
        return updateFacility(roomId);
    }

    @Override
    public CompletionStage<Result> inactivateFacility(Long roomId) throws MalformedURLException {
        return updateFacility(roomId);
    }

}
