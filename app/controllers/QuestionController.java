package controllers;

import java.util.List;

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

	  JsonNode json = request().body().asJson();
	  String question = json.findPath("question").toString();

	  Logger.debug(json.toString());
	  
	  if(question == null) {
	    return badRequest("Missing parameter [question]");
	  } else {
	    return ok("Hello " + question);
	  }
	  
  }
}
