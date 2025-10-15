// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers.validation;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;
import models.assessment.AutoEvaluationConfig;
import models.assessment.ExamFeedbackConfig;
import models.assessment.GradeEvaluation;
import models.exam.Exam;
import models.exam.ExamExecutionType;
import models.exam.ExamType;
import models.exam.Grade;
import org.joda.time.DateTime;
import sanitizers.SanitizingException;
import sanitizers.SanitizingHelper;

/**
 * Combined parser and validator for Exam objects with context-specific validation rules.
 *
 * <p>This validator:
 * <ol>
 *   <li>Parses all fields from JSON using {@link SanitizingHelper}</li>
 *   <li>Builds an Exam object with sanitized data</li>
 *   <li>Applies context-specific validation rules</li>
 *   <li>Provides validated Exam via {@link #getValidatedExam()}</li>
 * </ol>
 *
 * <p>Provides predefined validators for different scenarios:
 * <ul>
 *   <li>{@link #forUpdate(JsonNode)} - Strict validation for exam updates</li>
 *   <li>{@link #forCreation(JsonNode)} - Minimal validation for creating draft exams</li>
 * </ul>
 *
 * <p>Example usage:
 * <pre>{@code
 * ExamValidator validator = ExamValidator.forUpdate(jsonBody);
 *
 * if (!validator.validationResult().isValid()) {
 *     throw new SanitizingException(validator.validationResult().getErrors().toString());
 * }
 *
 * Exam validatedExam = validator.getValidatedExam();
 * }</pre>
 */
public final class ExamValidator {

    private final List<ValidationRule<Exam>> rules = new ArrayList<>();
    private final Exam exam;
    private ValidationResult validationResult;

    private ExamValidator(JsonNode body) throws SanitizingException {
        this.exam = parseFromJson(body);
    }

