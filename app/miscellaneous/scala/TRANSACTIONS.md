# Ebean Transactions in Scala

Guide to using Ebean transactions in Scala controllers.

## Quick Reference

| Approach | When to Use | Complexity |
|----------|-------------|------------|
| **`@Transactional`** | Simple single-operation methods | Low |
| **Manual (`try/finally`)** | Need explicit control, pessimistic locks | Medium |
| **`TransactionHelper`** | Functional style, automatic rollback | Low |
| **`Using` (Scala 2.13+)** | Resource management with Scala idioms | Medium |

## Option 1: Java `@Transactional` Annotation

**Simplest approach** - works directly in Scala:

```scala
import io.ebean.annotation.Transactional
import javax.inject.Inject

class MyController @Inject()(
  val controllerComponents: ControllerComponents
) extends BaseController {

  @Transactional
  def createUser(name: String): Action[AnyContent] = Action { request =>
    val user = new User()
    user.setName(name)
    user.save()  // Automatically in transaction
    Ok(Json.toJson(user))
  }

  @Transactional
  def updateUser(id: Long, name: String): Action[AnyContent] = Action { request =>
    val user = DB.find(classOf[User], id)
    user.setName(name)
    user.update()  // Automatically in transaction
    Ok(Json.toJson(user))
  }
}
```

**Pros:**
- ✅ Simple, minimal boilerplate
- ✅ Automatic commit/rollback
- ✅ Works exactly like Java

**Cons:**
- ❌ Can't use with pessimistic locks
- ❌ Less control over transaction lifecycle
- ❌ Doesn't work well with async operations

## Option 2: Manual Transaction Management (Most Common)

**Used extensively in the codebase** - explicit control:

```scala
import io.ebean.{DB, Transaction}

def createReservation(userId: Long): Action[AnyContent] = Action { request =>
  val tx = DB.beginTransaction()
  try {
    // Take pessimistic lock to prevent race conditions
    DB.find(classOf[User]).forUpdate().where().eq("id", userId).findOne()
    
    // Your transactional operations
    val reservation = new Reservation()
    reservation.setStartAt(DateTime.now().toDate)
    reservation.save()
    
    val enrolment = DB.find(classOf[ExamEnrolment], enrolmentId)
    enrolment.setReservation(reservation)
    enrolment.update()
    
    tx.commit()  // ✅ Commit if all successful
    Ok(Json.toJson(reservation))
  } catch {
    case e: Exception =>
      // Transaction automatically rolled back (not committed)
      InternalServerError(s"Failed: ${e.getMessage}")
  } finally {
    tx.end()  // Always close the transaction
  }
}
```

**Real example from codebase** (`CalendarController.java` line 150):

```scala
// Start manual transaction
val tx = DB.beginTransaction()
try {
  // Take pessimistic lock for user to prevent multiple reservations
  DB.find(classOf[User]).forUpdate().where().eq("id", user.getId).findOne()
  
  val enrolment = DB.find(classOf[ExamEnrolment])
    .fetch("reservation")
    .fetch("exam.examSections")
    .where()
    .eq("user.id", user.getId)
    .eq("exam.id", examId)
    .findOne()
  
  // ... more operations ...
  
  tx.commit()
  Ok(result.asJson)
} finally {
  tx.end()
}
```

**Pros:**
- ✅ Full control over transaction
- ✅ Can use pessimistic locks (`forUpdate()`)
- ✅ Clear commit/rollback points
- ✅ Most common pattern in codebase

**Cons:**
- ❌ More boilerplate
- ❌ Easy to forget `tx.end()` or `tx.commit()`

## Option 3: TransactionHelper (Functional Style)

**Recommended for new Scala code** - automatic resource management:

```scala
import miscellaneous.scala.TransactionHelper.*

def createReservation(userId: Long): Action[AnyContent] = Action { request =>
  tryWithTransaction {
    val reservation = new Reservation()
    reservation.setStartAt(DateTime.now().toDate)
    reservation.save()
    
    val enrolment = DB.find(classOf[ExamEnrolment], enrolmentId)
    enrolment.setReservation(reservation)
    enrolment.update()
    
    reservation  // Return value
  } match {
    case Success(reservation) => Ok(Json.toJson(reservation))
    case Failure(e) => InternalServerError(s"Failed: ${e.getMessage}")
  }
}
```

### With Pessimistic Lock

```scala
def createEnrolment(userId: Long, examId: Long): Action[AnyContent] = Action { request =>
  tryWithTransaction {
    // Automatically locks User entity with ID userId
    withLock(classOf[User], userId) {
      val enrolment = new ExamEnrolment()
      enrolment.setUser(DB.find(classOf[User], userId))
      enrolment.setExam(DB.find(classOf[Exam], examId))
      enrolment.save()
      enrolment
    }
  } match {
    case Success(enrolment) => Ok(Json.toJson(enrolment))
    case Failure(e) => InternalServerError(s"Failed: ${e.getMessage}")
  }
}
```

### Simple Form (No Error Handling)

```scala
def updateProfile(userId: Long): Action[AnyContent] = Action { request =>
  val profile = withTransaction {
    val user = DB.find(classOf[User], userId)
    val profile = new Profile()
    profile.setUser(user)
    profile.save()
    profile
  }
  Ok(Json.toJson(profile))
}
```

