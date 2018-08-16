package backend.controllers.iop.collaboration;

import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.Ebean;
import io.ebean.text.PathProperties;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;

import backend.models.Exam;
import backend.models.ExamExecutionType;
import backend.models.json.CollaborativeExam;

public class CollaborativeEnrolmentController extends CollaborationController {

    private boolean isEnrollable(Exam exam) {
        return exam.getState() == Exam.State.PUBLISHED &&
                exam.getExecutionType().getType().equals(ExamExecutionType.Type.PUBLIC.toString()) &&
                exam.getExamActiveEndDate().isAfterNow() &&
                exam.getExamActiveStartDate().isBeforeNow();
    }


    @Restrict({@Group("STUDENT")})
    public CompletionStage<Result> listExams() {
        Optional<URL> url = parseUrl(null);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }

        WSRequest request = wsClient.url(url.get().toString());
        Function<WSResponse, Result> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != OK) {
                return internalServerError(root.get("message").asText("Connection refused"));
            }

            Map<String, CollaborativeExam> locals = Ebean.find(CollaborativeExam.class).findSet().stream()
                    .collect(Collectors.toMap(CollaborativeExam::getExternalRef, Function.identity()));

            updateLocalReferences(root, locals);

            Map<CollaborativeExam, JsonNode> localToExternal = StreamSupport.stream(root.spliterator(), false)
                    .collect(Collectors.toMap(node -> locals.get(node.get("_id").asText()), Function.identity()));

            List<Exam> exams = localToExternal.entrySet().stream().map(e -> e.getKey().getExam(e.getValue()))
                    .filter(this::isEnrollable).collect(Collectors.toList());

            return ok(exams, PathProperties.parse(
                    "(examOwners(firstName, lastName), examInspections(user(firstName, lastName))" +
                            "examLanguages(code, name), id, name, examActiveStartDate, examActiveEndDate, " +
                            "enrollInstruction)"));
        };
        return request.get().thenApplyAsync(onSuccess);
    }

}

/*

.select("id, name, examActiveStartDate, examActiveEndDate, enrollInstruction")
                .fetch("course", "code, name")
                .fetch("examOwners", "firstName, lastName")
                .fetch("examInspections.user", "firstName, lastName")
                .fetch("examLanguages", "code, name", new FetchConfig().query())
                .fetch("creator", "firstName, lastName")

 */
