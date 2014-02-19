package controllers;

import java.util.List;

import models.Question;
import play.libs.Json;
import play.mvc.Result;

import com.avaje.ebean.Ebean;

public class QuestionController extends SitnetController {

	
//  @Authenticate
  public static Result getQuestions() {
  	
      List<Question> questions = Ebean.find(Question.class).findList();
      return ok(Json.toJson(questions));
  }
}
