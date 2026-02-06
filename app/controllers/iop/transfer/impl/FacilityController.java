// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.NullNode;
import controllers.base.BaseController;
import controllers.iop.transfer.api.ExternalFacilityAPI;
import io.ebean.DB;
import io.ebean.text.PathProperties;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import javax.inject.Inject;
import miscellaneous.config.ConfigReader;
import models.facility.ExamRoom;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

public class FacilityController extends BaseController implements ExternalFacilityAPI {

    @Inject
    private WSClient wsClient;

    @Inject
    private ConfigReader configReader;

    private URL parseUrl(String facilityRef) throws MalformedURLException {
        StringBuilder url = new StringBuilder(configReader.getIopHost());
        String orgRef = configReader.getHomeOrganisationRef();
        url.append(String.format("/api/organisations/%s/facilities", orgRef));
        if (facilityRef != null) {
            url.append(String.format("/%s", facilityRef));
        }
        return URI.create(url.toString()).toURL();
    }

    private URL parseExternalUrl(String orgRef) throws MalformedURLException {
        return URI.create(
            configReader.getIopHost() + String.format("/api/organisations/%s/facilities", orgRef)
        ).toURL();
    }

    private String toJson(ExamRoom room) {
        PathProperties pp = PathProperties.parse(
            "(*, defaultWorkingHours(*), calendarExceptionEvents(*), mailAddress(*), " +
                "examStartingHours(*), accessibilities(*))"
        );
        return DB.json().toJson(room, pp);
    }

    @Restrict({ @Group("ADMIN") })
    public CompletionStage<Result> updateFacility(Long id) throws MalformedURLException {
        ExamRoom room = DB.find(ExamRoom.class, id);
        if (room == null) {
            return CompletableFuture.completedFuture(Results.notFound());
        }
        URL url = parseUrl(room.getExternalRef());
        WSRequest request = wsClient.url(url.toString()).setContentType("application/json");
        if (room.getExternalRef() == null && !room.getState().equals(ExamRoom.State.INACTIVE.toString())) {
            // Add new
            Function<WSResponse, Result> onSuccess = response -> {
                JsonNode root = response.asJson();
                if (response.getStatus() != Http.Status.CREATED) {
                    return internalServerError(root.get("message").asText("Connection refused"));
                }
                String externalRef = root.get("id").asText();
                room.setExternalRef(externalRef);
                room.update();
                return ok(Json.newObject().put("externalRef", externalRef));
            };
            return request.post(toJson(room)).thenApplyAsync(onSuccess);
        } else if (room.getExternalRef() != null) {
            // Remove
            Function<WSResponse, Result> onSuccess = response -> {
                int status = response.getStatus();
                if (status == Http.Status.NOT_FOUND || status == Http.Status.OK) {
                    // 404 would mean that facility does not exist remotely, remove its reference here also
                    room.setExternalRef(null);
                    room.update();
                } else {
                    return internalServerError("Connection refused");
                }
                JsonNode ref = Json.newObject().set("externalRef", NullNode.getInstance());
                return ok(ref);
            };
            return request.delete().thenApplyAsync(onSuccess);
        } else {
            // Tried to add an inactive facility
            return CompletableFuture.completedFuture(Results.badRequest());
        }
    }

    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> listFacilities(Optional<String> organisation) throws MalformedURLException {
        if (organisation.isEmpty()) {
            return wrapAsPromise(badRequest());
        }
        URL url = parseExternalUrl(organisation.get());
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, Result> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != Http.Status.OK) {
                return internalServerError(root.get("message").asText("Connection refused"));
            }
            return ok(root);
        };
        return request.get().thenApplyAsync(onSuccess);
    }

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
