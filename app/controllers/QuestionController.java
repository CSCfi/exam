package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import exceptions.MalformedDataException;
import exceptions.SitnetException;
import models.Tag;
import models.User;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import models.questions.MultipleChoiceQuestion;
import models.questions.MultipleChoiseOption;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

import java.util.List;
import java.util.Set;

public class QuestionController extends SitnetController {

    enum QuestionState {
        NEW, SAVED, DELETED
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getQuestions(List<Long> examIds, List<Long> courseIds, List<Long> tagIds, List<Long> sectionIds) {
        User user = UserController.getLoggedUser();
        ExpressionList<AbstractQuestion> query = Ebean.find(AbstractQuestion.class)
                .where()
                .isNull("parent")
                .ne("state", QuestionState.DELETED.toString());
        if (user.hasRole("TEACHER")) {
            query = query.disjunction()
                    .eq("creator.id", user.getId())
                    .eq("shared", true)
                    .endJunction();
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
        Set<AbstractQuestion> questions = query.orderBy("created desc").findSet();
        JsonContext jsonContext = Ebean.createJsonContext();
        return ok(jsonContext.toJsonString(questions, true, getOptions())).as("application/json");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getQuestion(Long id) {
        AbstractQuestion question = Ebean.find(AbstractQuestion.class, id);
        return ok(Json.toJson(question));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result copyQuestion(Long id) throws SitnetException {

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, id).copy();
        SitnetUtil.setCreator(question);
        question.save();
        if (question instanceof MultipleChoiceQuestion) {
            Ebean.save(((MultipleChoiceQuestion) question).getOptions());
        }
        return ok(Json.toJson(question));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result addQuestion() throws SitnetException {
        DynamicForm df = Form.form().bindFromRequest();
        Class<? extends AbstractQuestion> clazz;
        switch (df.get("type")) {
            case "MultipleChoiceQuestion":
                clazz = MultipleChoiceQuestion.class;
                break;
            case "EssayQuestion":
                clazz = EssayQuestion.class;
                break;
            default:
                throw new IllegalArgumentException("question type not supported");
        }
        AbstractQuestion question = bindForm(clazz);
        SitnetUtil.setCreator(question);
        question.setState(QuestionState.NEW.toString());
        Ebean.save(question);
        return ok(Json.toJson(question));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result scoreQuestion(Long id) {
        DynamicForm df = Form.form().bindFromRequest();
        EssayQuestion essayQuestion = Ebean.find(EssayQuestion.class, id);
        essayQuestion.setEvaluatedScore(Double.parseDouble(df.get("evaluatedScore")));
        essayQuestion.update();
        return ok(Json.toJson(essayQuestion));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result updateQuestion(Long id) {
        DynamicForm df = Form.form().bindFromRequest();
        AbstractQuestion question = Ebean.find(AbstractQuestion.class, id);
        if (question == null) {
            return notFound("question not found");
        }
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
        question.update();
        switch (df.get("type")) {
            case "EssayQuestion":
                EssayQuestion essay = Ebean.find(EssayQuestion.class, id);
                if (df.get("maxCharacters") != null) {
                    essay.setMaxCharacters(Long.parseLong(df.get("maxCharacters")));
                }
                if (df.get("evaluationType") != null) {
                    essay.setEvaluationType(df.get("evaluationType"));
                }
                essay.update();
                return ok(Json.toJson(essay));
            case "MultipleChoiceQuestion":
                return ok(Json.toJson(question));
            default:
                return badRequest();
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result updateQuestionOwner(Long uid) {

        final User teacher = Ebean.find(User.class, uid);

        if(teacher == null) {
            return notFound();
        }

        final DynamicForm df = Form.form().bindFromRequest();
        final String questionIds = df.data().get("questionIds");

        if(questionIds == null || questionIds.length() < 1) {
            return notFound();
        }

        // get new teacher tags
        List<Tag> teacherTags = Ebean.find(Tag.class)
                .where()
                .eq("creator.id", teacher.getId())
                .findList();

        for (String s : questionIds.split(",")) {
            final AbstractQuestion question = Ebean.find(AbstractQuestion.class, Integer.parseInt(s));

            if (question != null) {

                handleTags(question, teacherTags, teacher); // handle question tags
                question.setCreator(teacher);
                question.update();

                if (question.getChildren() != null && question.getChildren().size() > 0) {
                    for (AbstractQuestion childQuestion : question.getChildren()) {
                        handleTags(childQuestion, teacherTags, teacher); // handle question tags
                        childQuestion.setCreator(teacher);
                        childQuestion.update();
                    }
                }
            }
        }

        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result updateOption(Long oid) throws MalformedDataException {

        MultipleChoiseOption option = bindForm(MultipleChoiseOption.class);
        option.update();

        return ok(Json.toJson(option));

    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result deleteQuestion(Long id) {

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, id);

        question.setState(QuestionState.DELETED.toString());
        question.save();

        return ok("Question deleted from database!");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result deleteOption(Long oid) {

        Ebean.delete(MultipleChoiseOption.class, oid);

        return ok("Option deleted from database!");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result addOption(Long qid) throws MalformedDataException {

        MultipleChoiceQuestion question = Ebean.find(MultipleChoiceQuestion.class, qid);
        MultipleChoiseOption option = bindForm(MultipleChoiseOption.class);
        question.getOptions().add(option);
        question.save();
        option.save();

        return ok(Json.toJson(option));
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result createOption() {

        MultipleChoiseOption option = new MultipleChoiseOption();
        option.setCorrectOption(false);
        option.save();

        return ok(Json.toJson(option));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getOption(Long id) {

        MultipleChoiseOption option = Ebean.find(MultipleChoiseOption.class, id);
        return ok(Json.toJson(option));
    }

    private static JsonWriteOptions getOptions() {
        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, creator, type, question, shared, instruction, state, maxScore, " +
                "evaluatedScore, parent, evaluationCriterias, attachment, " +
                "expanded, maxCharacters, evaluationType, options, children");
        options.setPathProperties("creator", "id");
        options.setPathProperties("parent", "id");
        options.setPathProperties("attachment", "id, fileName");
        options.setPathProperties("children", "examSectionQuestion");
        options.setPathProperties("children.examSectionQuestion", "examSection");
        options.setPathProperties("children.examSectionQuestion.examSection", "exam");
        options.setPathProperties("children.examSectionQuestion.examSection.exam", "course");
        options.setPathProperties("children.examSectionQuestion.examSection.exam.course", "code");
        options.setPathProperties("options", "id, option, correctOption, score");

        return options;
    }


    private static void handleTags(AbstractQuestion question, List<Tag> teacherTags, User teacher) {
        if(question != null && question.getTags() != null) {
            List<Tag> tags = question.getTags();
            for(Tag tag : tags) {

                // create new tag and add it to question if current user has no tags ->
                if(teacherTags == null) {
                    addNewTag(tag, question, teacher);
                    removeOldTag(tag, question);
                    continue;
                }

                // check if user has tag with same name ->
                Boolean add = true;
                for(Tag userTag : teacherTags) {

                    // if user has a tag with same name ->
                    // remove question old user's tag and add new user's own tag to question
                    if(userTag.getName().equalsIgnoreCase(tag.getName())) { // case insensitive !!!
                        add = false;
                        if(! userTag.getQuestions().contains(question)) {
                            userTag.getQuestions().add(question);
                            userTag.update();
                        }
                        removeOldTag(tag, question);

                        break;
                    }
                }

                // if user does not have a tag with same name -> add
                if(add) {
                    addNewTag(tag, question, teacher);
                    removeOldTag(tag, question);
                }
            }
        }
    }

    private static void addNewTag(Tag tag, AbstractQuestion question, User teacher) {
        Tag newTag = new Tag();
        newTag.setName(tag.getName());
        newTag.setCreator(teacher);
        newTag.getQuestions().add(question);
        newTag.save();
    }

    private static void removeOldTag(Tag tag, AbstractQuestion question) {
        tag.getQuestions().remove(question);
        tag.update();

        if(tag.getQuestions() == null || tag.getQuestions().size() == 0) {
            tag.delete();
        }
    }
}
