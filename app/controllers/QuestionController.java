package controllers;

import Exceptions.MalformedDataException;
import Exceptions.SitnetException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import models.ExamSectionQuestion;
import models.SitnetModel;
import models.answers.AbstractAnswer;
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

public class QuestionController extends SitnetController {

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getQuestions() {

        List<AbstractQuestion> questions = Ebean.find(AbstractQuestion.class)
                .fetch("parent")
                .where()
                .eq("parent", null)
                .findList();

        if (questions == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, creator, type, question, shared, instruction, state, maxScore, " +
                    "evaluatedScore, parent, evaluationCriterias, attachment, evaluationPhrases, hash, " +
                    "expanded, maxCharacters, evaluationType, options");
            options.setPathProperties("creator", "id");
            options.setPathProperties("parent", "id");
            options.setPathProperties("attachment", "id, fileName");
            options.setPathProperties("options", "id, option, correctOption, score");
            return ok(jsonContext.toJsonString(questions, true, options)).as("application/json");
        }
//        return ok(Json.toJson(questions));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getQuestionsForUser(Long id) {

        List<AbstractQuestion> questions = null;
        List<AbstractQuestion> shared;

        if(UserController.getLoggedUser().hasRole("TEACHER"))
        {
            // TODO: should use SELECT LIMIT from to
            questions = Ebean.find(AbstractQuestion.class)
                    .where()
                    .eq("creator.id", id)
                    .eq("parent", null)
                    .orderBy("created desc")
                    .findList();

            shared = Ebean.find(AbstractQuestion.class)
                    .where()
                    .ne("creator.id", id)
                    .eq("parent", null)
                    .eq("shared", true)
                    .orderBy("created desc")
                    .findList();

            questions.addAll(shared);
        }
        else if(UserController.getLoggedUser().hasRole("ADMIN"))
        {
            // TODO: should use SELECT LIMIT from to
            questions = Ebean.find(AbstractQuestion.class)
                    .where()
                    .eq("parent", null)
                    .orderBy("created desc")
                    .findList();
        }

        if (questions == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, creator, type, question, shared, instruction, state, maxScore, " +
                    "evaluatedScore, parent, evaluationCriterias, attachment, evaluationPhrases, hash, " +
                    "expanded, maxCharacters, evaluationType, options");
            options.setPathProperties("creator", "id");
            options.setPathProperties("parent", "id");
            options.setPathProperties("attachment", "id, fileName");
            options.setPathProperties("options", "id, option, correctOption, score");
            return ok(jsonContext.toJsonString(questions, true, options)).as("application/json");
        }
//        return ok(Json.toJson(questions));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getQuestion(Long id) {

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, id);

        return ok(Json.toJson(question));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result copyQuestion(Long id) throws MalformedDataException {

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, id);
        EssayQuestion essayQuestion = null;
        MultipleChoiceQuestion multipleChoiceQuestion = null;

        switch (question.getType()) {
            case "MultipleChoiceQuestion": {

                multipleChoiceQuestion = (MultipleChoiceQuestion) question.clone();

                try {
                    multipleChoiceQuestion = (MultipleChoiceQuestion) SitnetUtil.setCreator(multipleChoiceQuestion);
                } catch (SitnetException e) {
                    e.printStackTrace();
                }

                multipleChoiceQuestion.getOptions().clear();
                multipleChoiceQuestion.setAttachment(question.getAttachment());
                multipleChoiceQuestion.save();
                List<MultipleChoiseOption> options = ((MultipleChoiceQuestion)question).getOptions();
                for (MultipleChoiseOption o : options) {
                    MultipleChoiseOption clonedOpt = (MultipleChoiseOption) o.clone();
                    clonedOpt.setQuestion(multipleChoiceQuestion);
                    clonedOpt.save();
                    multipleChoiceQuestion.getOptions().add(clonedOpt);
                }
                break;
            }
            case "EssayQuestion":

                essayQuestion = (EssayQuestion) question.clone();

                try {
                    essayQuestion = (EssayQuestion) SitnetUtil.setCreator(essayQuestion);
                } catch (SitnetException e) {
                    e.printStackTrace();
                }

                AbstractAnswer answer = question.getAnswer();
                essayQuestion.setAnswer(answer);
                essayQuestion.setAttachment(question.getAttachment());
                essayQuestion.save();

                break;
        }

        Ebean.save(question);

        switch (question.getType()) {
            case "MultipleChoiceQuestion": return ok(Json.toJson(multipleChoiceQuestion));
            case "EssayQuestion": return ok(Json.toJson(essayQuestion));
        }
        return ok(Json.toJson(question));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result addQuestion() throws MalformedDataException {

        DynamicForm df = Form.form().bindFromRequest();

        try {
            Class<?> clazz = Class.forName("models.questions." + df.get("type"));
            Object question = clazz.newInstance();

            question = bindForm(question.getClass());

            switch (df.get("type")) {
                case "MultipleChoiceQuestion": {

                    try {
                        SitnetUtil.setCreator((SitnetModel)question);
                    } catch (SitnetException e) {
                        e.printStackTrace();
                        return ok(e.getMessage());
                    }
                    ((MultipleChoiceQuestion) question).generateHash();

                } break;

                case "EssayQuestion": {

                    try {
                        SitnetUtil.setCreator((SitnetModel)question);
                    } catch (SitnetException e) {
                        e.printStackTrace();
                        return ok(e.getMessage());
                    }
                    ((EssayQuestion) question).generateHash();

                } break;

                case "MathQuestion": {


                } break;

                default:

            }

            ((AbstractQuestion)question).setState("NEW");
            Ebean.save(question);
            return ok(Json.toJson(question));

        } catch (ClassNotFoundException | InstantiationException | IllegalAccessException e) {
            e.printStackTrace();
        }

        return ok("fail");
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

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, id);

        List<AbstractQuestion> children = Ebean.find(AbstractQuestion.class)
                .where()
                .eq("parent.id", id)
                .findList();

        for(AbstractQuestion a : children) {
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
    public static Result createOption() throws MalformedDataException {

        MultipleChoiseOption option = new MultipleChoiseOption();
//        option.setOption("Esimerkki vaihtoehto");
        option.setCorrectOption(false);
        option.save();

        return ok(Json.toJson(option));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getOption(Long id) throws MalformedDataException {

        MultipleChoiseOption option = Ebean.find(MultipleChoiseOption.class, id);
        return ok(Json.toJson(option));
    }

}
