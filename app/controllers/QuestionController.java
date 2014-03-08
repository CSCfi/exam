package controllers;

import java.util.List;

import models.Question;
import models.questions.AbstractQuestion;
import play.Logger;
import play.libs.Json;
import play.mvc.BodyParser;
import play.mvc.Result;
import Exceptions.MalformedDataException;

import com.avaje.ebean.Ebean;

public class QuestionController extends SitnetController {

	
//  @Authenticate
  public static Result getQuestions() {
  	
      List<AbstractQuestion> questions = Ebean.find(AbstractQuestion.class).findList();
//      List<MultipleChoiseQuestion> questions = Ebean.find(MultipleChoiseQuestion.class).findList();

      if(questions != null)
          Logger.debug(questions.toString());

      return ok(Json.toJson(questions));
  }

//  @Authenticate
//  @BodyParser.Of(BodyParser.Json.class)
  public static Result addQuestion() {

	  AbstractQuestion question = null;
      try {
          question = bindForm(AbstractQuestion.class);
      } catch (MalformedDataException e) {
          e.printStackTrace();
      }

      Logger.debug(question.toString());

      Ebean.save(question);
      return ok(Json.toJson(question.getId()));
  }

    @BodyParser.Of(BodyParser.Json.class)
    public static Result deleteQuestion(Long id) {

    Ebean.delete(AbstractQuestion.class, id);

    return ok("Question deleted from database!");
    }
}
