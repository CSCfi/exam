/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.controllers.iop.collaboration.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.TreeSet;
import java.util.concurrent.CompletionStage;
import java.util.function.BiFunction;
import java.util.function.Function;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import io.ebean.Model;
import org.joda.time.DateTime;
import play.data.DynamicForm;
import play.mvc.Result;

import backend.controllers.base.SectionQuestionHandler;
import backend.models.Exam;
import backend.models.sections.ExamSection;
import backend.models.sections.ExamSectionQuestion;
import backend.models.Role;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.models.questions.Question;
import backend.util.AppUtil;
import backend.util.json.JsonDeserializer;


public class CollaborativeExamSectionController extends CollaborationController implements SectionQuestionHandler {

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> addSection(Long examId) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, examId);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        User user = getLoggedUser();
        Role.Name loginRole = Role.Name.valueOf(getSession().getLoginRole());

        return downloadExam(ce).thenComposeAsync(result -> {
            if (result.isPresent()) {
                Exam exam = result.get();
                if (isAuthorizedToView(exam, user, loginRole)) {
                    ExamSection section = createDraft(exam, user);
                    exam.getExamSections().add(section);
                    examUpdater.update(exam, request(), loginRole);
                    return uploadExam(ce, exam, false, section, getLoggedUser());
                }
                return wrapAsPromise(forbidden("sitnet_error_access_forbidden"));
            }
            return wrapAsPromise(notFound());
        }, ec.current());
    }

    private CompletionStage<Result> update(Long examId, BiFunction<Exam, User, Optional<Result>> updater,
                                                  Function<Exam, Optional<? extends Model>> resultProvider) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, examId);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        User user = getLoggedUser();
        Role.Name loginRole = Role.Name.valueOf(getSession().getLoginRole());

        return downloadExam(ce).thenComposeAsync(result -> {
            if (result.isPresent()) {
                Exam exam = result.get();
                if (isAuthorizedToView(exam, user, loginRole)) {
                    Optional<Result> err = updater.apply(exam, user);
                    if (err.isPresent()) {
                        return wrapAsPromise(err.get());
                    }
                    examUpdater.update(exam, request(), loginRole);
                    return uploadExam(ce, exam, false, resultProvider.apply(exam).orElse(null),
                            getLoggedUser());
                }
                return wrapAsPromise(forbidden("sitnet_error_access_forbidden"));
            }
            return wrapAsPromise(notFound());
        }, ec.current());
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> removeSection(Long examId, Long sectionId) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            Optional<ExamSection> section = exam.getExamSections().stream()
                    .filter(es -> es.getId().equals(sectionId))
                    .findFirst();
            if (section.isPresent()) {
                ExamSection es = section.get();
                exam.getExamSections().remove(section.get());
                // Decrease sequences for the entries above the inserted one
                int seq = es.getSequenceNumber();
                for (ExamSection sibling : exam.getExamSections()) {
                    int num = sibling.getSequenceNumber();
                    if (num >= seq) {
                        es.setSequenceNumber(num - 1);
                    }
                }
                return Optional.empty();
            } else {
                return Optional.of(notFound("sitnet_error_not_found"));
            }
        };

        return update(examId, updater, (e) -> Optional.empty());
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> updateSection(Long examId, Long sectionId) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            Optional<ExamSection> section = exam.getExamSections().stream()
                    .filter(es -> es.getId().equals(sectionId))
                    .findFirst();
            if (section.isPresent()) {
                ExamSection es = section.get();
                ExamSection form = formFactory.form(ExamSection.class).bindFromRequest(
                        "id",
                        "name",
                        "expanded",
                        "lotteryOn",
                        "lotteryItemCount",
                        "description"
                ).get();

                es.setName(form.getName());
                es.setExpanded(form.isExpanded());
                es.setLotteryOn(form.isLotteryOn());
                es.setLotteryItemCount(Math.max(1, form.getLotteryItemCount()));
                es.setDescription(form.getDescription());
                return Optional.empty();
            } else {
                return Optional.of(notFound("sitnet_error_not_found"));
            }
        };

        return update(examId, updater, (exam) ->
                exam.getExamSections().stream()
                        .filter(es -> es.getId().equals(sectionId))
                        .findFirst()
        );

    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> reorderSections(Long examId) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            DynamicForm df = formFactory.form().bindFromRequest();
            Integer from = Integer.parseInt(df.get("from"));
            Integer to = Integer.parseInt(df.get("to"));
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
        return update(examId, updater, (e) -> Optional.empty());
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> reorderSectionQuestions(Long examId, Long sectionId) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            DynamicForm df = formFactory.form().bindFromRequest();
            Integer from = Integer.parseInt(df.get("from"));
            Integer to = Integer.parseInt(df.get("to"));
            Optional<Result> err = checkBounds(from, to);
            if (err.isPresent()) {
                return err;
            }
            Optional<ExamSection> section = exam.getExamSections().stream()
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
                return Optional.of(notFound("sitnet_error_not_found"));
            }
        };
        return update(examId, updater, (e) -> Optional.empty());
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> addQuestion(Long examId, Long sectionId) {
        Integer seq = request().body().asJson().get("sequenceNumber").asInt();
        final Long sectionQuestionId = newId();
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            Optional<ExamSection> section = exam.getExamSections().stream()
                    .filter(es -> es.getId().equals(sectionId))
                    .findFirst();
            if (section.isPresent()) {
                ExamSection es = section.get();
                Question question = JsonDeserializer.deserialize(Question.class,
                        request().body().asJson().get("question"));
                ExamSectionQuestion esq = new ExamSectionQuestion();
                question.setId(newId());
                question.getOptions().forEach(o -> o.setId(newId()));
                esq.setId(sectionQuestionId);
                esq.setQuestion(question);
                // Assert that the sequence number provided is within limits
                Integer sequence = Math.min(Math.max(0, seq), es.getSectionQuestions().size());
                updateSequences(es.getSectionQuestions(), sequence);
                esq.setSequenceNumber(sequence);
                if (es.getSectionQuestions().contains(esq) || es.hasQuestion(question)) {
                    return Optional.of(badRequest("sitnet_question_already_in_section"));
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
                AppUtil.setModifier(es, user);
                es.getSectionQuestions().add(esq);
                return Optional.empty();
            } else {
                return Optional.of(notFound("sitnet_error_not_found"));
            }
        };
        return update(examId, updater, (exam) ->
                exam.getExamSections().stream()
                        .flatMap(s -> s.getSectionQuestions().stream())
                        .filter(sq -> sq.getId().equals(sectionQuestionId))
                        .findFirst()
        );
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> removeQuestion(Long examId, Long sectionId, Long questionId) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            Optional<ExamSection> section = exam.getExamSections().stream()
                    .filter(es -> es.getId().equals(sectionId))
                    .findFirst();
            if (section.isPresent()) {
                ExamSection es = section.get();
                Optional<ExamSectionQuestion> question = es.getSectionQuestions().stream()
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
                    return Optional.empty();
                } else {
                    return Optional.of(notFound("sitnet_error_not_found"));
                }
            } else {
                return Optional.of(notFound("sitnet_error_not_found"));
            }
        };
        return update(examId, updater, (exam) ->
                exam.getExamSections().stream()
                        .filter(es -> es.getId().equals(sectionId))
                        .findFirst()
        );
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> clearQuestions(Long examId, Long sectionId) {
        BiFunction<Exam, User, Optional<Result>> updater = (exam, user) -> {
            Optional<ExamSection> section = exam.getExamSections().stream()
                    .filter(es -> es.getId().equals(sectionId))
                    .findFirst();
            if (section.isPresent()) {
                ExamSection es = section.get();
                es.getSectionQuestions().clear();
                return Optional.empty();
            } else {
                return Optional.of(notFound("sitnet_error_not_found"));
            }
        };
        return update(examId, updater, (exam) ->
                exam.getExamSections().stream()
                        .filter(es -> es.getId().equals(sectionId))
                        .findFirst()
        );
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> updateQuestion(Long examId, Long sectionId, Long questionId) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, examId);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        User user = getLoggedUser();
        Role.Name loginRole = Role.Name.valueOf(getSession().getLoginRole());

        return downloadExam(ce).thenComposeAsync(result -> {
            if (result.isPresent()) {
                Exam exam = result.get();
                if (isAuthorizedToView(exam, user, loginRole)) {
                    Optional<ExamSection> section = exam.getExamSections().stream()
                            .filter(es -> es.getId().equals(sectionId))
                            .findFirst();
                    if (section.isPresent()) {
                        ExamSection es = section.get();
                        Optional<ExamSectionQuestion> question = es.getSectionQuestions().stream()
                                .filter(esq -> esq.getId().equals(questionId))
                                .findFirst();
                        if (question.isPresent()) {
                            ExamSectionQuestion esq = question.get();
                            Question questionBody = JsonDeserializer.deserialize(Question.class,
                                    request().body().asJson().get("question"));
                            ExamSectionQuestion esqBody = new ExamSectionQuestion();
                            updateExamQuestion(esq, questionBody);
                            examUpdater.update(exam, request(), loginRole);
                            return uploadExam(ce, exam, false, esqBody, getLoggedUser());
                        } else {
                            return wrapAsPromise(notFound("sitnet_error_not_found"));

                        }
                    } else {
                        return wrapAsPromise(notFound("sitnet_error_not_found"));
                    }

                }
                return wrapAsPromise(forbidden("sitnet_error_access_forbidden"));
            }
            return wrapAsPromise(notFound());
        }, ec.current());
    }

    private ExamSection createDraft(Exam exam, User user) {
        ExamSection section = new ExamSection();
        section.setLotteryItemCount(1);
        section.setSectionQuestions(Collections.emptySet());
        section.setSequenceNumber(exam.getExamSections().size());
        section.setExpanded(true);
        section.setId(newId());
        AppUtil.setCreator(section, user);
        return section;
    }



}
