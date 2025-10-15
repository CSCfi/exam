// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers.validation;

import sanitizers.SanitizingException;

/**
 * Exception thrown when validation fails.
 * Carries structured field-level errors that can be returned to the client.
 */
public class ValidationException extends SanitizingException {

    private final ValidationResult validationResult;

    public ValidationException(ValidationResult validationResult) {
        super(buildMessage(validationResult));
        this.validationResult = validationResult;
    }

    public ValidationResult getValidationResult() {
        return validationResult;
    }

    private static String buildMessage(ValidationResult result) {
        if (result.getErrors().isEmpty()) {
            return "Validation failed";
        }
        return "Validation failed: " + result.getErrors().toString();
    }
}
