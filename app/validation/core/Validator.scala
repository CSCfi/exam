// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.core

import cats.data.{NonEmptyList, ValidatedNel}
import cats.implicits._
import com.fasterxml.jackson.databind.{JsonNode, ObjectMapper}
import validation.core.{FieldError, ValidationException, ValidationResult}

import scala.jdk.CollectionConverters._
import scala.util.Try

/** Generic validator for any type T.
  *
  * Provides a fluent API for composing validation rules that accumulate errors.
  *
  * Example usage:
  * {{{
  * val validator = Validator[User](parseUser)
  *   .withRule(u => requireField("name", u.getName))
  *   .withRule(u => requireField("email", u.getEmail))
  *   .withRule(validateEmailFormat)
  *
  * validator.validate(jsonNode) match
  *   case Right(user) => // valid user
  *   case Left(exception) => // handle validation errors
  * }}}
  *
  * @param parser
  *   Function to parse JSON into type T
  * @param rules
  *   List of validation rules to apply
  * @tparam T
  *   The type being validated
  */
class Validator[T] private (
    parser: JsonNode => T,
    rules: List[T => ValidatedNel[FieldError, ?]]
):

  /** Add a validation rule. Rules are accumulated, and all will be executed collecting all errors.
    */
  def withRule(rule: T => ValidatedNel[FieldError, ?]): Validator[T] =
    new Validator(parser, rules :+ rule)

  /** Parse JSON and validate the result. Returns Either with all accumulated validation errors or the valid object.
    */
  def validate(body: JsonNode): Either[ValidationException, T] =
    val target = parser(body)

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

object Validator:

  /** Create a new validator with a parser function.
    *
    * @param parser
    *   Function to parse JSON into type T
    * @tparam T
    *   The type to validate
    * @return
    *   A new validator with no rules
    */
  def apply[T](parser: JsonNode => T): Validator[T] =
    new Validator(parser, List.empty)

  // Numeric instances for Java boxed types
  given Numeric[Integer] with
    def plus(x: Integer, y: Integer): Integer     = x + y
    def minus(x: Integer, y: Integer): Integer    = x - y
    def times(x: Integer, y: Integer): Integer    = x * y
    def negate(x: Integer): Integer               = -x
    def fromInt(x: Int): Integer                  = x
    def parseString(str: String): Option[Integer] = str.toIntOption.map(Integer.valueOf)
    def toInt(x: Integer): Int                    = x.intValue()
    def toLong(x: Integer): Long                  = x.longValue()
    def toFloat(x: Integer): Float                = x.floatValue()
    def toDouble(x: Integer): Double              = x.doubleValue()
    def compare(x: Integer, y: Integer): Int      = x.compareTo(y)

  given Numeric[java.lang.Long] with
    def plus(x: java.lang.Long, y: java.lang.Long): java.lang.Long  = x + y
    def minus(x: java.lang.Long, y: java.lang.Long): java.lang.Long = x - y
    def times(x: java.lang.Long, y: java.lang.Long): java.lang.Long = x * y
    def negate(x: java.lang.Long): java.lang.Long                   = -x
    def fromInt(x: Int): java.lang.Long                             = x.toLong
    def parseString(str: String): Option[java.lang.Long]            = str.toLongOption.map(java.lang.Long.valueOf)
    def toInt(x: java.lang.Long): Int                               = x.intValue()
    def toLong(x: java.lang.Long): Long                             = x.longValue()
    def toFloat(x: java.lang.Long): Float                           = x.floatValue()
    def toDouble(x: java.lang.Long): Double                         = x.doubleValue()
    def compare(x: java.lang.Long, y: java.lang.Long): Int          = x.compareTo(y)

  given Numeric[java.lang.Double] with
    def plus(x: java.lang.Double, y: java.lang.Double): java.lang.Double  = x + y
    def minus(x: java.lang.Double, y: java.lang.Double): java.lang.Double = x - y
    def times(x: java.lang.Double, y: java.lang.Double): java.lang.Double = x * y
    def negate(x: java.lang.Double): java.lang.Double                     = -x
    def fromInt(x: Int): java.lang.Double                                 = x.toDouble
    def parseString(str: String): Option[java.lang.Double]     = str.toDoubleOption.map(java.lang.Double.valueOf)
    def toInt(x: java.lang.Double): Int                        = x.intValue()
    def toLong(x: java.lang.Double): Long                      = x.longValue()
    def toFloat(x: java.lang.Double): Float                    = x.floatValue()
    def toDouble(x: java.lang.Double): Double                  = x.doubleValue()
    def compare(x: java.lang.Double, y: java.lang.Double): Int = x.compareTo(y)

  // ========== Common Validation Helpers ==========

  /** Validates that a field is not null and not empty.
    */
  def requireField(fieldName: String, value: String): ValidatedNel[FieldError, String] =
    Option(value)
      .filter(_.trim.nonEmpty)
      .toValidNel(FieldError(fieldName, s"$fieldName is required"))

  /** Validates that a numeric field is present and greater than zero. Works with any numeric type (Int, Long, Double,
    * etc.)
    */
  def requirePositive[T: Numeric](fieldName: String, value: T): ValidatedNel[FieldError, T] =
    val num = summon[Numeric[T]]
    Option(value)
      .filter(v => num.gt(v, num.zero))
      .toValidNel(FieldError(fieldName, s"$fieldName must be greater than 0"))

  /** Validates that a string contains valid JSON.
    */
  def requireJson(fieldName: String, value: String): ValidatedNel[FieldError, String] =
    Option(value)
      .filter(_.trim.nonEmpty)
      .flatMap { json =>
        Try(new ObjectMapper().readTree(json)).toOption.map(_ => json)
      }
      .toValidNel(FieldError(fieldName, s"$fieldName must be valid JSON"))

  /** Validates that an object field is not null.
    */
  def requirePresent[A](fieldName: String, value: A): ValidatedNel[FieldError, A] =
    Option(value)
      .toValidNel(FieldError(fieldName, s"$fieldName is required"))

  /** Validates that a collection is not empty.
    */
  def requireNonEmpty[T](fieldName: String, collection: List[T]): ValidatedNel[FieldError, List[T]] =
    if collection.isEmpty then invalid(fieldName, s"$fieldName cannot be empty") else valid(collection)

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
