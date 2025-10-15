// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers.validation;

/**
 * Represents a validation error for a specific field.
 *
 * <p>This class is serializable and will be converted to JSON when returned to the client:
 * <pre>{@code
 * {
 *   "field": "name",
 *   "message": "Exam name is required"
 * }
 * }</pre>
 */
public class FieldError {

    private final String field;
    private final String message;

    public FieldError(String field, String message) {
        this.field = field;
        this.message = message;
    }

    public String getField() {
        return field;
    }

    public String getMessage() {
        return message;
    }

    @Override
    public String toString() {
        return String.format("%s: %s", field, message);
    }
}
