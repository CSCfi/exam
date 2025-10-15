// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers.validation;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import play.libs.Json;
import play.mvc.Result;
import play.mvc.Results;

public final class ValidationResult {

    private final List<FieldError> errors;

    private ValidationResult(List<FieldError> errors) {
        this.errors = errors;
    }

    public static ValidationResult ok() {
        return new ValidationResult(Collections.emptyList());
    }

    public static ValidationResult error(String field, String message) {
        return new ValidationResult(List.of(new FieldError(field, message)));
    }

    public static ValidationResult withErrors(List<FieldError> errors) {
        return new ValidationResult(errors);
    }

    public boolean isValid() {
        return errors.isEmpty();
    }

    public List<FieldError> getErrors() {
        return errors;
    }

    public Optional<Result> toPlayResult() {
        if (isValid()) {
            return Optional.empty();
        }
        return Optional.of(Results.badRequest(Json.toJson(errors)));
    }

    @Override
    public String toString() {
        return errors.toString();
    }
}