**Pros:**
- ✅ Automatic commit/rollback
- ✅ Functional style
- ✅ Less boilerplate
- ✅ `withLock` helper for pessimistic locks

**Cons:**
- ❌ New API to learn
- ❌ Less explicit than manual approach

## Option 4: Scala `Using` (Resource Management)

**For Scala 2.13+** - ARM pattern:

```scala
import scala.util.Using
import io.ebean.{DB, Transaction}

def createReservation(userId: Long): Action[AnyContent] = Action { request =>
  Using(DB.beginTransaction()) { tx =>
    // Take pessimistic lock
    DB.find(classOf[User]).forUpdate().where().eq("id", userId).findOne()
    
    val reservation = new Reservation()
    reservation.save()
    
    tx.commit()
    reservation
  } match {
    case Success(reservation) => Ok(Json.toJson(reservation))
    case Failure(e) => InternalServerError(s"Failed: ${e.getMessage}")
  }
}
```

**Pros:**
- ✅ Standard Scala resource management
- ✅ Automatic cleanup

**Cons:**
- ❌ Still need to call `tx.commit()` explicitly
- ❌ More verbose than `TransactionHelper`

## Comparison: All Approaches

### Simple Create Operation

**@Transactional:**
```scala
@Transactional
def createUser(name: String): Action[AnyContent] = Action { ... }
```

**Manual:**
```scala
def createUser(name: String): Action[AnyContent] = Action {
  val tx = DB.beginTransaction()
  try {
    // ... operations ...
    tx.commit()
    Ok(...)
  } finally { tx.end() }
}
```

**TransactionHelper:**
```scala
def createUser(name: String): Action[AnyContent] = Action {
  val user = withTransaction {
    // ... operations ...
  }
  Ok(...)
}
```

## Best Practices

### 1. Use Pessimistic Locks for Concurrency

```scala
// ✅ Good - prevents race conditions
withLock(classOf[User], userId) {
  val enrolments = DB.find(classOf[ExamEnrolment])
    .where().eq("user.id", userId)
    .findList()
  
  if (enrolments.isEmpty) {
    val enrolment = new ExamEnrolment()
    enrolment.save()
  }
}

// ❌ Bad - race condition possible
withTransaction {
  val enrolments = DB.find(classOf[ExamEnrolment])
    .where().eq("user.id", userId)
    .findList()
  
  if (enrolments.isEmpty) {
    val enrolment = new ExamEnrolment()
    enrolment.save()  // Multiple requests might both create!
  }
}
```

### 2. Keep Transactions Short

```scala
// ✅ Good - minimal work in transaction
val data = prepareData()  // Outside transaction
withTransaction {
  entity.setData(data)
  entity.save()
}

// ❌ Bad - long-running work in transaction
withTransaction {
  val data = fetchFromExternalApi()  // Network call!
  entity.setData(data)
  entity.save()
}
```

### 3. Handle Errors Appropriately

```scala
// ✅ Good - specific error handling
tryWithTransaction {
  user.save()
} match {
  case Success(_) => Ok("Saved")
  case Failure(e: SQLException) => BadRequest("Database error")
  case Failure(e) => InternalServerError("Unexpected error")
}
```

## When to Use Which?

| Use Case | Recommended Approach |
|----------|---------------------|
| Simple CRUD | `@Transactional` |
| Need pessimistic lock | Manual or `TransactionHelper.withLock` |
| Multiple related operations | `TransactionHelper.withTransaction` |
| Async operations | Manual (with Future handling) |
| Following codebase patterns | Manual |
| New Scala code | `TransactionHelper` |

## Common Patterns from Codebase

### Pattern 1: Lock User, Create Enrolment

```scala
withLock(classOf[User], userId) {
  val enrolments = DB.find(classOf[ExamEnrolment])
    .where().eq("user.id", userId).eq("exam.id", examId)
    .findList()
  
  if (enrolments.isEmpty) {
    val enrolment = new ExamEnrolment()
    enrolment.setUser(DB.find(classOf[User], userId))
    enrolment.setExam(DB.find(classOf[Exam], examId))
    enrolment.save()
    enrolment
  } else {
    throw new IllegalStateException("Already enrolled")
  }
}
```

### Pattern 2: Update Multiple Entities

```scala
withTransaction {
  val exam = DB.find(classOf[Exam], examId)
  exam.setState(Exam.State.PUBLISHED)
  exam.update()
  
  val enrolments = exam.getExamEnrolments.asScala
  enrolments.foreach { enrolment =>
    enrolment.setNotified(true)
    enrolment.update()
  }
}
```

### Pattern 3: Delete with Cascade

```scala
withTransaction {
  val reservation = DB.find(classOf[Reservation], reservationId)
  
  val enrolment = DB.find(classOf[ExamEnrolment])
    .where().eq("reservation.id", reservationId)
    .findOne()
  
  if (enrolment != null) {
    enrolment.setReservation(null)
    enrolment.update()
  }
  
  reservation.delete()
}
```

## Summary

- **Quick & Simple**: Use `@Transactional`
- **Need Locks**: Use manual or `TransactionHelper.withLock`
- **Functional Style**: Use `TransactionHelper`
- **Follow Codebase**: Use manual `try/finally` pattern
- **Always**: Keep transactions short and handle errors properly

Choose the approach that best fits your use case! 🎯

