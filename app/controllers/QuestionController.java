package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.PathProperties;
import models.User;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import play.data.DynamicForm;
import play.libs.Json;
import play.mvc.Result;
import util.AppUtil;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class QuestionController extends BaseController {

    private enum QuestionState {
        NEW, SAVED, DELETED
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getQuestions(List<Long> examIds, List<Long> courseIds, List<Long> tagIds, List<Long> sectionIds) {
        User user = getLoggedUser();
        ExpressionList<Question> query = createQuery()
                .where()
                .isNull("parent")
                .ne("state", QuestionState.DELETED.toString());
        if (user.hasRole("TEACHER", getSession())) {
            query = query.disjunction()
                    .eq("shared", true)
                    .eq("questionOwners", user)
                    .endJunction();
        }
        if (!examIds.isEmpty()) {
            query = query.in("examSectionQuestions.examSection.exam.id", examIds);
        }
        if (!courseIds.isEmpty()) {
            query = query.in("examSectionQuestions.examSection.exam.course.id", courseIds);
        }
        if (!tagIds.isEmpty()) {
            query = query.in("tags.id", tagIds);
        }
        if (!sectionIds.isEmpty()) {
            query = query.in("examSectionQuestions.examSection.id", sectionIds);
        }
        Set<Question> questions = query.orderBy("created desc").findSet();
        return ok(questions);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getQuestion(Long id) {
        User user = getLoggedUser();
        Query<Question> query = Ebean.find(Question.class);
        PathProperties pp = PathProperties.parse("(*, questionOwners(id, firstName, lastName, userIdentifier, email), " +
                "attachment(id, fileName), options(id, correctOption, defaultScore, option), tags(id, name), " +
                "examSectionQuestions(id, examSection(name, exam(name))))");
        pp.apply(query);
        ExpressionList<Question> expr =  query.where().idEq(id);
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
        ExpressionList<Question> query = Ebean.find(Question.class).where().idEq(id);
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
        copy.update();
        Ebean.saveAll(copy.getOptions());
        return ok(Json.toJson(copy));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result createQuestion() {
        Question question = bindForm(Question.class);
        question.setQuestionOwners(new HashSet<>());
        question.getQuestionOwners().add(getLoggedUser());
        User user = getLoggedUser();
        AppUtil.setCreator(question, user);
        AppUtil.setModifier(question, user);
        question.setState(QuestionState.NEW.toString());
        question.save();
        return ok(Json.toJson(question));
    }

    private static void doUpdateQuestion(Question question, DynamicForm df, User user) {
        if (df.get("question") != null) {
            question.setQuestion(df.get("question"));
        }
        question.setShared(Boolean.parseBoolean(df.get("shared")));
        question.setState(QuestionState.SAVED.toString());
        AppUtil.setModifier(question, user);
        question.update();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateQuestion(Long id) {
        DynamicForm df = formFactory.form().bindFromRequest();
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
        String validationResult = question.getValidationResult();
        if (validationResult != null) {
            return forbidden(validationResult);
        }
        doUpdateQuestion(question, df, user);
        return ok(Json.toJson(question));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateOption(Long oid) {
        MultipleChoiceOption form = bindForm(MultipleChoiceOption.class);
        MultipleChoiceOption option = Ebean.find(MultipleChoiceOption.class, oid);
        if (option == null) {
            return notFound();
        }
        option.setOption(form.getOption());
        option.update();
        return ok(Json.toJson(option));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result toggleCorrectOption(Long oid) {
        MultipleChoiceOption option = Ebean.find(MultipleChoiceOption.class, oid);
        if (option == null) {
            return notFound();
        }
        boolean isCorrect = !option.isCorrectOption();
        Question question = option.getQuestion();
        for (MultipleChoiceOption mco : option.getQuestion().getOptions()) {
            if (mco.equals(option)) {
                mco.setCorrectOption(isCorrect);
            } else {
                mco.setCorrectOption(!isCorrect);
            }
            mco.update();
        }
        Collections.sort(question.getOptions());
        return ok(Json.toJson(question));
    }

    // TODO: needs object level permission checks and data loss prevention checks
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteQuestion(Long id) {
        Question question = Ebean.find(Question.class, id);
        if (question == null) {
            return notFound();
        }
        question.setState(QuestionState.DELETED.toString());
        AppUtil.setModifier(question, getLoggedUser());
        question.save();
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteOption(Long oid) {
        Ebean.delete(MultipleChoiceOption.class, oid);
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addOption(Long qid) {
        Question question = Ebean.find(Question.class, qid);
        if (question == null) {
            return notFound();
        }
        MultipleChoiceOption option = bindForm(MultipleChoiceOption.class);
        question.getOptions().add(option);
        AppUtil.setModifier(question, getLoggedUser());
        question.save();
        option.save();

        return ok(Json.toJson(option));
    }

    private static Query<Question> createQuery() {
        return Ebean.find(Question.class)
                .fetch("questionOwners", "firstName, lastName, userIdentifier")
                .fetch("attachment")
                .fetch("options")
                .fetch("examSectionQuestions.examSection.exam.course", "code");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addOwner(Long uid) {

        User newOwner = Ebean.find(User.class, uid);
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
        Ebean.find(Question.class).where().idIn(ids).findList()
                .forEach(q -> {
                    addOwner(q, newOwner);
                    // TODO: this will go away when hierarchy changes
                    q.getChildren()
                            .forEach(cq -> addOwner(cq, newOwner));
                });
        return ok();
    }

    private void addOwner(Question question, User user) {
        AppUtil.setModifier(question, user);
        question.getQuestionOwners().add(user);
        question.update();
    }

}
