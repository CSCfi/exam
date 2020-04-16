package backend.controllers.iop.collaboration.api;

import backend.controllers.iop.collaboration.impl.CollaborativeExamLoaderImpl;
import backend.models.Exam;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import com.fasterxml.jackson.databind.JsonNode;
import com.google.inject.ImplementedBy;
import io.ebean.Model;
import io.ebean.text.PathProperties;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import play.mvc.Result;

@ImplementedBy(CollaborativeExamLoaderImpl.class)
public interface CollaborativeExamLoader {
  CompletionStage<Optional<Exam>> downloadExam(CollaborativeExam ce);

  CompletionStage<Optional<JsonNode>> downloadAssessment(String examRef, String assessmentRef);

  CompletionStage<Result> uploadExam(CollaborativeExam ce, Exam content, User sender);

  CompletionStage<Result> uploadExam(
    CollaborativeExam ce,
    Exam content,
    User sender,
    Model resultModel,
    PathProperties pp
  );

  CompletionStage<Optional<String>> uploadAssessment(CollaborativeExam ce, String ref, JsonNode payload);

  CompletionStage<Result> deleteExam(CollaborativeExam ce);
}
