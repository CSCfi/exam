package controllers;

import Exceptions.MalformedDataException;
import com.avaje.ebean.Ebean;
import models.Exam;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

/**
 * Created by avainik on 3/6/14.
 */
public class TestController extends SitnetController {


    //  @Authenticate
//    @BodyParser.Of(BodyParser.Json.class)
    public static Result addQuestion() throws MalformedDataException {

        DynamicForm df = Form.form().bindFromRequest();

        Logger.debug("q id: " + df.get("id"));
        Logger.debug("q name: " + df.get("name"));
        Logger.debug("q type: " + df.get("type"));


        try {
            Class<?> ass = Class.forName("models.questions."+df.get("type"));
            Object question = ass.newInstance();

            question = bindForm(question.getClass());
            Exam ex = bindForm(Exam.class);

            Ebean.save(question);
            return ok(Json.toJson(question.toString()));

        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        } catch (InstantiationException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        }

        return ok("fail");
    }

}
