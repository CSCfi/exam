package controllers;

import Exceptions.MalformedDataException;
import Exceptions.SitnetException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.SitnetModel;
import models.User;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import models.questions.MultipleChoiceQuestion;
import models.questions.MultipleChoiseOption;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

import java.sql.Timestamp;
import java.util.List;

public class QuestionController extends SitnetController {


    //  @Authenticate
    public static Result getQuestions() {

        List<AbstractQuestion> questions = Ebean.find(AbstractQuestion.class)
                .where()
                .eq("parent", null)
                .findList();

        if (questions != null)
            Logger.debug(questions.toString());

        return ok(Json.toJson(questions));
    }

    //  @Authenticate
    public static Result getQuestion(Long id) {

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, id);

        return ok(Json.toJson(question));
    }

    @Restrict(@Group({"TEACHER"}))
    public static Result addQuestion() throws MalformedDataException {

        DynamicForm df = Form.form().bindFromRequest();

        try {
            Class<?> clazz = Class.forName("models.questions." + df.get("type"));
            Object question = clazz.newInstance();

            User user = UserController.getLoggedUser();
            Timestamp currentTime = new Timestamp(System.currentTimeMillis());

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

            Ebean.save(question);
            return ok(Json.toJson(question));

        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        } catch (InstantiationException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        }

        return ok("fail");
    }

   @Restrict(@Group({"TEACHER"}))
    public static Result updateQuestion(Long id) throws MalformedDataException {

       DynamicForm df = Form.form().bindFromRequest();


       switch (df.get("type")) {
           case "MultipleChoiceQuestion": {
               MultipleChoiceQuestion question = bindForm(MultipleChoiceQuestion.class);
               question.update();
               return ok(Json.toJson(question));
           }

           case "EssayQuestion": {
               EssayQuestion question = bindForm(EssayQuestion.class);
               question.update();
               return ok(Json.toJson(question));
           }

           default:
       }
       return ok("fail");
    }

    @Restrict(@Group({"TEACHER"}))
    public static Result updateOption(Long oid) throws MalformedDataException {

        MultipleChoiseOption option = bindForm(MultipleChoiseOption.class);
        option.update();

        return ok(Json.toJson(option));

    }

    @Restrict(@Group({"TEACHER"}))
    public static Result deleteQuestion(Long id) {

        Ebean.delete(AbstractQuestion.class, id);

        return ok("Question deleted from database!");
    }


    @Restrict(@Group({"TEACHER"}))
    public static Result deleteOption(Long oid) {

        Ebean.delete(MultipleChoiseOption.class, oid);

        return ok("Option deleted from database!");
    }

    @Restrict(@Group({"TEACHER"}))
    public static Result addOption(Long qid) throws MalformedDataException {

        MultipleChoiceQuestion question = Ebean.find(MultipleChoiceQuestion.class, qid);
        MultipleChoiseOption option = bindForm(MultipleChoiseOption.class);
        question.getOptions().add(option);
        question.save();
        option.save();

        return ok(Json.toJson(option));
    }


    public static Result createOption() throws MalformedDataException {

        MultipleChoiseOption option = new MultipleChoiseOption();
        option.setOption("Esimerkki vaihtoehto");
        option.setCorrectOption(false);
        option.save();

        return ok(Json.toJson(option));
    }

    public static Result getOption(Long id) throws MalformedDataException {

        MultipleChoiseOption option = Ebean.find(MultipleChoiseOption.class, id);
        return ok(Json.toJson(option));
    }

}
