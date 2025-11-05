# Session-Based Permission Checking

Permissions are stored in the session for efficient, database-free authorization checks.

## How It Works

### 1. **Login: Permissions Stored in Session**

When a user logs in (`SessionController.createSession`), permissions are stored as a comma-separated string:

```java
// Java - SessionController.java (lines 401-406)
if (!user.getPermissions().isEmpty()) {
    payload.put(
        "permissions",
        user.getPermissions().stream()
            .map(Permission::getValue)
            .collect(Collectors.joining(","))
    );
}
```

**Example session data:**
```
{
  "id": "12345",
  "role": "TEACHER",
  "permissions": "CAN_INSPECT_LANGUAGE,EXAM_PARTICIPATION,CREATE_EXAMS"
}
```

### 2. **Authentication: Permissions Loaded from Session**

`AuthenticatedAction` parses permissions from the session and adds them to request attributes:

```scala
// Scala - Auth.scala (lines 38-46)
val permissions = request.session
  .get("permissions")
  .map(_.split(",").map(_.trim).filter(_.nonEmpty).toSet)
  .getOrElse(Set.empty[String])

val enrichedRequest = request
  .addAttr(ATTR_USER, user)
  .addAttr(ATTR_PERMISSIONS, permissions)  // ✅ Available for filters
```

### 3. **Authorization: Fast Permission Checks**

Filters check permissions from request attributes (no database query needed):

```scala
// PermissionFilter checks session permissions
input.attrs.get(Auth.ATTR_PERMISSIONS) match
  case Some(permissions) if permissions.contains(permission.toString) =>
    None  // ✅ Access granted (enum converted to string for comparison)
  case Some(_) =>
    Some(Results.Forbidden("Insufficient permissions"))
  case None =>
    Some(Results.Unauthorized("Authentication required"))
```

## Usage Examples

> **⚠️ IMPORTANT**: You **MUST** use `authenticated` before any permission/role filters!
> 
> The `authenticated` action builder is what loads the user and permissions from the session and stores them in request attributes. Without it, `PermissionFilter` and `CombinedRoleAndPermissionFilter` will always fail with `Unauthorized`.

### Permission-Only Check

```scala
import models.user.Permission
import security.scala.{Auth, PermissionFilter}

def assignInspection(id: Long): Action[AnyContent] =
  authenticated  // ✅ REQUIRED - loads user + permissions into request attributes
    .andThen(PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE)) { request =>
      // User has CAN_INSPECT_LANGUAGE permission
      Ok
    }
```

**❌ WRONG - Will always fail:**
```scala
def assignInspection(id: Long): Action[AnyContent] =
  Action  // ❌ Missing authenticated!
    .andThen(PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE)) { request =>
      // Will ALWAYS return 401 Unauthorized
      Ok
    }
```

### Combined Permission + Role Check (OR)

```scala
import models.user.{Permission, Role}

def listInspections(): Action[AnyContent] =
  authenticated
    .andThen(CombinedRoleAndPermissionFilter.anyMatch(Permission.Type.CAN_INSPECT_LANGUAGE, Role.Name.ADMIN)) { request =>
      // User has EITHER permission OR admin role
      Ok
    }
```

### Combined Permission + Role Check (AND)

```scala
import models.user.{Permission, Role}

def criticalAction(): Action[AnyContent] =
  authenticated
    .andThen(CombinedRoleAndPermissionFilter.allMatch(Permission.Type.CAN_CREATE_BYOD_EXAM, Role.Name.ADMIN)) { request =>
      // User has BOTH permission AND admin role
      Ok
    }
```

## Benefits

| Aspect | Benefit |
|--------|---------|
| **Performance** | No database queries for permission checks |
| **Scalability** | Reduces database load on high-traffic endpoints |
| **Type Safety** | `Permission.Type` enum prevents typos and invalid permissions (compile-time checking) |
| **IDE Support** | Auto-completion for all available permissions |
| **Consistency** | Same permissions used throughout the request |
| **Refactoring** | Renaming permissions updates all usages automatically |

## Session Data Structure

After authentication, the request contains:

```scala
// Request attributes populated by AuthenticatedAction
request.attrs(Auth.ATTR_USER)        // User object (from DB)
request.attrs(Auth.ATTR_PERMISSIONS) // Set[String] (from session)

// Session data (stored as cookies)
request.session.get("id")           // "12345"
request.session.get("role")         // "TEACHER"
request.session.get("permissions")  // "CAN_INSPECT_LANGUAGE,EXAM_PARTICIPATION"
```

## Type Safety

The API uses `Permission.Type` enum instead of strings for **compile-time safety**:

```scala
// ✅ Type-safe - compiler catches typos
PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE)

// ❌ Would not compile (if we used strings)
PermissionFilter("CAN_INSEPCT_LANGUAGE")  // Typo caught at compile time!
```

**Available Permission Types:**
```scala
enum Permission.Type {
  CAN_INSPECT_LANGUAGE
  CAN_CREATE_BYOD_EXAM
  // ... add more as needed
}
```

**Benefits:**
- ✅ **No typos**: Compiler verifies permission exists
- ✅ **IDE autocomplete**: See all available permissions
- ✅ **Refactoring-safe**: Rename propagates everywhere
- ✅ **Documentation**: Type definition serves as single source of truth

## Important Notes

1. **🚨 Must use `authenticated` first**: Permission and role filters **require** `authenticated` to be called first. The `authenticated` action builder loads the user and permissions from the session into request attributes. Without it, all permission checks will fail with `Unauthorized`.

2. **Permissions are frozen at login**: Changes to user permissions require re-login to take effect

3. **Session expiry**: When the session expires, permissions are cleared

4. **Role changes**: When user switches roles (`setLoginRole`), permissions remain the same. However this can't happen without logging out first

5. **Security**: Permissions in session are tamper-proof (signed by Play Framework)

## Migration Guide

### Java Controllers
Continue using annotations - they work unchanged:
```java
@Pattern(value = "CAN_INSPECT_LANGUAGE")
public Result myAction() { ... }
```

### Scala Controllers
Use the new filters (always start with `authenticated`):
```scala
import models.user.Permission

authenticated  // ✅ REQUIRED FIRST
  .andThen(PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE)) { request =>
    // Your code
  }
```

**Common Mistake:**
```scala
// ❌ WRONG - Missing authenticated!
Action.andThen(PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE)) { ... }

// ✅ CORRECT - authenticated first
authenticated.andThen(PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE)) { ... }
```

## Troubleshooting

**Problem**: Permission/role filter always returns `401 Unauthorized`

**Cause**: Missing `authenticated` action builder

**Solution**: 
```scala
// ❌ WRONG
Action.andThen(PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE))

// ✅ CORRECT
authenticated.andThen(PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE))
```

**Problem**: Permission check fails but user has the permission in database

**Cause**: Permissions are cached at login time

**Solution**: User needs to log out and log back in. Permissions are loaded into session during authentication.

**Problem**: Permission check passes but shouldn't

**Cause**: Session is stale or permissions haven't been revoked in database yet

**Solution**: Check if session is stale. Clear browser cookies and re-authenticate.

**Problem**: `request.attrs(Auth.ATTR_PERMISSIONS)` throws exception

**Cause**: `authenticated` action builder was not used

**Solution**: Always use `authenticated` before accessing `ATTR_USER` or `ATTR_PERMISSIONS`
