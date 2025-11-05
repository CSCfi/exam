# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
#
# SPDX-License-Identifier: EUPL-1.2

# Scala Validators for Play Framework

This document explains how to use the Scala-friendly validator system with Play Framework Scala controllers.

## Overview

The validator system provides a way to validate and sanitize request bodies in Scala controllers using the `andThen` pattern, similar to how Java controllers use the `@With` annotation.

**Package location:** All Scala validators are in the `validation.scala` package and its subpackages.

## Architecture

### Core Components (in `validation.scala.core`)

1. **`PlayJsonValidator`** - Base trait for Play JSON-based validators (recommended)
2. **`Validators`** - Injectable factory for creating validator filters
3. **`ScalaAttrs`** - Typed keys for storing validated data in request attributes
4. **`PlayValidator[T]`** - Advanced validator with error accumulation using Cats ValidatedNel

## Usage

### Step 1: Inject Validators into Your Controller

```scala
import validation.scala.core.Validators

class MyController @Inject()(
  validators: Validators,
  implicit val ec: AuthExecutionContext
) extends BaseController
```

### Step 2: Use with andThen

```scala
import validation.scala.CommaJoinedListValidator
import validation.scala.core.ScalaAttrs

def myAction: Action[AnyContent] =
  Action
    .andThen(authorized(Seq(Role.Name.ADMIN)))
    .andThen(validators.validated(CommaJoinedListValidator)) { request =>
      val ids = request.attrs(ScalaAttrs.ID_LIST)
      Ok(s"Processing IDs: $ids")
    }
```

## Built-in Validators

### ScalaCommaJoinedListValidator

Validates a comma-separated list of IDs in the request body.

**Expected JSON format:**
```json
{
  "ids": "1,2,3,4"
}
```

Or for file downloads:
```json
{
  "params": {
    "ids": "1,2,3,4"
  }
}
```

**Usage:**
```scala
def archiveExams: Action[AnyContent] =
  Action
    .andThen(authorized(Seq(Role.Name.ADMIN)))
    .andThen(validators.validated(new ScalaCommaJoinedListValidator())) { request =>
      val ids = request.attrs(ScalaAttrs.ID_LIST)
      // "ids" is List[Long]
      Ok(s"Archiving ${ids.size} exams")
    }
```

## Creating Custom Validators

### Pattern 1: Simple Field Validator

```scala
class MyFieldValidator extends JsonBodyValidator:
  val MY_FIELD: TypedKey[String] = TypedKey[String]("myField")

  override def sanitize(
    request: Request[AnyContent], 
    body: JsonNode
  ): Either[Result, Request[AnyContent]] =
    if body.has("myField") then
      val value = body.get("myField").asText()
      Right(request.addAttr(MY_FIELD, value))
    else
      Left(Results.BadRequest("Missing myField"))
```

### Pattern 2: Multi-Field Validator with Validation

```scala
class RangeValidator extends JsonBodyValidator:
  val START: TypedKey[Int] = TypedKey[Int]("start")
  val END: TypedKey[Int] = TypedKey[Int]("end")

  override def sanitize(
    request: Request[AnyContent], 
    body: JsonNode
  ): Either[Result, Request[AnyContent]] =
    (Option(body.get("start")), Option(body.get("end"))) match
      case (Some(s), Some(e)) if !s.isNull && !e.isNull =>
        val start = s.asInt()
        val end = e.asInt()
        if start < end then
          Right(request.addAttr(START, start).addAttr(END, end))
        else
          Left(Results.BadRequest("Start must be less than end"))
      case _ => 
        Left(Results.BadRequest("Missing start or end"))
```

### Pattern 3: Validator with Complex Logic

