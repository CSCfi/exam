package backend.controllers.iop.collaboration.impl;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.CompletionStage;
import java.util.stream.StreamSupport;
import javax.inject.Inject;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.typesafe.config.ConfigFactory;
import io.ebean.Model;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.concurrent.HttpExecutionContext;
import play.libs.ws.WSClient;
import play.mvc.Result;

import backend.controllers.base.BaseController;
import backend.controllers.iop.collaboration.api.CollaborativeExamLoader;
import backend.impl.ExamUpdater;
import backend.models.Exam;
import backend.models.Role;
import backend.models.User;
import backend.models.json.CollaborativeExam;

public class CollaborationController extends BaseController {

    @Inject
    WSClient wsClient;

    @Inject
    protected ExamUpdater examUpdater;

    @Inject
    protected CollaborativeExamLoader examLoader;

    @Inject
    protected HttpExecutionContext ec;

    private Random random = new Random();


    Optional<URL> parseUrl() {
        String url = String.format("%s/api/exams", ConfigFactory.load().getString("sitnet.integration.iop.host"));
        try {
            return Optional.of(new URL(url));
        } catch (MalformedURLException e) {
            Logger.error("Malformed URL {}", e);
            return Optional.empty();
        }
    }

    protected CompletionStage<Optional<Exam>> downloadExam(CollaborativeExam ce) {
        return examLoader.downloadExam(ce);
    }

    void updateLocalReferences(JsonNode root, Map<String, CollaborativeExam> locals) {
        // Save references to documents that we don't have locally yet
        StreamSupport.stream(root.spliterator(), false)
                .filter(node -> !locals.keySet().contains(node.get("_id").asText()))
                .forEach(node -> {
                    String ref = node.get("_id").asText();
                    String rev = node.get("_rev").asText();
                    CollaborativeExam ce = new CollaborativeExam();
                    ce.setExternalRef(ref);
                    ce.setRevision(rev);
                    ce.setCreated(DateTime.now());
                    ce.save();
                    locals.put(ref, ce);
                });
    }

    CompletionStage<Result> uploadExam(CollaborativeExam ce, Exam content, boolean isPrePublication,
                                       Model resultModel, User sender) {
        return examLoader.uploadExam(ce, content, isPrePublication, resultModel, sender);
    }

    JsonNode serialize(Exam exam) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            String json = mapper.writeValueAsString(exam);
            return mapper.readTree(json);
        } catch (IOException e) {
            Logger.error("unable to serialize");
            throw new RuntimeException(e);
        }
    }

    boolean isAuthorizedToView(Exam exam, User user, Role.Name loginRole) {
        return loginRole == Role.Name.ADMIN || (
                exam.getExamOwners().stream().anyMatch(u ->
                        u.getEmail().equals(user.getEmail()) || u.getEmail().equals(user.getEppn()))
                        && exam.hasState(Exam.State.PRE_PUBLISHED, Exam.State.PUBLISHED)
        );
    }

    long newId() {
        return Math.abs(random.nextLong());
    }
}
