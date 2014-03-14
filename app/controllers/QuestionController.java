package controllers;

import Exceptions.MalformedDataException;
import com.avaje.ebean.Ebean;
import models.questions.AbstractQuestion;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.BodyParser;
import play.mvc.Result;

import java.util.List;

public class QuestionController extends SitnetController {

	
//  @Authenticate
  public static Result getQuestions() {
  	
      List<AbstractQuestion> questions = Ebean.find(AbstractQuestion.class).findList();

//      Model.Finder<Long, AbstractQuestion> find = new Model.Finder<Long, AbstractQuestion>(Long.class, AbstractQuestion.class);
//      List<AbstractQuestion> questions = find.all();

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

          question = bindForm(question.getClass());

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
