// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.core

import cats.data.{NonEmptyList, ValidatedNel}
import cats.implicits._
import play.api.libs.json.JsValue

import scala.jdk.CollectionConverters._

/** Play JSON-based validator for any type T.
  *
  * Pure Scala alternative to Validator[T] that works with Play's JSON library. Provides a fluent
  * API for composing validation rules that accumulate errors.
  *
  * Example usage:
  * {{{
  * val validator = PlayValidator[User](parseUser)
  *   .withRule(u => PlayValidator.requireField("name", u.name))
  *   .withRule(u => PlayValidator.requireField("email", u.email))
  *   .withRule(validateEmailFormat)
  *
  * validator.validate(jsValue) match
  *   case Right(user) => // valid user
  *   case Left(exception) => // handle validation errors
  * }}}
  *
  * @param parser
  *   Function to parse JsValue into type T
  * @param rules
  *   List of validation rules to apply
  * @tparam T
  *   The type being validated
  */
class PlayValidator[T] private (
    parser: JsValue => T,
    rules: List[T => ValidatedNel[FieldError, ?]]
):

  /** Add a validation rule. Rules are accumulated, and all will be executed collecting all errors.
    */
  def withRule(rule: T => ValidatedNel[FieldError, ?]): PlayValidator[T] =
    new PlayValidator(parser, rules :+ rule)

  /** Parse JSON and validate the result. Returns Either with all accumulated validation errors or
    * the valid object.
    */
  def validate(json: JsValue): Either[ValidationException, T] =
    val target = parser(json)

    // Apply all rules and accumulate errors
    val validations = rules.map(rule => rule(target))

    // Combine all validations - if any fail, we get all errors
    val result = validations match
      case h :: t =>
        // Combine all validations using applicative - accumulates ALL errors
        t.foldLeft(h)((acc, validation) => (acc, validation).mapN((_, _) => ())).map(_ => target)
      case _ => target.validNel // No rules, valid by default

    result.toEither.left.map(errorsToException)

  private def errorsToException(errors: NonEmptyList[FieldError]): ValidationException =
    ValidationException(ValidationResult.withErrors(errors.toList.asJava))

object PlayValidator:

  /** Create a new validator with a parser function.
    *
    * @param parser
    *   Function to parse JsValue into type T
    * @tparam T
    *   The type to validate
    * @return
    *   A new validator with no rules
    */
  def apply[T](parser: JsValue => T): PlayValidator[T] =
    new PlayValidator(parser, List.empty)

  // ========== Common Validation Helpers ==========

  /** Validates that a field is not null and not empty.
    */
  def requireField(fieldName: String, value: String): ValidatedNel[FieldError, String] =
    Option(value)
      .filter(_.trim.nonEmpty)
      .toValidNel(FieldError(fieldName, s"$fieldName is required"))

  /** Validates that a numeric field is present and greater than zero.
    */
  def requirePositive[T: Numeric](fieldName: String, value: T): ValidatedNel[FieldError, T] =
    val num = summon[Numeric[T]]
    Option(value)
      .filter(v => num.gt(v, num.zero))
      .toValidNel(FieldError(fieldName, s"$fieldName must be greater than 0"))

  /** Validates that an object field is not null.
    */
  def requirePresent[A](fieldName: String, value: A): ValidatedNel[FieldError, A] =
    Option(value)
      .toValidNel(FieldError(fieldName, s"$fieldName is required"))

  /** Validates that a collection is not empty.
    */
  def requireNonEmpty[T](
      fieldName: String,
      collection: List[T]
  ): ValidatedNel[FieldError, List[T]] =
    if collection.isEmpty then invalid(fieldName, s"$fieldName cannot be empty")
    else valid(collection)

  /** Validates that a numeric value is within a range (inclusive).
    */
  def requireInRange[T: Numeric](
      fieldName: String,
      value: T,
      min: T,
      max: T
  ): ValidatedNel[FieldError, T] =
    val num = summon[Numeric[T]]
    if num.gteq(value, min) && num.lteq(value, max) then valid(value)
    else invalid(fieldName, s"$fieldName must be between $min and $max")

  /** Validates that a string matches a regex pattern.
    */
  def requirePattern(
      fieldName: String,
      value: String,
      pattern: String
  ): ValidatedNel[FieldError, String] =
    if value.matches(pattern) then valid(value)
    else invalid(fieldName, s"$fieldName has invalid format")

  /** Always valid - useful for conditional validation.
    */
  def valid[A](value: A): ValidatedNel[FieldError, A] = value.validNel

  /** Always invalid with a specific error.
    */
  def invalid[A](fieldName: String, message: String): ValidatedNel[FieldError, A] =
    FieldError(fieldName, message).invalidNel

  /** Conditional validation - only validates if a condition is true.
    */
  def when[A](
      condition: Boolean
  )(validation: => ValidatedNel[FieldError, A]): ValidatedNel[FieldError, Unit] =
    if condition then validation.map(_ => ())
    else ().validNel

  /** Validates that a string contains valid JSON.
    */
  def requireJson(fieldName: String, value: String): ValidatedNel[FieldError, String] =
    import play.api.libs.json.Json
    Option(value)
      .filter(_.trim.nonEmpty)
      .flatMap { json =>
        scala.util.Try(Json.parse(json)).toOption.map(_ => json)
      }
      .toValidNel(FieldError(fieldName, s"$fieldName must be valid JSON"))
