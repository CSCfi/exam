// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package functional;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;
import static play.test.Helpers.running;

import base.IntegrationTestCase;
import base.RunAsStudent;
import base.RunAsTeacher;
import controllers.exam.copy.ExamCopyContext;
import io.ebean.DB;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import models.exam.Exam;
import models.sections.ExamSection;
import models.sections.ExamSectionQuestion;
import models.sections.ExamSectionQuestionOption;
import models.user.User;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.test.Helpers;

/**
 * Functional tests for exam copy scenarios.
 *
 * <p>Each test uses {@code @RunAsTeacher} or {@code @RunAsStudent}, which the base class
 * {@code setUp()} uses to log in and populate {@code userId} before the test body runs.
 * {@code getLoggerUser()} then fetches the corresponding {@link User} from the DB.
 *
 * <p>{@code initExamSectionQuestions(exam)} (from {@link IntegrationTestCase}) seeds the
 * {@link ExamSectionQuestionOption} rows that {@code copyQuestionWithOptions} requires — the YAML
 * fixture does not include them since they are normally created when a teacher configures an exam
 * section in the UI.
 */
public class ExamCopyTest extends IntegrationTestCase {

    private static final String SOURCE_EXAM_NAME = "Johdatus alkeiden perusteisiin";

    private Exam loadSourceExam() {
        return DB.find(Exam.class).where().eq("name", SOURCE_EXAM_NAME).eq("state", Exam.State.PUBLISHED).findOne();
    }

    private List<ExamSectionQuestion> allSectionQuestions(Exam exam) {
        return exam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .toList();
    }

    // -- Teacher copy ------------------------------------------------------------------

    @Test
    @RunAsTeacher
    public void testTeacherCopyReusesQuestionObjects() {
        running(app, () -> {
            User teacher = getLoggerUser();
            Exam source = loadSourceExam();
            Exam copy = source.createCopy(ExamCopyContext.forTeacherCopy(teacher).build());

            Set<Long> sourceQids = allSectionQuestions(source)
                .stream()
                .map(esq -> esq.getQuestion().getId())
                .collect(Collectors.toSet());
            Set<Long> copyQids = allSectionQuestions(copy)
                .stream()
                .map(esq -> esq.getQuestion().getId())
                .collect(Collectors.toSet());

            // Teacher copy shares question rows — no deep question duplication
            assertThat(copyQids).isEqualTo(sourceQids);
        });
    }

    @Test
    @RunAsTeacher
    public void testTeacherCopyCopiesAllSectionsIncludingOptional() {
        running(app, () -> {
            User teacher = getLoggerUser();
            Exam source = loadSourceExam();
            Exam copy = source.createCopy(ExamCopyContext.forTeacherCopy(teacher).build());

            assertThat(copy.getExamSections()).hasSize(source.getExamSections().size());
        });
    }

    @Test
    @RunAsTeacher
    public void testTeacherCopyProducesIndependentOptionRows() {
        running(app, () -> {
            User teacher = getLoggerUser();
            Exam source = loadSourceExam();
            initExamSectionQuestions(source);
            Exam fresh = loadSourceExam();
            Exam copy = fresh.createCopy(ExamCopyContext.forTeacherCopy(teacher).build());

            Set<Long> sourceOptionIds = allSectionQuestions(fresh)
                .stream()
                .flatMap(esq -> esq.getOptions().stream())
                .map(ExamSectionQuestionOption::getId)
                .collect(Collectors.toSet());
            Set<Long> copyOptionIds = allSectionQuestions(copy)
                .stream()
                .flatMap(esq -> esq.getOptions().stream())
                .map(ExamSectionQuestionOption::getId)
                .collect(Collectors.toSet());

            assertThat(sourceOptionIds).isNotEmpty();
            assertThat(copyOptionIds).excludes(sourceOptionIds.toArray());
        });
    }

    @Test
    @RunAsTeacher
    public void testTeacherCopyViaControllerProducesDraft() {
        running(app, () -> {
            Exam source = loadSourceExam();
            // examinationType and type are read from form body by the controller
            Http.RequestBuilder rb = getRequestBuilder(Helpers.POST, "/app/exams/" + source.getId()).bodyForm(
                Map.of("examinationType", "AQUARIUM", "type", "PUBLIC")
            );
            Result result = Helpers.route(app, rb);
            assertThat(result.status()).isEqualTo(Helpers.OK);
            Exam copy = deserialize(Exam.class, Json.parse(contentAsString(result)));

            assertThat(copy.getState()).isEqualTo(Exam.State.DRAFT);
            assertThat(copy.getName()).startsWith("**COPY**");
            // ExamController explicitly nulls parent for teacher copies
            assertThat(copy.getParent()).isNull();
        });
    }

    // -- Student exam copy -------------------------------------------------------------

