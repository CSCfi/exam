package controllers;

import Exceptions.MalformedDataException;
import com.avaje.ebean.Ebean;
import models.User;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import models.questions.MultipleChoiseQuestion;
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

      if(questions != null)
          Logger.debug(questions.toString());

      return ok(Json.toJson(questions));
  }

//  @Authenticate
//  @BodyParser.Of(BodyParser.Json.class)
  public static Result addQuestion() throws MalformedDataException {

      DynamicForm df = Form.form().bindFromRequest();
      Logger.debug("Add question");

      try {
          Class<?> clazz = Class.forName("models.questions."+df.get("type"));
          Object question = clazz.newInstance();

          User user = UserController.getLoggedUser();
          Timestamp currentTime = new Timestamp(System.currentTimeMillis() * 1000);

          question = bindForm(question.getClass());

          switch(df.get("type"))
          {
              case "MultipleChoiseQuestion":
              {

                  if( ((MultipleChoiseQuestion)question).getCreator() == null)
                  {
                      ((MultipleChoiseQuestion)question).setCreator(user);
                      ((MultipleChoiseQuestion)question).setCreated(currentTime);
                  }
                  else
                  {
                      ((MultipleChoiseQuestion)question).setModifier(user);
                      ((MultipleChoiseQuestion)question).setModified(currentTime);
                  }

                  ((MultipleChoiseQuestion) question).generateHash();

              } break;

              case "EssayQuestion":
              {
                  if( ((EssayQuestion)question).getCreator() == null)
                  {
                      ((EssayQuestion)question).setCreator(user);
                      ((EssayQuestion)question).setCreated(currentTime);
                  }
                  else
                  {
                      ((EssayQuestion)question).setModifier(user);
                      ((EssayQuestion)question).setModified(currentTime);
                  }

                  ((EssayQuestion) question).generateHash();

              } break;

              case "MathQuestion":
              {


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

    @BodyParser.Of(BodyParser.Json.class)
    public static Result deleteQuestion(Long id) {

    Ebean.delete(AbstractQuestion.class, id);

    return ok("Question deleted from database!");
    }
}
