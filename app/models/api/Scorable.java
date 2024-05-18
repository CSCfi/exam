// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.api;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Optional;
import play.mvc.Result;

public interface Scorable {
    Double getAssessedScore();
    Double getMaxAssessedScore();
    boolean isRejected();
    boolean isApproved();
    Optional<Result> getValidationResult(JsonNode node);
}
