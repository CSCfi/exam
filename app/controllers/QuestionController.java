package controllers;

import Exceptions.MalformedDataException;
import com.avaje.ebean.Ebean;
import models.User;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import models.questions.MultipleChoiceQuestion;
import models.questions.MultipleChoiseOption;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.BodyParser;
import play.mvc.Result;

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

    //  @Authenticate
//  @BodyParser.Of(BodyParser.Json.class)
    public static Result addQuestion() throws MalformedDataException {

        DynamicForm df = Form.form().bindFromRequest();
        Logger.debug("Add question");

        try {
            Class<?> clazz = Class.forName("models.questions." + df.get("type"));
            Object question = clazz.newInstance();

            User user = UserController.getLoggedUser();
            Timestamp currentTime = new Timestamp(System.currentTimeMillis());

            question = bindForm(question.getClass());

            switch (df.get("type")) {
                case "MultipleChoiceQuestion": {

                    if (((MultipleChoiceQuestion) question).getCreator() == null) {
                        ((MultipleChoiceQuestion) question).setCreator(user);
                        ((MultipleChoiceQuestion) question).setCreated(currentTime);
                    } else {
                        ((MultipleChoiceQuestion) question).setModifier(user);
                        ((MultipleChoiceQuestion) question).setModified(currentTime);
                    }

                    ((MultipleChoiceQuestion) question).generateHash();

                }
                break;

                case "EssayQuestion": {
                    if (((EssayQuestion) question).getCreator() == null) {
                        ((EssayQuestion) question).setCreator(user);
                        ((EssayQuestion) question).setCreated(currentTime);
                    } else {
                        ((EssayQuestion) question).setModifier(user);
                        ((EssayQuestion) question).setModified(currentTime);
                    }

                    ((EssayQuestion) question).generateHash();

                }
                break;

                case "MathQuestion": {


                }
                break;
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

    @BodyParser.Of(BodyParser.Json.class)
    public static Result deleteQuestion(Long id) {

        Ebean.delete(AbstractQuestion.class, id);

        return ok("Question deleted from database!");
    }


    public static Result addOption(Long qid, Long oid) throws MalformedDataException {

        MultipleChoiceQuestion question = Ebean.find(MultipleChoiceQuestion.class, qid);
        MultipleChoiseOption option = bindForm(MultipleChoiseOption.class);
        option.save();
        question.getOptions().add(option);
        question.save();

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

    public static Result createQuestionDraft() {

//        if (form().bindFromRequest().get("video_id") != null) {
//            try {
//                video_id = Integer.parseInt(form().bindFromRequest().get("video_id"));
//            } catch (Exception e) {
//                Logger.error("int not parsed...");
//            }
//        }

//        AbstractQuestion question = new AbstractQuestion();
//        try {
//            SitnetUtil.setCreator(question);
//        } catch (SitnetException e) {
//            e.printStackTrace();
//            return ok(e.getMessage());
//        }
//        question.setQuestion("Kirjoita kysymys tähän");
//
//        question.save();
//
//        return ok(Json.toJson(question));
        return ok();
    }

}
