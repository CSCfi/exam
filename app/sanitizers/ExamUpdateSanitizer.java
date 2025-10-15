// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Http;
import sanitizers.validation.ExamValidator;
import sanitizers.validation.ValidationException;

/**
 * Sanitizes and validates exam update requests.
 *
 * <p>This sanitizer:
 * <ol>
 *   <li>Parses all fields from JSON with HTML sanitization where applicable</li>
 *   <li>Builds a single Exam object containing the sanitized fields</li>
 *   <li>Validates using strict rules (name, duration, published exam constraints)</li>
 *   <li>Provides the validated Exam object via {@link Attrs#EXAM}</li>
 * </ol>
 *
 * <p>The Exam object serves as a data holder only - it's not persisted directly.
 * Controller/service code should copy non-null fields to the actual database entity.
 *
 * <p><b>Validation:</b> Uses {@link sanitizers.validation.ExamValidator#forUpdate()}
 * which requires name, duration, and enforces published exam constraints.
 *
 * <p><b>Usage in controller:</b>
 * <pre>{@code
 * @With(ExamUpdateSanitizer.class)
 * public Result updateExam(Long id, Http.Request request) {
 *     Exam examData = request.attrs().get(Attrs.EXAM);
 *     Exam dbExam = findExam(id);
 *
 *     // Copy non-null fields from validated data
 *     if (examData.getName() != null) {
 *         dbExam.setName(examData.getName());
 *     }
 *     // ... etc
 * }
 * }</pre>
 *
 * <p><b>Note:</b> See ExamUpdateSanitizer.java.old for the original implementation
 * that used multiple separate attributes.
 */
public class ExamUpdateSanitizer extends BaseSanitizer {

    @Override
    protected Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        // Parse JSON and validate with strict rules
        ExamValidator validator = ExamValidator.forUpdate(body);

        if (!validator.validationResult().isValid()) {
            throw new ValidationException(validator.validationResult());
        }

        // Add the validated Exam object as an attribute
        return req.addAttr(Attrs.EXAM, validator.getValidatedExam());
    }
}
