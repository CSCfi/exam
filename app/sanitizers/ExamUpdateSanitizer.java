// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Date;
import java.util.HashSet;
import java.util.Optional;
import models.assessment.AutoEvaluationConfig;
import models.assessment.ExamFeedbackConfig;
import models.assessment.GradeEvaluation;
import models.exam.Exam;
import models.exam.Grade;
import org.joda.time.DateTime;
import play.mvc.Http;

public class ExamUpdateSanitizer extends BaseSanitizer {

    @Override
    protected Http.Request sanitize(Http.Request req, JsonNode body) throws SanitizingException {
        Http.Request request = req;
        Optional<Long> start = SanitizingHelper.parse("periodStart", body, Long.class);
        Optional<Long> end = SanitizingHelper.parse("periodEnd", body, Long.class);
        Optional<Integer> duration = SanitizingHelper.parse("duration", body, Integer.class);
        Optional<Exam.State> state = SanitizingHelper.parseEnum("state", body, Exam.State.class);
        Optional<String> examName = SanitizingHelper.parse("name", body, String.class);
        Optional<Exam.Implementation> impl = SanitizingHelper.parseEnum(
            "implementation",
            body,
            Exam.Implementation.class
        );

        if (state.isPresent() && state.get().equals(Exam.State.PUBLISHED)) {
            // (ABOUT TO BE) PUBLISHED EXAM, NEED TO VALIDATE SOME MORE
            if (examName.isEmpty() || examName.get().isEmpty()) {
                throw new SanitizingException("bad name");
            }
        }

        if (start.isPresent()) {
            request = request.addAttr(Attrs.START_DATE, new DateTime(start.get()));
        }
        if (end.isPresent()) {
            request = request.addAttr(Attrs.END_DATE, new DateTime(end.get()));
        }
        if (duration.isPresent()) {
            request = request.addAttr(Attrs.DURATION, duration.get());
        }
        if (state.isPresent()) {
            request = request.addAttr(Attrs.EXAM_STATE, state.get());
        }
        if (examName.isPresent()) {
            request = request.addAttr(Attrs.NAME, examName.get());
        }
        if (impl.isPresent()) {
            request = request.addAttr(Attrs.EXAM_IMPL, impl.get());
        }

        request = SanitizingHelper.sanitizeOptional("shared", body, Boolean.class, Attrs.SHARED, request);
        request = SanitizingHelper.sanitizeOptional("grading", body, Integer.class, Attrs.GRADE_ID, request);
        request = SanitizingHelper.sanitizeOptional("answerLanguage", body, String.class, Attrs.LANG, request);
        request = SanitizingHelper.sanitizeOptionalHtml("instruction", body, Attrs.INSTRUCTION, request);
        request = SanitizingHelper.sanitizeOptionalHtml(
            "enrollInstruction",
            body,
            Attrs.ENROLMENT_INFORMATION,
            request
        );
        request = SanitizingHelper.sanitizeOptional("trialCount", body, Integer.class, Attrs.TRIAL_COUNT, request);
        request = SanitizingHelper.sanitizeOptional(
            "subjectToLanguageInspection",
            body,
            Boolean.class,
            Attrs.LANG_INSPECTION_REQUIRED,
            request
        );
        request = SanitizingHelper.sanitizeOptional("internalRef", body, String.class, Attrs.REFERENCE, request);
        request = SanitizingHelper.sanitizeOptional("anonymous", body, Boolean.class, Attrs.ANONYMOUS, request);
        request = SanitizingHelper.sanitizeOptional("organisations", body, String.class, Attrs.ORGANISATIONS, request);
        request = SanitizingHelper.sanitizeOptional(
            "settingsPassword",
            body,
            String.class,
            Attrs.SETTINGS_PASSWORD,
            request
        );
        if (body.has("examType")) {
            final JsonNode examTypeNode = body.get("examType");
            request = SanitizingHelper.sanitizeOptional("type", examTypeNode, String.class, Attrs.TYPE, request);
        }

        // EXAM-FEEDBACK-CONFIG
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
                request = request.addAttr(Attrs.EXAM_FEEDBACK_CONFIG, config);
            } else if (node.isNull()) {
                request = request.addAttr(Attrs.EXAM_FEEDBACK_CONFIG, null);
            }
        }

        // AUTO-EVALUATION
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
                        SanitizingHelper.parse("id", evaluation.get("grade"), Integer.class).orElseThrow(
                            () -> new SanitizingException("invalid grade")
                        )
                    );
                    ge.setGrade(grade);
                    ge.setPercentage(
                        SanitizingHelper.parse("percentage", evaluation, Integer.class).orElseThrow(
                            () -> new SanitizingException("no percentage")
                        )
                    );
                    config.getGradeEvaluations().add(ge);
                }
                request = request.addAttr(Attrs.AUTO_EVALUATION_CONFIG, config);
            } else if (node.isNull()) {
                request = request.addAttr(Attrs.AUTO_EVALUATION_CONFIG, null);
            }
        }

        return request;
    }
}
