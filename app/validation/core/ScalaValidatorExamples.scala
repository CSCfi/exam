// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.core

import play.api.libs.json._
import play.api.libs.typedmap.TypedKey
import play.api.mvc._

/** Example validators showing different patterns
  *
  * These examples demonstrate how to create custom Play JSON validators that work with the andThen pattern.
  */
object ScalaValidatorExamples:

  /** Example 1: Simple field validator
    */
  class ExampleFieldValidator extends PlayJsonValidator:
    val FIELD_KEY: TypedKey[String] = TypedKey[String]("exampleField")

    override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
      (json \ "fieldName").asOpt[String] match
        case Some(value) if value.nonEmpty =>
          Right(request.addAttr(FIELD_KEY, value))
        case Some(_) =>
          Left(Results.BadRequest("Field cannot be empty"))
        case None =>
          Left(Results.BadRequest("Missing required field"))

  /** Example 2: Validator with multiple fields
    */
  class ExampleMultiFieldValidator extends PlayJsonValidator:
    val NAME_KEY: TypedKey[String]  = TypedKey[String]("name")
    val EMAIL_KEY: TypedKey[String] = TypedKey[String]("email")

    override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
      ((json \ "name").asOpt[String], (json \ "email").asOpt[String]) match
        case (Some(name), Some(email)) =>
          Right(
            request
              .addAttr(NAME_KEY, name)
              .addAttr(EMAIL_KEY, email)
          )
        case _ =>
          Left(Results.BadRequest("Missing required fields"))

  /** Example 3: Validator with custom logic
    */
  class ExampleRangeValidator extends PlayJsonValidator:
    val START_KEY: TypedKey[Int] = TypedKey[Int]("start")
    val END_KEY: TypedKey[Int]   = TypedKey[Int]("end")

    override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
      ((json \ "start").asOpt[Int], (json \ "end").asOpt[Int]) match
        case (Some(start), Some(end)) if start < end =>
          Right(request.addAttr(START_KEY, start).addAttr(END_KEY, end))
        case (Some(_), Some(_)) =>
          Left(Results.BadRequest("Start must be less than end"))
        case _ =>
          Left(Results.BadRequest("Missing start or end"))

  /** Example 4: Validator with email validation using PlayJsonHelper
    */
  class ExampleEmailValidator extends PlayJsonValidator:
    val EMAIL_KEY: TypedKey[String] = TypedKey[String]("validatedEmail")

    private val emailRegex = """^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$""".r

    override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
      PlayJsonHelper.parse[String]("email", json) match
        case Some(email) =>
          val trimmed = email.trim.toLowerCase
          emailRegex.findFirstIn(trimmed) match
            case Some(_) => Right(request.addAttr(EMAIL_KEY, trimmed))
            case None    => Left(Results.BadRequest("Invalid email format"))
        case None =>
          Left(Results.BadRequest("Missing email field"))

  /** Example 5: Using PlayValidator[T] for complex validation
    *
    * This shows how to use the Cats-based PlayValidator API with PlayJsonValidator for accumulating validation errors.
    * Pure Scala with Play JSON - no Jackson!
    */
  class ExampleUserRegistrationValidator extends PlayJsonValidator:
    case class UserRegistration(name: String, email: String, age: Int)

    val USER_KEY: TypedKey[UserRegistration] = TypedKey[UserRegistration]("validatedUser")

    private val emailRegex = """^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$""".r

    // Custom validation rule for email format
    private def validateEmail(user: UserRegistration) =
      if emailRegex.matches(user.email) then PlayValidator.valid(())
      else PlayValidator.invalid("email", "Invalid email format")

    // Custom validation rule for age range
    private def validateAge(user: UserRegistration) =
      PlayValidator.requireInRange("age", user.age, 18, 120)

    // Build the validator with all rules - pure Play JSON!
    private val userValidator = PlayValidator[UserRegistration](parseUser)
      .withRule(u => PlayValidator.requireField("name", u.name))
      .withRule(u => PlayValidator.requireField("email", u.email))
      .withRule(u => PlayValidator.requirePositive("age", u.age))
      .withRule(validateEmail)
      .withRule(validateAge)

    private def parseUser(json: JsValue): UserRegistration =
      UserRegistration(
        name = (json \ "name").asOpt[String].orNull,
        email = (json \ "email").asOpt[String].orNull,
        age = (json \ "age").asOpt[Int].getOrElse(0)
      )

    override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
      // Direct Play JSON validation - no Jackson conversion! ✨
      userValidator.validate(json) match
        case Right(user) =>
          Right(request.addAttr(USER_KEY, user))
        case Left(validationException) =>
          // ValidationException contains all accumulated errors
          logger.warn("User validation failed: {}", validationException.getMessage)
          Left(Results.BadRequest(validationException.getMessage))

  /** Example usage in a controller:
    * {{{
    * class MyController @Inject()(
    *   validators: Validators,
    *   implicit val ec: AuthExecutionContext
    * ) extends BaseController:
    *
    *   def myAction: Action[AnyContent] =
    *     Action
    *       .andThen(authorized(Seq(Role.Name.ADMIN)))
    *       .andThen(validators.validated(new ExampleFieldValidator())) { request =>
    *         val field = request.attrs(ExampleFieldValidator.FIELD_KEY)
    *         Ok(s"Received: $field")
    *       }
    *
    *   def emailAction: Action[AnyContent] =
    *     Action
    *       .andThen(authorized(Seq(Role.Name.USER)))
    *       .andThen(validators.validated(new ExampleEmailValidator())) { request =>
    *         val email = request.attrs(ExampleEmailValidator.EMAIL_KEY)
    *         Ok(s"Valid email: $email")
    *       }
    *
    *   // Using Validator[T] API for complex validation with error accumulation
    *   def registerUser: Action[AnyContent] =
    *     Action
    *       .andThen(authorized(Seq(Role.Name.ADMIN)))
    *       .andThen(validators.validated(new ExampleUserRegistrationValidator())) { request =>
    *         val user = request.attrs(ExampleUserRegistrationValidator.USER_KEY)
    *         // All validation rules passed - user is fully validated
    *         Ok(s"User registered: ${user.name}, ${user.email}, age: ${user.age}")
    *       }
    * }}}
    */
