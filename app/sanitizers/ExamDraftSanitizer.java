// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import play.mvc.Http;
import sanitizers.validation.ExamValidator;
import sanitizers.validation.ValidationException;

public class ExamDraftSanitizer extends BaseSanitizer {

    @Override
    protected Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        ExamValidator validator = ExamValidator.forCreation(body);

        if (!validator.validationResult().isValid()) {
            throw new ValidationException(validator.validationResult());
        }

        // Add the validated Exam object as an attribute
        return req.addAttr(Attrs.EXAM, validator.getValidatedExam());
    }
}
