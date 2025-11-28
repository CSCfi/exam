// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

/** Functional interface for validation rules.
  *
  * Can be used from both Scala and Java:
  * {{{
  * // Scala
  * val rule: ValidationRule[Exam] = exam =>
  *   if (exam.getName == null) ValidationResult.error("name", "Required")
  *   else ValidationResult.ok()
  *
  * // Java
  * ValidationRule<Exam> rule = exam ->
  *   exam.getName() == null
  *     ? ValidationResult.error("name", "Required")
  *     : ValidationResult.ok();
  * }}}
  */
@FunctionalInterface
trait ValidationRule[T]:
  def validate(target: T): ValidationResult