    /**
     * Parses all fields from JSON and builds an Exam object.
     * Uses SanitizingHelper for parsing with HTML sanitization where applicable.
     */
    private Exam parseFromJson(JsonNode body) throws SanitizingException {
        Exam exam = new Exam();

        // Parse basic fields
        SanitizingHelper.parse("name", body, String.class).ifPresent(exam::setName);

        SanitizingHelper.parseEnum("state", body, Exam.State.class).ifPresent(exam::setState);

        SanitizingHelper.parse("periodStart", body, Long.class).map(DateTime::new).ifPresent(exam::setPeriodStart);

        SanitizingHelper.parse("periodEnd", body, Long.class).map(DateTime::new).ifPresent(exam::setPeriodEnd);

        SanitizingHelper.parse("duration", body, Integer.class).ifPresent(exam::setDuration);

        SanitizingHelper.parseEnum("implementation", body, Exam.Implementation.class).ifPresent(
            exam::setImplementation
        );

        SanitizingHelper.parse("shared", body, Boolean.class).ifPresent(exam::setShared);

        SanitizingHelper.parse("answerLanguage", body, String.class).ifPresent(exam::setAnswerLanguage);

        exam.setInstruction(SanitizingHelper.parseHtml("instruction", body));

        exam.setEnrollInstruction(SanitizingHelper.parseHtml("enrollInstruction", body));

        SanitizingHelper.parse("trialCount", body, Integer.class).ifPresent(exam::setTrialCount);

        SanitizingHelper.parse("subjectToLanguageInspection", body, Boolean.class).ifPresent(
            exam::setSubjectToLanguageInspection
        );

        SanitizingHelper.parse("internalRef", body, String.class).ifPresent(exam::setInternalRef);

        SanitizingHelper.parse("anonymous", body, Boolean.class).ifPresent(exam::setAnonymous);

        SanitizingHelper.parse("organisations", body, String.class).ifPresent(exam::setOrganisations);

        // Handle grading (ID reference)
        SanitizingHelper.parse("grading", body, Integer.class).ifPresent(gradeId -> {
            Grade grade = new Grade();
            grade.setId(gradeId);
            exam.setGrade(grade);
        });

        // Handle exam type
        if (body.has("examType")) {
            final JsonNode examTypeNode = body.get("examType");
            SanitizingHelper.parse("type", examTypeNode, String.class).ifPresent(type -> {
                ExamType examType = new ExamType(type);
                exam.setExamType(examType);
            });
        }

        // Handle execution type
        if (body.has("executionType")) {
            JsonNode execTypeNode = body.get("executionType");
            if (execTypeNode.has("type")) {
                String typeStr = SanitizingHelper.parse("type", execTypeNode, String.class).orElse(null);
                if (typeStr != null) {
                    ExamExecutionType executionType = new ExamExecutionType();
                    executionType.setType(typeStr);
                    exam.setExecutionType(executionType);
                }
            }
        }

        // Handle feedback config
        if (body.has("feedbackConfig")) {
            JsonNode node = body.get("feedbackConfig");
            if (node.isObject()) {
                final ExamFeedbackConfig config = new ExamFeedbackConfig();
                config.setReleaseType(
                    SanitizingHelper.parseEnum("releaseType", node, ExamFeedbackConfig.ReleaseType.class).orElseThrow(
                        () -> new SanitizingException("bad releaseType")
                    )
                );
                Optional<Long> releaseDateMs = SanitizingHelper.parse("releaseDate", node, Long.class);
                releaseDateMs.ifPresent(rd -> config.setReleaseDate(new DateTime(rd)));
                exam.setExamFeedbackConfig(config);
            } else if (node.isNull()) {
                exam.setExamFeedbackConfig(null);
            }
        }

        // Handle auto-evaluation config
        if (body.has("evaluationConfig")) {
            JsonNode node = body.get("evaluationConfig");
            if (node.isObject()) {
                final AutoEvaluationConfig config = new AutoEvaluationConfig();
                config.setReleaseType(
                    SanitizingHelper.parseEnum("releaseType", node, AutoEvaluationConfig.ReleaseType.class).orElseThrow(
                        () -> new SanitizingException("bad releaseType")
                    )
                );
                config.setAmountDays(SanitizingHelper.parse("amountDays", node, Integer.class).orElse(null));
                Optional<Long> releaseDateMs = SanitizingHelper.parse("releaseDate", node, Long.class);
                releaseDateMs.ifPresent(rd -> config.setReleaseDate(new Date(rd)));
                config.setGradeEvaluations(new HashSet<>());
                for (JsonNode evaluation : node.get("gradeEvaluations")) {
                    GradeEvaluation ge = new GradeEvaluation();
                    if (!evaluation.has("grade") || !evaluation.get("grade").has("id")) {
                        throw new SanitizingException("invalid grade");
                    }
                    Grade grade = new Grade();
                    grade.setId(
                        SanitizingHelper.parse("id", evaluation.get("grade"), Integer.class).orElseThrow(() ->
                            new SanitizingException("invalid grade")
                        )
                    );
                    ge.setGrade(grade);
                    ge.setPercentage(
                        SanitizingHelper.parse("percentage", evaluation, Integer.class).orElseThrow(() ->
                            new SanitizingException("no percentage")
                        )
                    );
                    config.getGradeEvaluations().add(ge);
                }
                exam.setAutoEvaluationConfig(config);
            } else if (node.isNull()) {
                exam.setAutoEvaluationConfig(null);
            }
        }

        return exam;
    }

    /**
     * Creates a base validator with absolute minimum requirements.
     * All exam validators should start from this base.
     */
    private static ExamValidator base(JsonNode body) throws SanitizingException {
        return new ExamValidator(body);
    }

    /**
     * Creates a strict validator for exam updates.
     * Parses JSON and validates with strict rules: base fields + name, duration, and state-specific validation.
     */
    public static ExamValidator forUpdate(JsonNode body) throws SanitizingException {
        ExamValidator validator = base(body);
        validator.requireName().requireDuration().requirePublishedExamHasName();
        validator.executeValidation();
        return validator;
    }

    /**
     * Creates a minimal validator for draft exam creation.
     * Parses JSON and validates with minimal rules: only implementation and executionType.
     */
    public static ExamValidator forCreation(JsonNode body) throws SanitizingException {
        ExamValidator validator = base(body).requireImplementation().requireExecutionType();
        validator.executeValidation();
        return validator;
    }

    /**
     * Executes all validation rules and stores the result.
     */
    private void executeValidation() {
        List<FieldError> errors = new ArrayList<>();

        for (ValidationRule<Exam> rule : rules) {
            ValidationResult result = rule.validate(exam);
            if (!result.isValid()) {
                errors.addAll(result.getErrors());
            }
        }

        this.validationResult = errors.isEmpty() ? ValidationResult.ok() : ValidationResult.withErrors(errors);
    }

