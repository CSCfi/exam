package controllers;

import java.util.List;

import models.MultipleChoiseQuestion;
import play.libs.Json;
import play.mvc.Result;

import com.avaje.ebean.Ebean;

public class QuestionController extends SitnetController {

	
//  @Authenticate
  public static Result getMultipleChoiceQuestions() {
  	
      List<MultipleChoiseQuestion> questions = Ebean.find(MultipleChoiseQuestion.class).findList();
      return ok(Json.toJson(questions));
  }
}
