// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

import validation.scala.core.SanitizingException

/**
 * Exception thrown when validation fails.
 * Carries structured field-level errors that can be returned to the client.
 */
class ValidationException(val validationResult: ValidationResult)
    extends SanitizingException(ValidationException.buildMessage(validationResult)):

  // Java interop getter
  def getValidationResult: ValidationResult = validationResult

object ValidationException:
  private def buildMessage(result: ValidationResult): String =
    if result.errors.isEmpty then "Validation failed"
    else s"Validation failed: ${result.errors}"

