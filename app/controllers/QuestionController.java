package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.Model;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.PathProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import controllers.base.BaseController;
import models.Exam;
import models.ExamSectionQuestion;
import models.ExamSectionQuestionOption;
import models.Tag;
import models.User;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import play.Logger;
import play.data.DynamicForm;
import play.libs.Json;
import play.mvc.BodyParser;
import play.mvc.Result;
import util.AppUtil;

import javax.persistence.PersistenceException;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

public class QuestionController extends BaseController {

    private enum QuestionState {
        NEW, SAVED, DELETED
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getQuestions(List<Long> examIds, List<Long> courseIds, List<Long> tagIds, List<Long> sectionIds) {
        User user = getLoggedUser();
        PathProperties pp = PathProperties.parse("*, questionOwners(id, firstName, lastName, userIdentifier, email), " +
                "attachment(id, fileName), options(defaultScore), examSectionQuestions(examSection(exam(state, examActiveEndDate, course(code)))))");
        Query<Question> query = Ebean.find(Question.class);
        pp.apply(query);
        ExpressionList<Question> el = query
                .where()
                .isNull("parent")
                .endJunction()
                .ne("state", QuestionState.DELETED.toString());
        if (user.hasRole("TEACHER", getSession())) {
            el = el.disjunction()
                    .eq("shared", true)
                    .eq("questionOwners", user)
                    .endJunction();
        }
        if (!examIds.isEmpty()) {
            el = el.in("examSectionQuestions.examSection.exam.id", examIds);
        }
        if (!courseIds.isEmpty()) {
            el = el.in("examSectionQuestions.examSection.exam.course.id", courseIds);
        }
        if (!tagIds.isEmpty()) {
            el = el.in("tags.id", tagIds);
        }
        if (!sectionIds.isEmpty()) {
            el = el.in("examSectionQuestions.examSection.id", sectionIds);
        }
        Set<Question> questions = el.orderBy("created desc").findSet();
        return ok(questions, pp);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getQuestion(Long id) {
        User user = getLoggedUser();
        Query<Question> query = Ebean.find(Question.class);
        PathProperties pp = PathProperties.parse("(*, questionOwners(id, firstName, lastName, userIdentifier, email), " +
                "attachment(id, fileName), options(id, correctOption, defaultScore, option), tags(id, name), " +
                "examSectionQuestions(id, examSection(name, exam(name, state))))");
        pp.apply(query);
        ExpressionList<Question> expr = query.where().idEq(id);
        if (user.hasRole("TEACHER", getSession())) {
            expr = expr.disjunction()
                    .eq("shared", true)
                    .eq("questionOwners", user)
                    .eq("examSectionQuestions.examSection.exam.examOwners", user)
                    .endJunction();
        }
        Question question = expr.findUnique();
        if (question == null) {
            return forbidden("sitnet_error_access_forbidden");
        }
        Collections.sort(question.getOptions());
        return ok(question, pp);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result copyQuestion(Long id) {
        User user = getLoggedUser();
        ExpressionList<Question> query = Ebean.find(Question.class).fetch("questionOwners").where().idEq(id);
        if (user.hasRole("TEACHER", getSession())) {
            query = query.disjunction()
                    .eq("shared", true)
                    .eq("questionOwners", user)
                    .endJunction();
        }
        Question question = query.findUnique();
        if (question == null) {
            return forbidden("sitnet_error_access_forbidden");
        }
        Question copy = question.copy();
        copy.setParent(null);
        copy.setQuestion(String.format("<p>**COPY**</p>%s", question.getQuestion()));
        AppUtil.setCreator(copy, user);
        AppUtil.setModifier(copy, user);
        copy.save();
        copy.getTags().addAll(question.getTags());
        copy.getQuestionOwners().clear();
        copy.getQuestionOwners().add(user);
        copy.update();
        Ebean.saveAll(copy.getOptions());
        return ok(Json.toJson(copy));
    }

    private Question parseFromBody(JsonNode node, User user, Question existing) {
        String questionText = parse("question", node, String.class);
        Double defaultMaxScore = round(parse("defaultMaxScore", node, Double.class));
        Integer defaultWordCount = parse("defaultExpectedWordCount", node, Integer.class);
        Question.EvaluationType defaultEvaluationType = parseEnum("defaultEvaluationType", node, Question.EvaluationType.class);
        String defaultInstructions = parse("defaultAnswerInstructions", node, String.class);
        String defaultCriteria = parse("defaultEvaluationCriteria", node, String.class);
        Question.Type type = parseEnum("type", node, Question.Type.class);

        Question question = existing == null ? new Question() : existing;
        question.setType(type);
        question.setQuestion(questionText);
        question.setDefaultMaxScore(defaultMaxScore);
        question.setDefaultExpectedWordCount(defaultWordCount);
        question.setDefaultEvaluationType(defaultEvaluationType);
        question.setDefaultAnswerInstructions(defaultInstructions);
        question.setDefaultEvaluationCriteria(defaultCriteria);
        if (question.getState() == null || !question.getState().equals(QuestionState.DELETED.toString())) {
            question.setState(QuestionState.SAVED.toString());
        }
        if (question.getId() == null) {
            AppUtil.setCreator(question, user);
        }
        AppUtil.setModifier(question, user);

        question.getQuestionOwners().clear();
        if (node.has("questionOwners")) {
            for (JsonNode ownerNode : node.get("questionOwners")) {
                User owner = Ebean.find(User.class, ownerNode.get("id").asLong());
                if (owner != null) {
                    question.getQuestionOwners().add(owner);
                }
            }
        }
        question.getTags().clear();
        if (node.has("tags")) {
            for (JsonNode tagNode : node.get("tags")) {
                Tag tag = Ebean.find(Tag.class, tagNode.get("id").asLong());
                if (tag == null) {
                    tag = new Tag();
                    tag.setName(tagNode.get("name").asText());
                    AppUtil.setCreator(tag, user);
                    AppUtil.setModifier(tag, user);
                }
                question.getTags().add(tag);
            }
        }
        return question;
    }

    @BodyParser.Of(BodyParser.Json.class)
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result createQuestion() {
        User user = getLoggedUser();
        JsonNode body = request().body().asJson();
        Question question = parseFromBody(body, user, null);
        question.getQuestionOwners().add(user);
        return question.getValidationResult(body).orElseGet(() -> {
            if (question.getType() != Question.Type.EssayQuestion) {
                processOptions(question, (ArrayNode) body.get("options"));
            }
            question.save();
            return ok(Json.toJson(question));
        });
    }

    @BodyParser.Of(BodyParser.Json.class)
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateQuestion(Long id) {
        User user = getLoggedUser();
        ExpressionList<Question> query = Ebean.find(Question.class).where().idEq(id);
        if (user.hasRole("TEACHER", getSession())) {
            query = query.disjunction()
                    .eq("shared", true)
                    .eq("questionOwners", user)
                    .eq("examSectionQuestions.examSection.exam.examOwners", user)
                    .endJunction();
        }
        Question question = query.findUnique();
        if (question == null) {
            return forbidden("sitnet_error_access_forbidden");
        }
        JsonNode body = request().body().asJson();
        Question updatedQuestion = parseFromBody(body, user, question);
        return question.getValidationResult(body).orElseGet(() -> {
            if (updatedQuestion.getType() != Question.Type.EssayQuestion) {
                processOptions(updatedQuestion, (ArrayNode) body.get("options"));
            }
            updatedQuestion.update();
            return ok(Json.toJson(updatedQuestion));
        });
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteQuestion(Long id) {
        User user = getLoggedUser();
        ExpressionList<Question> expr = Ebean.find(Question.class).where().idEq(id);
        if (user.hasRole("TEACHER", getSession())) {
            expr = expr.disjunction()
                    .eq("shared", true)
                    .eq("questionOwners", user)
                    .endJunction();
        }
        Question question = expr.findUnique();
        if (question == null) {
            return notFound();
        }

        // Not allowed to remove if used in active exams
        if (!question.getExamSectionQuestions().stream()
                .filter(esq -> {
                    Exam exam = esq.getExamSection().getExam();
                    return exam.getState() == Exam.State.PUBLISHED && exam.getExamActiveEndDate().isAfterNow();
                })
                .collect(Collectors.toList())
                .isEmpty()) {
            return forbidden();
        }
        question.getChildren().forEach(c -> {
            c.setParent(null);
            c.update();
        });
        question.getExamSectionQuestions().forEach((Model::delete));
        try {
            question.delete();
        } catch (PersistenceException e) {
            Logger.info("Shared question attachment reference found, can not delete the reference yet");
            question.setAttachment(null);
            question.delete();
        }
        return ok();
    }

    private void processOptions(Question question, ArrayNode node) {
        Set<Long> persistedIds = question.getOptions().stream()
                .map(MultipleChoiceOption::getId)
                .collect(Collectors.toSet());
        Set<Long> providedIds = StreamSupport.stream(node.spliterator(), false)
                .filter(n -> parse("id", n, Long.class) != null)
                .map(n -> parse("id", n, Long.class))
                .collect(Collectors.toSet());
        // Updates
        StreamSupport.stream(node.spliterator(), false)
                .filter(o -> {
                    Long id = parse("id", o, Long.class);
                    return id != null && persistedIds.contains(id);
                }).forEach(o -> updateOption(o, false));
        // Removals
        question.getOptions().stream()
                .filter(o -> !providedIds.contains(o.getId()))
                .forEach(this::deleteOption);
        // Additions
        StreamSupport.stream(node.spliterator(), false)
                .filter(o -> parse("id", o, Long.class) == null)
                .forEach(o -> createOption(question, o));
    }

    private void createOption(Question question, JsonNode node) {
        MultipleChoiceOption option = new MultipleChoiceOption();
        option.setOption(parse("option", node, String.class));
        String scoreFieldName = node.has("defaultScore") ? "defaultScore" : "score";
        option.setDefaultScore(round(parse(scoreFieldName, node, Double.class)));
        Boolean correctOption = parse("correctOption", node, Boolean.class);
        option.setCorrectOption(correctOption == null ? false : correctOption);
        question.getOptions().add(option);
        AppUtil.setModifier(question, getLoggedUser());
        question.save();
        option.save();
        propagateOptionCreationToExamQuestions(question, null, option);
    }

    void createOptionBasedOnExamQuestion(Question question, ExamSectionQuestion esq, JsonNode node) {
        MultipleChoiceOption option = new MultipleChoiceOption();
        JsonNode baseOptionNode = node.get("option");
        option.setOption(parse("option", baseOptionNode, String.class));
        option.setDefaultScore(round(parse("score", node, Double.class)));
        Boolean correctOption = parse("correctOption", baseOptionNode, Boolean.class);
        option.setCorrectOption(correctOption == null ? false : correctOption);
        question.getOptions().add(option);
        AppUtil.setModifier(question, getLoggedUser());
        question.save();
        option.save();
        propagateOptionCreationToExamQuestions(question, esq, option);
    }

    private void propagateOptionCreationToExamQuestions(Question question, ExamSectionQuestion modifiedExamQuestion,
                                                        MultipleChoiceOption option) {
        // Need to add the new option to bound exam section questions as well
        if (question.getType() == Question.Type.MultipleChoiceQuestion
                || question.getType() == Question.Type.WeightedMultipleChoiceQuestion) {
            for (ExamSectionQuestion examQuestion : question.getExamSectionQuestions()) {
                ExamSectionQuestionOption esqo = new ExamSectionQuestionOption();
                // Preserve scores for the exam question that is under modification right now
                boolean preserveScore = modifiedExamQuestion != null && modifiedExamQuestion.equals(examQuestion);
                Double score = round(preserveScore ? option.getDefaultScore() :
                        calculateOptionScore(question, option, examQuestion));
                esqo.setScore(score);
                esqo.setOption(option);
                examQuestion.addOption(esqo, preserveScore);
                examQuestion.update();
            }
        }
    }

    void updateOption(JsonNode node, boolean skipDefaults) {
        Long id = parse("id", node, Long.class);
        MultipleChoiceOption option = Ebean.find(MultipleChoiceOption.class, id);
        if (option != null) {
            option.setOption(parse("option", node, String.class));
            if (!skipDefaults) {
                option.setDefaultScore(round(parse("defaultScore", node, Double.class)));
            }
            option.setCorrectOption(parse("correctOption", node, Boolean.class, Boolean.FALSE));
            option.update();
        }
    }

    void deleteOption(MultipleChoiceOption option) {
        Question question = option.getQuestion();
        if (question.getType() == Question.Type.WeightedMultipleChoiceQuestion) {
            for (ExamSectionQuestion esq : question.getExamSectionQuestions()) {
                esq.removeOption(option, false);
                esq.save();
            }
        }
        option.delete();
    }

    /**
     * Calculates new option score for ExamSectionQuestionOption.
     *
     * @param question Base question.
     * @param option   New added option.
     * @param esq      ExamSectionQuestion.
     * @return New calculated score rounded to two decimals.
     */
    private Double calculateOptionScore(Question question, MultipleChoiceOption option, ExamSectionQuestion esq) {
        Double defaultScore = option.getDefaultScore();
        if (defaultScore == null || defaultScore == 0) {
            return defaultScore;
        }

        double result = 0.0;
        if (defaultScore > 0) {
            result = (esq.getMaxAssessedScore() / 100) * ((defaultScore / question.getMaxDefaultScore()) * 100);
        } else if (defaultScore < 0) {
            result = (esq.getMinScore() / 100) * ((defaultScore / question.getMinDefaultScore()) * 100);
        }
        return result;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addOwner(Long uid) {
        User newOwner = Ebean.find(User.class).select("id, firstName, lastName, userIdentifier").where().idEq(uid).findUnique();
        if (newOwner == null) {
            return notFound();
        }
        final DynamicForm df = formFactory.form().bindFromRequest();
        final String questionIds = df.data().get("questionIds");

        if (questionIds == null || questionIds.isEmpty()) {
            return badRequest();
        }
        List<Long> ids = Stream.of(questionIds.split(","))
                .map(Long::parseLong)
                .collect(Collectors.toList());
        User modifier = getLoggedUser();
        ExpressionList<Question> expr = Ebean.find(Question.class).where().idIn(ids);
        if (modifier.hasRole("TEACHER", getSession())) {
            expr = expr.disjunction()
                    .eq("shared", true)
                    .eq("questionOwners", modifier)
                    .endJunction();
        }
        List<Question> questions = expr.findList();
        if (questions.isEmpty()) {
            return notFound();
        }
        questions.forEach(q -> addOwner(q, newOwner, modifier));
        return ok(newOwner);
    }

    private void addOwner(Question question, User user, User modifier) {
        AppUtil.setModifier(question, modifier);
        question.getQuestionOwners().add(user);
        question.update();
    }

}
