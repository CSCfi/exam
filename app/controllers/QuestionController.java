package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.FetchConfig;
import com.avaje.ebean.Model;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.PathProperties;
import models.Exam;
import models.ExamSectionQuestion;
import models.ExamSectionQuestionOption;
import models.User;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import play.Logger;
import play.data.DynamicForm;
import play.libs.Json;
import play.mvc.Result;
import util.AppUtil;

import javax.persistence.PersistenceException;
import java.util.Collections;
import java.util.Date;
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
                "examSectionQuestions(id, examSection(name, exam(name))))");
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
        if (df.get("defaultMaxScore") != null) {
            question.setDefaultMaxScore(Integer.parseInt(df.get("defaultMaxScore")));
        }
        if (df.get("defaultExpectedWordCount") != null) {
            question.setDefaultExpectedWordCount(Integer.parseInt(df.get("defaultExpectedWordCount")));
        }
        if (df.get("defaultEvaluationType") != null) {
            question.setDefaultEvaluationType(Question.EvaluationType.valueOf(df.get("defaultEvaluationType")));
        }
        question.setDefaultAnswerInstructions(df.get("defaultAnswerInstructions"));
        question.setDefaultEvaluationCriteria(df.get("defaultEvaluationCriteria"));
        question.setShared(Boolean.parseBoolean(df.get("shared")));
        if (!QuestionState.DELETED.toString().equals(question.getState())) {
            question.setState(QuestionState.SAVED.toString());
        }
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
        option.setDefaultScore(form.getDefaultScore());
        option.update();
        return ok(Json.toJson(option));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result toggleCorrectOption(Long oid) {
        MultipleChoiceOption option = Ebean.find(MultipleChoiceOption.class, oid);
        if (option == null) {
            return notFound();
        }
        Question question = option.getQuestion();
        for (MultipleChoiceOption mco : option.getQuestion().getOptions()) {
            if (mco.equals(option)) {
                mco.setCorrectOption(true);
            } else {
                mco.setCorrectOption(false);
            }
            mco.update();
        }
        Collections.sort(question.getOptions());
        return ok(Json.toJson(question));
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
                    return exam.getState() == Exam.State.PUBLISHED && exam.getExamActiveEndDate().after(new Date());
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

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteOption(Long oid) {
        return deleteOptionQ(null, oid);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteOptionQ(Long qid, Long oid) {
        MultipleChoiceOption option = Ebean.find(MultipleChoiceOption.class, oid);
        if (option == null) {
            return ok();
        }
        Question question = option.getQuestion();
        if (question.getType() == Question.Type.WeightedMultipleChoiceQuestion) {
            for (ExamSectionQuestion esq : question.getExamSectionQuestions()) {
                boolean preserveScores = false;
                if (esq.getId().equals(qid)) {
                    preserveScores = true;
                }
                esq.removeOption(option, preserveScores);
                esq.save();
            }
        }
        option.delete();
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addOption(Long qid) {
        Question question = Ebean.find(Question.class, qid);
        if (question == null) {
            return notFound();
        }
        final DynamicForm df = formFactory.form().bindFromRequest();
        String examSectionQuestionId = df.get("examSectionQuestionId");
        MultipleChoiceOption option = bindForm(MultipleChoiceOption.class);
        question.getOptions().add(option);
        AppUtil.setModifier(question, getLoggedUser());
        question.save();
        option.save();

        // Need to add the new option to bound exam section questions as well
        if (question.getType() == Question.Type.MultipleChoiceQuestion
                || question.getType() == Question.Type.WeightedMultipleChoiceQuestion) {
            for (ExamSectionQuestion esq : question.getExamSectionQuestions()) {
                Double score = calculateOptionScore(question, option, esq);
                boolean preserveScores = false;
                if (esq.getId().toString().equals(examSectionQuestionId)) {
                    //Use original score for calling exam section question.
                    score = option.getDefaultScore();
                    preserveScores = true;
                }
                ExamSectionQuestionOption esqo = new ExamSectionQuestionOption();
                esqo.setScore(score);
                esqo.setOption(option);

                esq.addOption(esqo, preserveScores);
                esq.update();
            }
        }
        return ok(Json.toJson(option));
    }

    /**
     * Calculates new option score for ExamSectionQuestionOption.
     *
     * @param question Base question.
     * @param option New added option.
     * @param esq ExamSectionQuestion.
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
        return Math.round(result * 100) / 100d;
    }

    private static Query<Question> createQuery() {
        return Ebean.find(Question.class)
                .fetch("questionOwners", "firstName, lastName, userIdentifier")
                .fetch("attachment")
                .fetch("options", "defaultScore", new FetchConfig().query())
                .fetch("examSectionQuestions.examSection.exam.course", "code", new FetchConfig().query());
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

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeOwner(Long uid) {
        User owner = Ebean.find(User.class, uid);
        if (owner == null) {
            return notFound();
        }
        final DynamicForm df = formFactory.form().bindFromRequest();
        final String questionId = df.data().get("questionId");

        if (questionId == null || questionId.isEmpty()) {
            return badRequest();
        }
        User user = getLoggedUser();
        ExpressionList<Question> expr = Ebean.find(Question.class).where().idEq(questionId);
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
        if (question.getQuestionOwners().size() < 2) {
            // Minimum of one owners must remain
            return forbidden();
        }
        AppUtil.setModifier(question, getLoggedUser());
        question.getQuestionOwners().remove(owner);
        question.update();
        return ok();
    }

    private void addOwner(Question question, User user, User modifier) {
        AppUtil.setModifier(question, modifier);
        question.getQuestionOwners().add(user);
        question.update();
    }

}