```scala
class EmailValidator extends JsonBodyValidator:
  val EMAIL: TypedKey[String] = TypedKey[String]("email")
  
  private val emailRegex = """^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$""".r

  override def sanitize(
    request: Request[AnyContent], 
    body: JsonNode
  ): Either[Result, Request[AnyContent]] =
    Option(body.get("email")).filter(!_.isNull) match
      case Some(emailNode) =>
        val email = emailNode.asText().trim.toLowerCase
        emailRegex.findFirstIn(email) match
          case Some(_) => Right(request.addAttr(EMAIL, email))
          case None => Left(Results.BadRequest("Invalid email format"))
      case None => 
        Left(Results.BadRequest("Missing email field"))
```

## Accessing Validated Data

After validation, retrieve data from request attributes:

```scala
def myAction: Action[AnyContent] =
  Action.andThen(validators.validated(new MyValidator())) { request =>
    val value = request.attrs(MyValidator.MY_KEY)
    // Use value...
    Ok(s"Value: $value")
  }
```

## Comparison with Java Validators

### Java (with @With annotation)
```java
@With(CommaJoinedListValidator.class)
@Restrict({@Group("ADMIN")})
public Result archiveExams(Http.Request request) {
    Collection<Long> ids = request.attrs().get(Attrs.ID_COLLECTION);
    // ...
}
```

### Scala (with andThen)
```scala
def archiveExams: Action[AnyContent] =
  Action
    .andThen(authorized(Seq(Role.Name.ADMIN)))
    .andThen(validators.validated(new ScalaCommaJoinedListValidator())) { request =>
      val ids = request.attrs(ScalaAttrs.ID_LIST)
      // ...
    }
```

## Benefits

1. **Type Safety**: Uses Scala's typed keys for request attributes
2. **Composability**: Chain multiple validators using `andThen`
3. **Immutability**: Request enrichment returns new request instances
4. **Testability**: Easy to test validators in isolation
5. **Consistency**: Same pattern as authorization filters

## Error Handling

Validators return `Either[Result, Request[AnyContent]]`:
- `Left(result)` - Validation failed, returns error Result (typically BadRequest)
- `Right(request)` - Validation succeeded, returns enriched Request

The validator automatically handles:
- Missing JSON body
- JSON parsing errors
- `SanitizingException` from existing Java validators
- General exceptions

## Best Practices

1. **Define typed keys as constants** in the validator class
2. **Return meaningful error messages** in BadRequest responses
3. **Validate early** - put validators before business logic
4. **Reuse validators** - inject `Validators` and create validator instances
5. **Chain validators** - use multiple `andThen` for complex validation

## Migration from Java

To migrate an existing Java validator to Scala:

1. Place Scala validators in `validation.scala` package (not `validation.java`)
2. Extend `PlayJsonValidator` (recommended) or `JsonBodyValidator` (deprecated) instead of `ValidatorAction`
3. Implement `sanitize` returning `Either[Result, Request[AnyContent]]`
4. Use `Right(request.addAttr(...))` instead of `request.addAttr(...); return request`
5. Use `Left(Results.BadRequest(...))` instead of throwing exceptions
6. Define Scala-friendly typed keys in `ScalaAttrs` for attributes
7. Use Play JSON (`JsValue`) instead of Jackson (`JsonNode`) for new validators

## Example: Complete Controller

```scala
class ReportController @Inject()(
                                  validators: Validators,
                                  implicit val ec: AuthExecutionContext
                                ) extends BaseController:

  def exportData(examId: Long): Action[AnyContent] =
    Action
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER)))
      .andThen(validators.validated(new ScalaCommaJoinedListValidator())) { request =>
        val childIds = request.attrs(ScalaAttrs.ID_LIST)
        val data = generateReport(examId, childIds)
        Ok(data)
      }

  def updateRange(): Action[AnyContent] =
    Action
      .andThen(authorized(Seq(Role.Name.ADMIN)))
      .andThen(validators.validated(new RangeValidator())) { request =>
        val start = request.attrs(RangeValidator.START)
        val end = request.attrs(RangeValidator.END)
        updateData(start, end)
        Ok
      }
```

