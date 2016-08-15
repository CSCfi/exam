package controllers.iop;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import controllers.base.BaseController;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;

import javax.inject.Inject;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;

public class OrganisationController extends BaseController {

    @Inject
    protected WSClient wsClient;

    private static URL parseUrl() throws MalformedURLException {
        StringBuilder url = new StringBuilder(ConfigFactory.load().getString("sitnet.integration.iop.host"));
        url.append("/api/organisations");
        return new URL(url.toString());
    }

    @Restrict({@Group("STUDENT")})
    public CompletionStage<Result> listOrganisations() throws MalformedURLException {
        URL url = parseUrl();
        WSRequest request = wsClient.url(url.toString());
        String localRef = ConfigFactory.load().getString("sitnet.integration.iop.organisationRef");

        Function<WSResponse, Result>  onSuccess = response -> {
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
