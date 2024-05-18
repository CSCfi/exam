// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.collaboration.impl;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import controllers.base.SectionQuestionHandler;
import io.ebean.Model;
import io.ebean.text.PathProperties;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.TreeSet;
import java.util.concurrent.CompletionStage;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.Stream;
import models.Exam;
import models.User;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import models.sections.ExamSection;
import models.sections.ExamSectionQuestion;
import org.joda.time.DateTime;
import play.data.DynamicForm;
import play.mvc.Http;
import play.mvc.Result;
import sanitizers.Attrs;
import security.Authenticated;
import util.json.JsonDeserializer;

public class CollaborativeExamSectionController extends CollaborationController implements SectionQuestionHandler {

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> addSection(Long examId, Http.Request request) {
        String homeOrg = configReader.getHomeOrganisationRef();
        return findCollaborativeExam(examId)
            .map(ce -> {
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                return downloadExam(ce)
                    .thenComposeAsync(result -> {
                        if (result.isPresent()) {
                            Exam exam = result.get();
                            if (isAuthorizedToView(exam, user, homeOrg)) {
                                ExamSection section = createDraft(exam, user);
                                exam.getExamSections().add(section);
                                return uploadExam(ce, exam, user, section, null);
                            }
                            return wrapAsPromise(forbidden("i18n_error_access_forbidden"));
                        }
                        return wrapAsPromise(notFound());
                    });
            })
            .get();
    }

    private CompletionStage<Result> update(
        Http.Request request,
        Long examId,
        BiFunction<Exam, User, Optional<Result>> updater,
        Function<Exam, Optional<? extends Model>> resultProvider
    ) {
        return findCollaborativeExam(examId)
            .map(ce -> {
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                String homeOrg = configReader.getHomeOrganisationRef();
                return downloadExam(ce)
                    .thenComposeAsync(result -> {
                        if (result.isPresent()) {
                            Exam exam = result.get();
                            if (isAuthorizedToView(exam, user, homeOrg)) {
                                Optional<Result> err = updater.apply(exam, user);
                                if (err.isPresent()) {
                                    return wrapAsPromise(err.get());
                                }
                                PathProperties pp = PathProperties.parse(
                                    "(*, question(*, attachment(*), questionOwners(*), tags(*), options(*)), options(*, option(*)))"
                                );
                                return uploadExam(ce, exam, user, resultProvider.apply(exam).orElse(null), pp);
                            }
                            return wrapAsPromise(forbidden("i18n_error_access_forbidden"));
                        }
                        return wrapAsPromise(notFound());
                    });
            })
            .get();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> removeSection(Long examId, Long sectionId, Http.Request request) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            Optional<ExamSection> section = exam
                .getExamSections()
                .stream()
                .filter(es -> es.getId().equals(sectionId))
                .findFirst();
            if (section.isPresent()) {
                ExamSection es = section.get();
                exam.getExamSections().remove(es);
                // Decrease sequences for the entries above the inserted one
                int seq = es.getSequenceNumber();
                for (ExamSection sibling : exam.getExamSections()) {
                    int num = sibling.getSequenceNumber();
                    if (num >= seq) {
                        sibling.setSequenceNumber(num - 1);
                    }
                }
                return Optional.empty();
            } else {
                return Optional.of(notFound("i18n_error_not_found"));
            }
        };

