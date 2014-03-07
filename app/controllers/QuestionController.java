package controllers;

import com.avaje.ebean.Ebean;
import models.questions.MultipleChoiseQuestion;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;

public class QuestionController extends SitnetController {

	
//  @Authenticate
  public static Result getQuestions() {
  	
//      List<AbstractQuestion> questions = Ebean.find(AbstractQuestion.class).findList();
      List<MultipleChoiseQuestion> questions = Ebean.find(MultipleChoiseQuestion.class).findList();

      if(questions != null)
          Logger.debug(questions.toString());

      return ok(Json.toJson(questions));
  }

////  @Authenticate
//  @BodyParser.Of(BodyParser.Json.class)
//  public static Result addQuestion() {
//
//      Question question = null;
//      try {
//          question = bindForm(Question.class);
//      } catch (MalformedDataException e) {
//          e.printStackTrace();
//      }
//
//      Logger.debug(question.toString());
//
//      Ebean.save(question);
//      return ok(Json.toJson(question.getId()));
//  }
//
//    @BodyParser.Of(BodyParser.Json.class)
//    public static Result deleteQuestion(Long id) {
//
//    Ebean.delete(Question.class, id);
//
//    return ok("Question deleted from database!");
//    }
}