    @Test
    @RunAsStudent
    public void testStudentCopyCreatesNewQuestionsWithParent() {
        running(app, () -> {
            User student = getLoggerUser();
            Exam source = loadSourceExam();
            initExamSectionQuestions(source);
            Exam fresh = loadSourceExam();
            Exam copy = fresh.createCopy(ExamCopyContext.forStudentExam(student).build());

            Set<Long> sourceQids = allSectionQuestions(fresh)
                .stream()
                .map(esq -> esq.getQuestion().getId())
                .collect(Collectors.toSet());
            allSectionQuestions(copy).forEach(esq -> {
                assertThat(sourceQids).excludes(esq.getQuestion().getId());
                assertThat(esq.getQuestion().getParent()).isNotNull();
            });
        });
    }

    @Test
    @RunAsStudent
    public void testStudentCopyExcludesOptionalSectionsWhenNoneSelected() {
        running(app, () -> {
            User student = getLoggerUser();
            Exam source = loadSourceExam();
            initExamSectionQuestions(source);
            Exam fresh = loadSourceExam();

            Set<String> optionalNames = fresh
                .getExamSections()
                .stream()
                .filter(ExamSection::isOptional)
                .map(ExamSection::getName)
                .collect(Collectors.toSet());
            assertThat(optionalNames).isNotEmpty();

            Exam copy = fresh.createCopy(ExamCopyContext.forStudentExam(student).build());
            Set<String> copiedNames = copy
                .getExamSections()
                .stream()
                .map(ExamSection::getName)
                .collect(Collectors.toSet());

            optionalNames.forEach(n -> assertThat(copiedNames).excludes(n));
        });
    }

    @Test
    @RunAsStudent
    public void testStudentCopyIncludesSelectedOptionalSection() {
        running(app, () -> {
            User student = getLoggerUser();
            Exam source = loadSourceExam();
            initExamSectionQuestions(source);
            Exam fresh = loadSourceExam();

            ExamSection optSection = fresh
                .getExamSections()
                .stream()
                .filter(ExamSection::isOptional)
                .findFirst()
                .orElseThrow(() -> new AssertionError("No optional section in test data"));

            Exam copy = fresh.createCopy(
                ExamCopyContext.forStudentExam(student).withSelectedSections(Set.of(optSection.getId())).build()
            );

            assertThat(copy.getExamSections().stream().map(ExamSection::getName).toList()).contains(
                optSection.getName()
            );
        });
    }

    @Test
    @RunAsStudent
    public void testStudentCopyDoesNotCopyExamOwners() {
        running(app, () -> {
            User student = getLoggerUser();
            Exam source = loadSourceExam();
            initExamSectionQuestions(source);
            Exam copy = loadSourceExam().createCopy(ExamCopyContext.forStudentExam(student).build());

            assertThat(copy.getExamOwners()).isEmpty();
        });
    }

    // -- Collaborative exam copy -------------------------------------------------------

    @Test
    @RunAsStudent
    public void testCollaborativeCopyCreatesQuestionsWithoutParent() {
        running(app, () -> {
            User student = getLoggerUser();
            Exam source = loadSourceExam();
            initExamSectionQuestions(source);
            Exam fresh = loadSourceExam();
            Exam copy = fresh.createCopy(ExamCopyContext.forCollaborativeExam(student).build());

            Set<Long> sourceQids = allSectionQuestions(fresh)
                .stream()
                .map(esq -> esq.getQuestion().getId())
                .collect(Collectors.toSet());
            allSectionQuestions(copy).forEach(esq -> {
                assertThat(sourceQids).excludes(esq.getQuestion().getId());
                // COLLABORATIVE_EXAM does not set parent — differs from STUDENT_EXAM
                assertThat(esq.getQuestion().getParent()).isNull();
            });
        });
    }

    @Test
    @RunAsStudent
    public void testCollaborativeCopyExcludesOptionalSections() {
        running(app, () -> {
            User student = getLoggerUser();
            Exam source = loadSourceExam();
            initExamSectionQuestions(source);
            Exam fresh = loadSourceExam();
            long nonOptionalCount = fresh
                .getExamSections()
                .stream()
                .filter(es -> !es.isOptional())
                .count();
            Exam copy = fresh.createCopy(ExamCopyContext.forCollaborativeExam(student).build());

            assertThat(copy.getExamSections()).hasSize((int) nonOptionalCount);
        });
    }

    // -- Lottery section student copy --------------------------------------------------

    @Test
    @RunAsStudent
    public void testLotteryStudentCopyTrimsSectionToLotteryCount() {
        running(app, () -> {
            User student = getLoggerUser();
            Exam source = loadSourceExam();
            initExamSectionQuestions(source);
            Exam fresh = loadSourceExam();

            ExamSection section = fresh
                .getExamSections()
                .stream()
                .filter(s -> !s.isOptional() && s.getSectionQuestions().size() >= 3)
                .findFirst()
                .orElseThrow(() -> new AssertionError("Need a non-optional section with at least 3 questions"));

            int lotteryCount = section.getSectionQuestions().size() - 1;
            section.setLotteryOn(true);
            section.setLotteryItemCount(lotteryCount);
            section.update();

            Exam copy = fresh.createCopy(ExamCopyContext.forStudentExam(student).build());

            ExamSection copiedSection = copy
                .getExamSections()
                .stream()
                .filter(s -> s.getName().equals(section.getName()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Lottery section not found in copy"));

            assertThat(copiedSection.getSectionQuestions()).hasSize(lotteryCount);
        });
    }
}
