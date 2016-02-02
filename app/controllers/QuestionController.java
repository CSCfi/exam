package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.Query;
import models.Tag;
import models.User;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;
import util.AppUtil;

import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class QuestionController extends BaseController {

    enum QuestionState {
        NEW, SAVED, DELETED
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getQuestions(List<Long> examIds, List<Long> courseIds, List<Long> tagIds, List<Long> sectionIds) {
        User user = getLoggedUser();
        ExpressionList<Question> query = createQuery()
                .fetch("creator", "firstName, lastName, userIdentifier")
                .where()
                .isNull("parent")
                .ne("state", QuestionState.DELETED.toString());
        if (user.hasRole("TEACHER", getSession())) {
            query = query.eq("creator", user);
        }
        if (!examIds.isEmpty()) {
            query = query.in("children.examSectionQuestion.examSection.exam.id", examIds);
        }
        if (!courseIds.isEmpty()) {
            query = query.in("children.examSectionQuestion.examSection.exam.course.id", courseIds);
        }
        if (!tagIds.isEmpty()) {
            query = query.in("tags.id", tagIds);
        }
        if (!sectionIds.isEmpty()) {
            query = query.in("children.examSectionQuestion.examSection.id", sectionIds);
        }
        Set<Question> questions = query.orderBy("created desc").findSet();
        return ok(questions);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getQuestion(Long id) {
        User user = getLoggedUser();
        ExpressionList<Question> query = Ebean.find(Question.class).where().idEq(id);
        if (user.hasRole("TEACHER", getSession())) {
            query = query.disjunction()
                    .eq("creator", user)
                    .eq("examSectionQuestion.examSection.exam.examOwners", user)
                    .endJunction();
        }
        Question question = query.findUnique();
        if (question == null) {
            return forbidden("sitnet_error_access_forbidden");
        }
        Collections.sort(question.getOptions());
        return ok(Json.toJson(question));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result copyQuestion(Long id) {
        Question question = Ebean.find(Question.class, id);
        Question copy = question.copy();
        copy.setParent(null);
        copy.setQuestion(String.format("<p>**COPY**</p>%s", question.getQuestion()));
        User user = getLoggedUser();
        AppUtil.setCreator(copy, user);
        AppUtil.setModifier(copy, user);
        copy.save();
        copy.getTags().addAll(question.getTags());
        copy.update();
        Ebean.save(copy.getOptions());
        return ok(Json.toJson(copy));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addQuestion() {
        Question question = bindForm(Question.class);
        User user = getLoggedUser();
        AppUtil.setCreator(question, user);
        AppUtil.setModifier(question, user);
        question.setState(QuestionState.NEW.toString());
        question.save();
        return ok(Json.toJson(question));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result scoreQuestion(Long id) {
        DynamicForm df = Form.form().bindFromRequest();
        Question essayQuestion = Ebean.find(Question.class, id);
        essayQuestion.setEvaluatedScore(Double.parseDouble(df.get("evaluatedScore")));
        essayQuestion.update();
        return ok(Json.toJson(essayQuestion));
    }

    private static void doUpdateQuestion(Question question, DynamicForm df, User user) {
        if (df.get("question") != null) {
            question.setQuestion(df.get("question"));
        }
        if (df.get("maxScore") != null) {
            question.setMaxScore(Double.parseDouble(df.get("maxScore")));
        }
        question.setInstruction(df.get("instruction"));
        question.setEvaluationCriterias(df.get("evaluationCriterias"));
        question.setShared(Boolean.parseBoolean(df.get("shared")));
        question.setState(QuestionState.SAVED.toString());
        AppUtil.setModifier(question, user);
        question.update();
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateQuestion(Long id) {
        DynamicForm df = Form.form().bindFromRequest();
        Question question = Ebean.find(Question.class, id);
        if (question == null) {
            return notFound("question not found");
        }
        User user = getLoggedUser();
        if (df.get("maxCharacters") != null) {
            question.setMaxCharacters(Long.parseLong(df.get("maxCharacters")));
        }
        question.setEvaluationType(df.get("evaluationType"));
        String validationResult = question.validate();
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
        option.setOption(form.getOption());
        option.setScore(form.getScore());
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

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteQuestion(Long id) {
        Question question = Ebean.find(Question.class, id);
        question.setState(QuestionState.DELETED.toString());
        AppUtil.setModifier(question, getLoggedUser());
        question.save();
        return ok("Question deleted from database!");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteOption(Long oid) {
        Ebean.delete(MultipleChoiceOption.class, oid);
        return ok("Option deleted from database!");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addOption(Long qid) {

        Question question = Ebean.find(Question.class, qid);
        MultipleChoiceOption option = bindForm(MultipleChoiceOption.class);
        question.getOptions().add(option);
        AppUtil.setModifier(question, getLoggedUser());
        question.save();
        option.save();

        return ok(Json.toJson(option));
    }

    private static Query<Question> createQuery() {
        return Ebean.find(Question.class)
                .fetch("creator", "id")
                .fetch("parent", "id")
                .fetch("attachment")
                .fetch("options")
                .fetch("children.examSectionQuestion.examSection.exam.course", "code");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateQuestionOwner(Long uid) {

        User teacher = Ebean.find(User.class, uid);
        if (teacher == null) {
            return notFound();
        }
        final DynamicForm df = Form.form().bindFromRequest();
        final String questionIds = df.data().get("questionIds");
        if (questionIds == null || questionIds.isEmpty()) {
            return badRequest();
        }

        List<Tag> tagsOfNewOwner = Ebean.find(Tag.class)
                .where()
                .eq("creator.id", teacher.getId())
                .findList();

        User originalUser = getLoggedUser();
        List<Long> ids = Stream.of(questionIds.split(",")).map(Long::parseLong).collect(Collectors.toList());
        Ebean.find(Question.class).where().idIn(ids).findList().forEach(q -> {
            changeOwnership(q, originalUser, teacher, tagsOfNewOwner);
            q.getChildren()
                    .forEach(cq -> changeOwnership(cq, originalUser, teacher, tagsOfNewOwner));
        });
        return ok();
    }

    private static void changeOwnership(Question question, User oldOwner, User newOwner, List<Tag> tagsOfNewOwner) {
        AppUtil.setCreator(question, newOwner);
        AppUtil.setModifier(question, oldOwner);
        question.update();
        handleTags(question, tagsOfNewOwner, newOwner); // handle question tags
    }

    private static void handleTags(Question question, List<Tag> tagsOfNewOwner, User teacher) {
        for (Tag oldTag : question.getTags()) {
            int index = tagsOfNewOwner.indexOf(oldTag);
            if (index > -1) {
                Tag existingTag = tagsOfNewOwner.get(index);
                // Replace with existing tag
                if (!existingTag.getQuestions().contains(question)) {
                    existingTag.getQuestions().add(question);
                    existingTag.update();
                }
            } else {
                // Create new
                Tag newTag = addNewTag(oldTag.getName(), question, teacher);
                tagsOfNewOwner.add(newTag);

            }
            removeOldTag(oldTag, question);
        }
    }

    private static Tag addNewTag(String name, Question question, User teacher) {
        Tag newTag = new Tag();
        newTag.setName(name);
        newTag.setCreator(teacher);
        newTag.setCreated(new Date());
        newTag.getQuestions().add(question);
        newTag.save();
        return newTag;
    }

    private static void removeOldTag(Tag tag, Question question) {
        tag.getQuestions().remove(question);
        tag.update();
        if (tag.getQuestions().isEmpty()) {
            tag.delete();
        }
    }
}
