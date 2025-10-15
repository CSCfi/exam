# Exam Validation Framework

## Overview

A fluent validation framework for context-specific exam validation with composable rules.

## Architecture

```
sanitizers/validation/
├── ValidationRule.java      - Functional interface for validation rules
├── ValidationResult.java    - Immutable validation result with errors
├── FieldError.java         - Field-level validation error
└── ExamValidator.java      - Fluent validator builder
```

## Architecture Overview

All validators extend from a **base validator** that enforces the absolute minimum requirements:
- ✅ `implementation` - Exam implementation type (AQUARIUM, WHATEVER, CLIENT_AUTH)
- ✅ `executionType` - Exam execution type (PUBLIC, PRINTOUT, MATURITY)

Specific validators then layer additional rules on top of this base.

## Predefined Validators

### 1. `ExamValidator.forUpdate()` - Strict Validation
**Used by:** `ExamUpdateSanitizer`  
**Purpose:** Updates to existing exams, publishing, state changes  
**Inherits:** Base requirements (implementation + executionType)  
**Additional requirements:**
- ✅ `name` - Non-empty exam name
- ✅ `duration` - Positive duration
- ✅ Published exams must have name

**Example:**
```java
ValidationResult result = ExamValidator.forUpdate().validate(exam);
if (!result.isValid()) {
    throw new SanitizingException(result.getErrors().toString());
}
```

### 2. `ExamValidator.forDraftCreation()` - Minimal Validation
**Used by:** `ExamCreateSanitizer`  
**Purpose:** Creating incomplete draft exams  
**Inherits:** Base requirements only (implementation + executionType)  
**Additional requirements:** None

**Example:**
```java
ValidationResult result = ExamValidator.forDraftCreation().validate(exam);
if (!result.isValid()) {
    return badRequest(Json.toJson(result.getErrors()));
}
```

## Adding Custom Validation

### Method 1: Fluent API
```java
ExamValidator.forUpdate()
    .requireName()
    .requireDuration()
    .requireNonEmptySections()
    .addRule("duration", 
        exam -> exam.getDuration() >= 30,
        "Exam must be at least 30 minutes")
    .validate(exam);
```

### Method 2: Custom Rule
```java
ValidationRule<Exam> maturityExamRule = exam -> {
    if (exam.isMaturityExam() && !exam.isSubjectToLanguageInspection()) {
        return ValidationResult.error("languageInspection", 
            "Maturity exams require language inspection");
    }
    return ValidationResult.ok();
};

ExamValidator.forUpdate()
    .addRule(maturityExamRule)
    .validate(exam);
```

## Available Rule Methods

| Method | Description |
|--------|-------------|
| `requireName()` | Exam must have non-empty name |
| `requireDuration()` | Exam must have positive duration |
| `requireNonEmptySections()` | Exam must have at least one section |
| `requireAllSectionsNamed()` | All sections must be named |
| `requireNonEmptyLanguages()` | Exam must have at least one language |
| `requireImplementation()` | Exam must have implementation type |
| `requireExecutionType()` | Exam must have execution type |
| `addRule(ValidationRule<Exam>)` | Add custom validation rule |
| `addRule(field, predicate, message)` | Add inline validation rule |

## Comparison: Update vs Create

| Field | Update (Strict) | Draft Creation (Lax) | Base (All Validators) |
|-------|----------------|---------------------|----------------------|
| implementation | ✅ Required | ✅ Required | ✅ Required |
| executionType | ✅ Required | ✅ Required | ✅ Required |
| name | ✅ Required | ⚪ Optional | ⚪ Optional |
| duration | ✅ Required | ⚪ Optional | ⚪ Optional |
| published exam name | ✅ Validated | ⚪ Not validated | ⚪ Not validated |
| sections | ⚪ Optional | ⚪ Optional | ⚪ Optional |
| languages | ⚪ Optional | ⚪ Optional | ⚪ Optional |
| All other fields | ⚪ Optional | ⚪ Optional | ⚪ Optional |

## Integration with Sanitizers

### ExamUpdateSanitizer (Strict)
```java
@Override
protected Http.Request sanitize(Http.Request req, JsonNode body) {
    Exam exam = new Exam();
    // ... populate fields from JSON
    
    ValidationResult result = ExamValidator.forUpdate().validate(exam);
    if (!result.isValid()) {
        throw new SanitizingException(result.getErrors().toString());
    }
    
    return req.addAttr(Attrs.EXAM, exam);
}
```

### ExamCreateSanitizer (Lax)
```java
@Override
protected Http.Request sanitize(Http.Request req, JsonNode body) {
    Exam exam = new Exam();
    // ... populate minimal fields
    
    ValidationResult result = ExamValidator.forDraftCreation().validate(exam);
    if (!result.isValid()) {
        throw new SanitizingException(result.getErrors().toString());
    }
    
    return req.addAttr(Attrs.EXAM, exam);
}
```

## Future Validators (Examples)

```java
// For publishing
public static ExamValidator forPublish() {
    return new ExamValidator()
        .requireName()
        .requireDuration()
        .requireNonEmptySections()
        .requireAllSectionsNamed()
        .requireNonEmptyLanguages();
}

// For collaborative exams
public static ExamValidator forCollaborative() {
    return new ExamValidator()
        .requireName()
        .addRule("organisations", 
            exam -> exam.getOrganisations() != null,
            "Collaborative exams must specify organisations");
}

// For maturity exams
public static ExamValidator forMaturity() {
    return forPublish()
        .addRule(exam -> {
            if (!exam.isSubjectToLanguageInspection()) {
                return ValidationResult.error("languageInspection",
                    "Maturity exams require language inspection");
            }
            return ValidationResult.ok();
        });
}
```

## Benefits

✅ **Composable** - Mix and match validation rules  
✅ **Reusable** - Define once, use everywhere  
✅ **Context-aware** - Different rules for different scenarios  
✅ **Type-safe** - Compile-time checking  
✅ **Testable** - Each rule can be tested independently  
✅ **Fluent** - Easy to read and maintain  
✅ **Extensible** - Add custom rules as needed