    /**
     * Returns the validation result.
     */
    public ValidationResult validationResult() {
        return validationResult;
    }

    /**
     * Returns the validated Exam object.
     * Should only be called if validationResult().isValid() returns true.
     */
    public Exam getValidatedExam() {
        return exam;
    }

    /**
     * Requires exam to have a non-empty name.
     */
    public ExamValidator requireName() {
        rules.add(exam -> {
            if (exam.getName() == null || exam.getName().trim().isEmpty()) {
                return ValidationResult.error("name", "Exam name is required");
            }
            return ValidationResult.ok();
        });
        return this;
    }

    /**
     * Requires exam to have a positive duration.
     */
    public ExamValidator requireDuration() {
        rules.add(exam -> {
            if (exam.getDuration() == null || exam.getDuration() <= 0) {
                return ValidationResult.error("duration", "Exam duration must be greater than 0");
            }
            return ValidationResult.ok();
        });
        return this;
    }

    /**
     * Requires exam to have at least one section.
     */
    public ExamValidator requireNonEmptySections() {
        rules.add(exam -> {
            if (exam.getExamSections() == null || exam.getExamSections().isEmpty()) {
                return ValidationResult.error("sections", "Exam must have at least one section");
            }
            return ValidationResult.ok();
        });
        return this;
    }

    /**
     * Requires all exam sections to be named.
     */
    public ExamValidator requireAllSectionsNamed() {
        rules.add(exam -> {
            if (exam.getExamSections() == null) {
                return ValidationResult.ok();
            }
            boolean hasUnnamedSection = exam
                .getExamSections()
                .stream()
                .anyMatch(s -> s.getName() == null || s.getName().trim().isEmpty());
            if (hasUnnamedSection) {
                return ValidationResult.error("sections", "All exam sections must be named");
            }
            return ValidationResult.ok();
        });
        return this;
    }

    /**
     * Requires exam to have at least one language.
     */
    public ExamValidator requireNonEmptyLanguages() {
        rules.add(exam -> {
            if (exam.getExamLanguages() == null || exam.getExamLanguages().isEmpty()) {
                return ValidationResult.error("languages", "Exam must have at least one language");
            }
            return ValidationResult.ok();
        });
        return this;
    }

    /**
     * Requires exam to have an implementation type.
     */
    public ExamValidator requireImplementation() {
        rules.add(exam -> {
            if (exam.getImplementation() == null) {
                return ValidationResult.error("implementation", "Exam implementation is required");
            }
            return ValidationResult.ok();
        });
        return this;
    }

    /**
     * Requires exam to have an execution type.
     */
    public ExamValidator requireExecutionType() {
        rules.add(exam -> {
            if (exam.getExecutionType() == null) {
                return ValidationResult.error("executionType", "Exam execution type is required");
            }
            return ValidationResult.ok();
        });
        return this;
    }

    /**
     * Requires published exams to have a non-empty name.
     * This validates the state-specific business rule.
     */
    public ExamValidator requirePublishedExamHasName() {
        rules.add(exam -> {
            if (
                exam.getState() != null &&
                exam.getState().equals(Exam.State.PUBLISHED) &&
                (exam.getName() == null || exam.getName().trim().isEmpty())
            ) {
                return ValidationResult.error("name", "Published exam must have a name");
            }
            return ValidationResult.ok();
        });
        return this;
    }

    /**
     * Adds a custom validation rule.
     */
    public ExamValidator addRule(ValidationRule<Exam> rule) {
        rules.add(rule);
        return this;
    }

    /**
     * Adds a custom validation rule with field and predicate.
     */
    public ExamValidator addRule(String field, Predicate<Exam> condition, String errorMessage) {
        rules.add(exam -> {
            if (!condition.test(exam)) {
                return ValidationResult.error(field, errorMessage);
            }
            return ValidationResult.ok();
        });
        return this;
    }

    /**
     * Executes all validation rules against the provided exam and returns the result.
     * Use this for validating existing Exam objects without parsing from JSON.
     */
    public static ValidationResult validate(Exam exam, List<ValidationRule<Exam>> rules) {
        List<FieldError> errors = new ArrayList<>();

        for (ValidationRule<Exam> rule : rules) {
            ValidationResult result = rule.validate(exam);
            if (!result.isValid()) {
                errors.addAll(result.getErrors());
            }
        }

        return errors.isEmpty() ? ValidationResult.ok() : ValidationResult.withErrors(errors);
    }
}
