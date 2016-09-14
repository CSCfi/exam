package models.api;


import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Result;

import java.util.Optional;

public interface Scorable {

    Double getAssessedScore();
    Double getMaxAssessedScore();
    boolean isRejected();
    boolean isApproved();
    Optional<Result> getValidationResult(JsonNode node);

}
