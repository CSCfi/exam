package controllers;

import java.util.List;

import Exceptions.MalformedDataException;
import models.Question;
import play.Logger;
import play.libs.Json;
import play.mvc.BodyParser;
import play.mvc.Result;

import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;

public class QuestionController extends SitnetController {

	
//  @Authenticate
  public static Result getQuestions() {
  	
      List<Question> questions = Ebean.find(Question.class).findList();
      return ok(Json.toJson(questions));
  }

//  @Authenticate
  @BodyParser.Of(BodyParser.Json.class)
  public static Result addQuestion() {

      Question question = null;
      try {
          question = bindForm(Question.class);
      } catch (MalformedDataException e) {
          e.printStackTrace();
      }

      Logger.debug(question.toString());

      Ebean.save(question);
      return ok(Json.toJson(question.getId()));
  }

    @BodyParser.Of(BodyParser.Json.class)
    public static Result deleteQuestion(Long id) {

    Ebean.delete(Question.class, id);

    return ok("Question deleted from database!");
    }
}
