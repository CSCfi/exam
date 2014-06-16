package controllers;

import Exceptions.MalformedDataException;
import Exceptions.SitnetException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.ExamSection;
import models.SitnetModel;
import models.User;
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

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;




public class QuestionController extends SitnetController {


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getQuestions() {

        List<AbstractQuestion> questions = Ebean.find(AbstractQuestion.class)
                .fetch("parent")
                .where()
                .eq("parent", null)
                .findList();

        return ok(Json.toJson(questions));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getQuestionsForUser(Long id) {

        List<AbstractQuestion> questions = null;

        if(UserController.getLoggedUser().hasRole("TEACHER"))
        {
            // TODO: should use SELECT LIMIT from to
            questions = Ebean.find(AbstractQuestion.class)
                    .where()
                    .eq("creator.id", id)
                    .eq("parent", null)
                    .orderBy("created desc")
                    .findList();
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

        return ok(Json.toJson(questions));
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

                multipleChoiceQuestion.setOptions(new ArrayList<MultipleChoiseOption>());
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

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
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


        List<ExamSection> examSections = Ebean.find(ExamSection.class)
                .where()
                .eq("questions.id", id)
                .findList();

        for (ExamSection section : examSections) {
            section.getQuestions().remove(question);
            section.save();
        }

//        String sql = " delete from exam_section_question "
//                + " where question_id = :id1 ";
//
//        SqlQuery sqlQuery = Ebean.createSqlQuery(sql);
//        sqlQuery.setParameter("id1", id);
//        List<SqlRow> list = sqlQuery.findList();
//
//        Logger.debug("SQL lause vaikutti näin moineen riviin: "+ list);
//
        Ebean.delete(AbstractQuestion.class, id);

//        question.delete();

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

  

    public static enum EssayEvaluationType {
        POINTS, SELECT;
    }

}
