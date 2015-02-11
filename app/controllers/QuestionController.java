package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import exceptions.MalformedDataException;
import exceptions.SitnetException;
import models.Exam;
import models.ExamSectionQuestion;
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

import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

public class QuestionController extends SitnetController {

    private static JsonWriteOptions getOptions() {
        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, creator, type, question, shared, instruction, state, maxScore, " +
                "evaluatedScore, parent, evaluationCriterias, attachment, " +
                "expanded, maxCharacters, evaluationType, options");
        options.setPathProperties("creator", "id");
        options.setPathProperties("parent", "id");
        options.setPathProperties("attachment", "id, fileName");
        options.setPathProperties("options", "id, option, correctOption, score");

        return options;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getQuestions(List<String> examNames, List<String> courseCodes) {
        User user = UserController.getLoggedUser();
        ExpressionList<AbstractQuestion> query = Ebean.find(AbstractQuestion.class)
                .fetch("children")
                .fetch("children.examSectionQuestion")
                .fetch("children.examSectionQuestion.examSection")
                .fetch("children.examSectionQuestion.examSection.exam")
                .fetch("children.examSectionQuestion.examSection.exam.course")
                .where()
                .isNull("parent");
        if (user.hasRole("TEACHER")) {
            query = query.disjunction()
                    .eq("creator.id", user.getId())
                    .eq("shared", true)
                    .endJunction();
        }
        List<AbstractQuestion> questions = query.orderBy("created desc").findList();
        if (!examNames.isEmpty() || !courseCodes.isEmpty()) {
            Iterator<AbstractQuestion> it = questions.listIterator();
            while (it.hasNext()) {
                AbstractQuestion parent = it.next();
                Set<String> exams = new HashSet<>();
                Set<String> courses = new HashSet<>();
                for (AbstractQuestion child : parent.getChildren()) {
                    ExamSectionQuestion esq = child.getExamSectionQuestion();
                    if (esq == null) {
                        // should not happen
                        continue;
                    }
                    Exam exam = esq.getExamSection().getExam();
                    exams.add(exam.getName());
                    if (exam.getCourse() != null) {
                        courses.add(exam.getCourse().getCode());
                    }
                }
                if (!exams.containsAll(examNames) || !courses.containsAll(courseCodes)) {
                    it.remove();
                }
            }
        }
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
        question.setState("NEW");
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
        question.setState("SAVED");
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
    public static Result updateOption(Long oid) throws MalformedDataException {

        MultipleChoiseOption option = bindForm(MultipleChoiseOption.class);
        option.update();

        return ok(Json.toJson(option));

    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result deleteQuestion(Long id) {

        List<AbstractQuestion> children = Ebean.find(AbstractQuestion.class)
                .where()
                .eq("parent.id", id)
                .findList();

        for (AbstractQuestion a : children) {
            a.setParent(null);
            a.save();
        }

        List<MultipleChoiseOption> options = Ebean.find(MultipleChoiseOption.class)
                .where()
                .eq("question.id", id)
                .findList();

        for (MultipleChoiseOption o : options) {
            o.setQuestion(null);
            o.delete();
        }

        List<ExamSectionQuestion> sectionQuestions = Ebean.find(ExamSectionQuestion.class).where().eq("question.id",
                id).findList();
        for (ExamSectionQuestion esq : sectionQuestions) {
            esq.delete();
        }

        Ebean.delete(AbstractQuestion.class, id);

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

}