        return update(request, examId, updater, e -> Optional.empty());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> updateSection(Long examId, Long sectionId, Http.Request request) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            Optional<ExamSection> section = exam
                .getExamSections()
                .stream()
                .filter(es -> es.getId().equals(sectionId))
                .findFirst();
            if (section.isPresent()) {
                ExamSection es = section.get();
                ExamSection form = formFactory
                    .form(ExamSection.class)
                    .bindFromRequest(request, "id", "name", "expanded", "lotteryOn", "lotteryItemCount", "description")
                    .get();

                es.setName(form.getName());
                es.setExpanded(form.isExpanded());
                es.setLotteryOn(form.isLotteryOn());
                es.setLotteryItemCount(Math.max(1, form.getLotteryItemCount()));
                es.setDescription(form.getDescription());
                return Optional.empty();
            } else {
                return Optional.of(notFound("i18n_error_not_found"));
            }
        };

        return update(
            request,
            examId,
            updater,
            exam -> exam.getExamSections().stream().filter(es -> es.getId().equals(sectionId)).findFirst()
        );
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> reorderSections(Long examId, Http.Request request) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            DynamicForm df = formFactory.form().bindFromRequest(request);
            int from = Integer.parseInt(df.get("from"));
            int to = Integer.parseInt(df.get("to"));
            Optional<Result> err = checkBounds(from, to);
            if (err.isPresent()) {
                return err;
            }
            // Reorder by sequenceNumber (TreeSet orders the collection based on it)
            List<ExamSection> sections = new ArrayList<>(new TreeSet<>(exam.getExamSections()));
            ExamSection prev = sections.get(from);
            boolean removed = sections.remove(prev);
            if (removed) {
                sections.add(to, prev);
                for (int i = 0; i < sections.size(); ++i) {
                    ExamSection section = sections.get(i);
                    section.setSequenceNumber(i);
                }
            }
            return Optional.empty();
        };
        return update(request, examId, updater, e -> Optional.empty());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> reorderSectionQuestions(Long examId, Long sectionId, Http.Request request) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            DynamicForm df = formFactory.form().bindFromRequest(request);
            int from = Integer.parseInt(df.get("from"));
            int to = Integer.parseInt(df.get("to"));
            Optional<Result> err = checkBounds(from, to);
            if (err.isPresent()) {
                return err;
            }
            Optional<ExamSection> section = exam
                .getExamSections()
                .stream()
                .filter(es -> es.getId().equals(sectionId))
                .findFirst();
            if (section.isPresent()) {
                ExamSection es = section.get();
                // Reorder by sequenceNumber (TreeSet orders the collection based on it)
                List<ExamSectionQuestion> questions = new ArrayList<>(new TreeSet<>(es.getSectionQuestions()));
                ExamSectionQuestion prev = questions.get(from);
                boolean removed = questions.remove(prev);
                if (removed) {
                    questions.add(to, prev);
                    for (int i = 0; i < questions.size(); ++i) {
                        ExamSectionQuestion question = questions.get(i);
                        question.setSequenceNumber(i);
                    }
                }
                return Optional.empty();
            } else {
                return Optional.of(notFound("i18n_error_not_found"));
            }
        };
        return update(request, examId, updater, e -> Optional.empty());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> addQuestion(Long examId, Long sectionId, Http.Request request) {
        int seq = request.body().asJson().get("sequenceNumber").asInt();
        final Long sectionQuestionId = newId();
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            Optional<ExamSection> section = exam
                .getExamSections()
                .stream()
                .filter(es -> es.getId().equals(sectionId))
                .findFirst();
            if (section.isPresent()) {
                ExamSection es = section.get();
                JsonNode questionBody = request.body().asJson().get("question");
                Question question = JsonDeserializer.deserialize(Question.class, questionBody);
                question.getQuestionOwners().forEach(this::cleanUser);
                Optional<Result> error = question.getValidationResult(questionBody);
                if (error.isPresent()) {
                    return error;
                }
                ExamSectionQuestion esq = new ExamSectionQuestion();
                question.setId(newId());

                if (question.getType() == Question.Type.ClaimChoiceQuestion) {
                    // Naturally order generated ids before saving them to question options
                    // Option ids will be used to retain option order on collaborative exams
                    List<MultipleChoiceOption> options = question.getOptions();
                    List<Long> generatedIds = Stream
                        .generate(this::newId)
                        .limit(options.size())
                        .sorted(Comparator.naturalOrder())
                        .toList();
                    for (int i = 0; i < options.size(); i++) {
                        options.get(i).setId(generatedIds.get(i));
                    }
                } else {
                    question.getOptions().forEach(o -> o.setId(newId()));
                }
                esq.setId(sectionQuestionId);
                esq.setQuestion(question);
                // Assert that the sequence number provided is within limits
                int sequence = Math.min(Math.max(0, seq), es.getSectionQuestions().size());
                updateSequences(es.getSectionQuestions(), sequence);
                esq.setSequenceNumber(sequence);
                if (es.getSectionQuestions().contains(esq) || es.hasQuestion(question)) {
                    return Optional.of(badRequest("i18n_question_already_in_section"));
                }
                if (question.getType().equals(Question.Type.EssayQuestion)) {
                    // disable auto evaluation for this exam
                    if (exam.getAutoEvaluationConfig() != null) {
                        exam.getAutoEvaluationConfig().delete();
                    }
                }
                // Insert new section question
                esq.setCreator(user);
                esq.setCreated(DateTime.now());

                updateExamQuestion(esq, question);
                esq.getOptions().forEach(o -> o.setId(newId()));
                cleanUser(user);
                es.setModifierWithDate(user);
                es.getSectionQuestions().add(esq);
                return Optional.empty();
            } else {
                return Optional.of(notFound("i18n_error_not_found"));
            }
        };
        return update(
            request,
            examId,
            updater,
            exam ->
                exam
                    .getExamSections()
                    .stream()
                    .flatMap(s -> s.getSectionQuestions().stream())
                    .filter(sq -> sq.getId().equals(sectionQuestionId))
                    .findFirst()
        );
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> removeQuestion(Long examId, Long sectionId, Long questionId, Http.Request request) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            Optional<ExamSection> section = exam
                .getExamSections()
                .stream()
                .filter(es -> es.getId().equals(sectionId))
                .findFirst();
            if (section.isPresent()) {
                ExamSection es = section.get();
                Optional<ExamSectionQuestion> question = es
                    .getSectionQuestions()
                    .stream()
                    .filter(esq -> esq.getQuestion().getId().equals(questionId))
                    .findFirst();
                if (question.isPresent()) {
                    ExamSectionQuestion esq = question.get();
                    es.getSectionQuestions().remove(esq);

                    // Decrease sequences for the entries above the inserted one
                    int seq = esq.getSequenceNumber();
                    for (ExamSectionQuestion sibling : es.getSectionQuestions()) {
                        int num = sibling.getSequenceNumber();
                        if (num >= seq) {
                            sibling.setSequenceNumber(num - 1);
                        }
                    }
                    // Update lottery item count if needed
                    if (es.isLotteryOn() && es.getLotteryItemCount() > es.getSectionQuestions().size()) {
                        es.setLotteryItemCount(es.getSectionQuestions().size());
                    }
                    return Optional.empty();
                } else {
                    return Optional.of(notFound("i18n_error_not_found"));
                }
            } else {
                return Optional.of(notFound("i18n_error_not_found"));
            }
        };
        return update(
            request,
            examId,
            updater,
            exam -> exam.getExamSections().stream().filter(es -> es.getId().equals(sectionId)).findFirst()
        );
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> clearQuestions(Long examId, Long sectionId, Http.Request request) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            Optional<ExamSection> section = exam
                .getExamSections()
                .stream()
                .filter(es -> es.getId().equals(sectionId))
                .findFirst();
            if (section.isPresent()) {
                ExamSection es = section.get();
                es.getSectionQuestions().clear();
                return Optional.empty();
            } else {
                return Optional.of(notFound("i18n_error_not_found"));
            }
        };
        return update(
            request,
            examId,
            updater,
            exam -> exam.getExamSections().stream().filter(es -> es.getId().equals(sectionId)).findFirst()
        );
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> updateQuestion(Long examId, Long sectionId, Long questionId, Http.Request request) {
        return findCollaborativeExam(examId)
            .map(ce -> {
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                String homeOrg = configReader.getHomeOrganisationRef();
                return downloadExam(ce)
                    .thenComposeAsync(result -> {
                        if (result.isPresent()) {
                            Exam exam = result.get();
                            if (isAuthorizedToView(exam, user, homeOrg)) {
                                Optional<ExamSection> section = exam
                                    .getExamSections()
                                    .stream()
                                    .filter(es -> es.getId().equals(sectionId))
                                    .findFirst();
                                if (section.isPresent()) {
                                    ExamSection es = section.get();
                                    Optional<ExamSectionQuestion> question = es
                                        .getSectionQuestions()
                                        .stream()
                                        .filter(esq -> esq.getId().equals(questionId))
                                        .findFirst();
                                    if (question.isPresent()) {
                                        ExamSectionQuestion esq = question.get();
                                        JsonNode payload = request.body().asJson().get("question");
                                        Question questionBody = JsonDeserializer.deserialize(Question.class, payload);
                                        Optional<Result> error = questionBody.getValidationResult(payload);
                                        if (error.isPresent()) {
                                            return wrapAsPromise(error.get());
                                        }
                                        questionBody
                                            .getOptions()
                                            .stream()
                                            .filter(o -> o.getId() == null)
                                            .forEach(o -> o.setId(newId()));
                                        updateExamQuestion(esq, questionBody);
                                        esq.getOptions().forEach(o -> o.setId(newId()));
                                        PathProperties pp = PathProperties.parse(
                                            "(*, question(*, attachment(*), questionOwners(*), tags(*), options(*)), options(*, option(*)))"
                                        );
                                        return uploadExam(ce, exam, user, esq, pp);
                                    } else {
                                        return wrapAsPromise(notFound("i18n_error_not_found"));
                                    }
                                } else {
                                    return wrapAsPromise(notFound("i18n_error_not_found"));
                                }
                            }
                            return wrapAsPromise(forbidden("i18n_error_access_forbidden"));
                        }
                        return wrapAsPromise(notFound());
                    });
            })
            .get();
    }

    private ExamSection createDraft(Exam exam, User user) {
        ExamSection section = new ExamSection();
        section.setLotteryItemCount(1);
        section.setSectionQuestions(Collections.emptySet());
        section.setSequenceNumber(exam.getExamSections().size());
        section.setExpanded(true);
        section.setId(newId());
        cleanUser(user);
        section.setCreatorWithDate(user);
        return section;
    }
}
