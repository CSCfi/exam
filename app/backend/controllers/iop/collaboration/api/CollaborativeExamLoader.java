package backend.controllers.iop.collaboration.api;

import java.util.Optional;
import java.util.concurrent.CompletionStage;

import com.google.inject.ImplementedBy;
import io.ebean.Model;
import play.mvc.Result;

import backend.controllers.iop.collaboration.impl.CollaborativeExamLoaderImpl;
import backend.models.Exam;
import backend.models.User;
import backend.models.json.CollaborativeExam;

@ImplementedBy(CollaborativeExamLoaderImpl.class)
public interface CollaborativeExamLoader {

    CompletionStage<Optional<Exam>> downloadExam(CollaborativeExam ce);
    CompletionStage<Result> uploadExam(CollaborativeExam ce, Exam content, boolean isPrePublication,
                                       Model resultModel, User sender);
    CompletionStage<Result> deleteExam(CollaborativeExam ce);
}
