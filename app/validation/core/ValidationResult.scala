// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.core

import scala.jdk.CollectionConverters.*

/** Result of validation, containing zero or more field errors.
  */
case class ValidationResult(errors: List[FieldError]):
  def isValid: Boolean            = errors.isEmpty
  def getErrors: List[FieldError] = errors
  override def toString: String   = errors.toString

object ValidationResult:
  def ok(): ValidationResult = ValidationResult(List.empty)
  def error(field: String, message: String): ValidationResult =
    ValidationResult(List(FieldError(field, message)))
  def withErrors(errors: List[FieldError]): ValidationResult =
    ValidationResult(errors)
  // Java interop: accept java.util.List
  def withErrors(errors: java.util.List[FieldError]): ValidationResult =
    ValidationResult(errors.asScala.toList)
