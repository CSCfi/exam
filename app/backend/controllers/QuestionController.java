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

package backend.controllers;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import javax.persistence.PersistenceException;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.Model;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import play.Logger;
import play.data.DynamicForm;
import play.mvc.BodyParser;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import scala.collection.JavaConverters;

import backend.controllers.base.BaseController;
import backend.controllers.base.SectionQuestionHandler;
import backend.models.Exam;
import backend.models.Role;
import backend.models.Tag;
import backend.models.User;
import backend.models.questions.MultipleChoiceOption;
import backend.models.questions.Question;
import backend.sanitizers.Attrs;
import backend.sanitizers.QuestionTextSanitizer;
import backend.sanitizers.SanitizingHelper;
import backend.security.Authenticated;
import backend.util.AppUtil;
import backend.util.file.FileHandler;
import backend.util.xml.MoodleXmlConverter;

public class QuestionController extends BaseController implements SectionQuestionHandler {

    @Inject
    private MoodleXmlConverter xmlConverter;
    @Inject
    private FileHandler fileHandler;

    private static final Logger.ALogger logger = Logger.of(QuestionController.class);

    private enum QuestionState {
        NEW, SAVED, DELETED
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getQuestions(List<Long> examIds, List<Long> courseIds, List<Long> tagIds, List<Long> sectionIds, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (user.hasRole(Role.Name.ADMIN)
                && Stream.of(examIds, courseIds, tagIds, sectionIds).allMatch(List::isEmpty)) {
            return ok(Collections.emptySet());
        }
        PathProperties pp = PathProperties.parse("*, modifier(firstName, lastName) questionOwners(id, firstName, lastName, userIdentifier, email), " +
                "attachment(id, fileName), options(defaultScore, correctOption, claimChoiceType), tags(name), examSectionQuestions(examSection(exam(state, examActiveEndDate, course(code)))))");
        Query<Question> query = Ebean.find(Question.class);
        pp.apply(query);
        ExpressionList<Question> el = query
                .where()
                .isNull("parent")
                .endJunction()
                .ne("state", QuestionState.DELETED.toString());
        if (user.hasRole(Role.Name.TEACHER)) {
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

    private Optional<Question> getQuestionOfUser(ExpressionList<Question> expr, User user) {
        if (user.hasRole(Role.Name.TEACHER)) {
            return expr.disjunction()
                    .eq("shared", true)
                    .eq("questionOwners", user)
                    .eq("examSectionQuestions.examSection.exam.examOwners", user)
                    .endJunction()
                    .findOneOrEmpty();
        }
        return expr.findOneOrEmpty();
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getQuestion(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Query<Question> query = Ebean.find(Question.class);
        PathProperties pp = PathProperties.parse("(*, questionOwners(id, firstName, lastName, userIdentifier, email), " +
                "attachment(id, fileName), options(id, correctOption, defaultScore, option, claimChoiceType), tags(id, name), " +
                "examSectionQuestions(id, examSection(name, exam(name, state))))");
        pp.apply(query);
        ExpressionList<Question> expr = query.where().idEq(id);
        Optional<Question> optionalQuestion = getQuestionOfUser(expr, user);
        if (optionalQuestion.isPresent()) {
            Question q = optionalQuestion.get();
            Collections.sort(q.getOptions());
            return ok(q, pp);
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result copyQuestion(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExpressionList<Question> query = Ebean.find(Question.class).fetch("questionOwners").where().idEq(id);
        if (user.hasRole(Role.Name.TEACHER)) {
            query = query.disjunction()
                    .eq("shared", true)
                    .eq("questionOwners", user)
                    .endJunction();
        }
        Question question = query.findOne();
        if (question == null) {
            return forbidden("sitnet_error_access_forbidden");
        }
        Collections.sort(question.getOptions());
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
        return ok(copy);
    }

    // TODO: Move to sanitizer
    private Question parseFromBody(Http.Request request, User user, Question existing) {
        JsonNode node = request.body().asJson();
        String questionText = request.attrs().getOptional(Attrs.QUESTION_TEXT).orElse(null);
        Double defaultMaxScore = round(SanitizingHelper.parse("defaultMaxScore", node, Double.class).orElse(null));
        Integer defaultWordCount = SanitizingHelper.parse("defaultExpectedWordCount", node, Integer.class).orElse(null);
        Question.EvaluationType defaultEvaluationType =
                SanitizingHelper.parseEnum("defaultEvaluationType", node, Question.EvaluationType.class).orElse(null);
        String defaultInstructions = SanitizingHelper.parse("defaultAnswerInstructions", node, String.class).orElse(null);
        String defaultCriteria = SanitizingHelper.parse("defaultEvaluationCriteria", node, String.class).orElse(null);
        Question.Type type = SanitizingHelper.parseEnum("type", node, Question.Type.class).orElse(null);

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
                // See if we have an identical tag already and use it if that's the case
                Optional<Tag> tag = Optional.empty();
                if (tagNode.has("id")) {
                   tag = Ebean.find(Tag.class).where().idEq(tagNode.get("id").asLong()).findOneOrEmpty();
                } else {
                    List<Tag> tags = Ebean.find(Tag.class).where()
                            .eq("name", tagNode.get("name").asText())
                            .eq("creator", user)
                            .findList();
                    if (!tags.isEmpty()) {
                        tag = Optional.of(tags.get(0));
                    }
                }
                if (tag.isEmpty()) {
                    Tag newTag = new Tag();
                    newTag.setName(tagNode.get("name").asText());
                    AppUtil.setCreator(newTag, user);
                    AppUtil.setModifier(newTag, user);
                    tag = Optional.of(newTag);
                }
                question.getTags().add(tag.get());
            }
        }
        return question;
    }

    @BodyParser.Of(BodyParser.Json.class)
    @Authenticated
    @With(QuestionTextSanitizer.class)
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result createQuestion(Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Question question = parseFromBody(request, user, null);
        question.getQuestionOwners().add(user);
        JsonNode body = request.body().asJson();
        return question.getValidationResult(body).orElseGet(() -> {
            if (question.getType() != Question.Type.EssayQuestion) {
                processOptions(question, user, (ArrayNode) body.get("options"));
            }
            question.save();
            return ok(question);
        });
    }

    @BodyParser.Of(BodyParser.Json.class)
    @With(QuestionTextSanitizer.class)
    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateQuestion(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExpressionList<Question> query = Ebean.find(Question.class).where().idEq(id);
        if (user.hasRole(Role.Name.TEACHER)) {
            query = query.disjunction()
                    .eq("shared", true)
                    .eq("questionOwners", user)
                    .eq("examSectionQuestions.examSection.exam.examOwners", user)
                    .endJunction();
        }
        Question question = query.findOne();
        if (question == null) {
            return forbidden("sitnet_error_access_forbidden");
        }
        Question updatedQuestion = parseFromBody(request, user, question);
        JsonNode body = request.body().asJson();
        return question.getValidationResult(body).orElseGet(() -> {
            if (updatedQuestion.getType() != Question.Type.EssayQuestion) {
                processOptions(updatedQuestion, user, (ArrayNode) body.get("options"));
            }
            updatedQuestion.update();
            return ok(updatedQuestion);
        });
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteQuestion(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExpressionList<Question> expr = Ebean.find(Question.class).where().idEq(id);
        if (user.hasRole(Role.Name.TEACHER)) {
            expr = expr.disjunction()
                    .eq("shared", true)
                    .eq("questionOwners", user)
                    .endJunction();
        }
        Question question = expr.findOne();
        if (question == null) {
            return notFound();
        }

        // Not allowed to remove if used in active exams
        if (question.getExamSectionQuestions().stream().anyMatch(esq -> {
            Exam exam = esq.getExamSection().getExam();
            return exam.getState() == Exam.State.PUBLISHED && exam.getExamActiveEndDate().isAfterNow();
        })) {
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
            logger.info("Shared question attachment reference found, can not delete the reference yet");
            question.setAttachment(null);
            question.delete();
        }
        return ok();
    }


    private void processOptions(Question question, User user, ArrayNode node) {
        Set<Long> persistedIds = question.getOptions().stream()
                .map(MultipleChoiceOption::getId)
                .collect(Collectors.toSet());
        Set<Long> providedIds = StreamSupport.stream(node.spliterator(), false)
                .filter(n -> SanitizingHelper.parse("id", n, Long.class).isPresent())
                .map(n -> SanitizingHelper.parse("id", n, Long.class).get())
                .collect(Collectors.toSet());
        // Updates
        StreamSupport.stream(node.spliterator(), false)
                .filter(o -> {
                    Optional<Long> id = SanitizingHelper.parse("id", o, Long.class);
                    return id.isPresent() && persistedIds.contains(id.get());
                }).forEach(o -> updateOption(o, OptionUpdateOptions.HANDLE_DEFAULTS));
        // Removals
        question.getOptions().stream()
                .filter(o -> !providedIds.contains(o.getId()))
                .forEach(this::deleteOption);
        // Additions
        StreamSupport.stream(node.spliterator(), false)
                .filter(o -> SanitizingHelper.parse("id", o, Long.class).isEmpty())
                .forEach(o -> createOption(question, o, user));
    }

    private void createOption(Question question, JsonNode node, User user) {
        MultipleChoiceOption option = new MultipleChoiceOption();
        option.setOption(SanitizingHelper.parseHtml("option", node));
        String scoreFieldName = node.has("defaultScore") ? "defaultScore" : "score";
        option.setDefaultScore(round(SanitizingHelper.parse(scoreFieldName, node, Double.class).orElse(null)));
        Boolean correctOption = SanitizingHelper.parse("correctOption", node, Boolean.class, false);
        option.setCorrectOption(correctOption);
        option.setClaimChoiceType(
                SanitizingHelper.parseEnum("claimChoiceType", node, MultipleChoiceOption.ClaimChoiceOptionType.class)
                .orElse(null)
        );
        saveOption(option, question, user);
        propagateOptionCreationToExamQuestions(question, null, option);
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addOwner(Long uid, Http.Request request) {
        User newOwner = Ebean.find(User.class).select("id, firstName, lastName, userIdentifier").where().idEq(uid).findOne();
        if (newOwner == null) {
            return notFound();
        }
        final DynamicForm df = formFactory.form().bindFromRequest(request);
        final String questionIds = df.rawData().get("questionIds");

        if (questionIds == null || questionIds.isEmpty()) {
            return badRequest();
        }
        List<Long> ids = Stream.of(questionIds.split(","))
                .map(Long::parseLong)
                .collect(Collectors.toList());
        User modifier = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExpressionList<Question> expr = Ebean.find(Question.class).where().idIn(ids);
        if (modifier.hasRole(Role.Name.TEACHER)) {
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

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result exportQuestions(Http.Request request) throws IOException {
        JsonNode body = request.body().asJson();
        ArrayNode node = (ArrayNode) body.get("params").get("ids");
        Set<Long> ids = StreamSupport.stream(node.spliterator(), false)
                .map(JsonNode::asLong).collect(Collectors.toSet());
        List<Question> questions = Ebean.find(Question.class).where().idIn(ids).findList().stream()
                .filter(q -> q.getType() != Question.Type.ClaimChoiceQuestion &&
                        q.getType() != Question.Type.ClozeTestQuestion)
                .collect(Collectors.toList());
        String document = xmlConverter.convert(
                JavaConverters.collectionAsScalaIterableConverter(questions).asScala().toSeq()
        );
        return ok(document)
                .withHeader("Content-Disposition", "attachment; filename=\"moodle-quiz.xml\"")
                .as("application/xml");
    }

}
