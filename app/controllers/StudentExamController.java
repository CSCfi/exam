package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.User;
import models.answers.AbstractAnswer;
import models.answers.MultipleChoiseAnswer;
import models.questions.AbstractQuestion;
import org.joda.time.DateTime;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Controller;
import play.mvc.Result;

import java.sql.Timestamp;
import java.util.List;

/**
 * Created by avainik on 3/3/14.
 */
public class StudentExamController extends SitnetController {

    @Restrict(@Group({"STUDENT"}))
    public static Result listActiveExams() {

        // TODO: bug on this line
        User user = UserController.getLoggedUser();
        Timestamp now = new Timestamp(DateTime.now().getMillis());

        List<Exam> exams = Ebean.find(Exam.class)
                .where()
                .lt("examEvent.examActiveEndDate", now)
                .eq("examEvent.enrolledStudents.id", user.getId())
                .findList();
  
        return ok(Json.toJson(exams));
    }


    public static Result getExamByHash(String hash) {

        List<Exam> exams = Ebean.find(Exam.class).where().eq("hash", hash).findList();
        
        // TODO: there must be a better way to check this 
        if(exams.size() > 0) {
        	
            return ok(Json.toJson(exams.get(0)));
        }
        else
        	return notFound("Exam not found, something went horribly wrong.");        
    }

    public static Result saveAndExit() {


//        DynamicForm df = Form.form().bindFromRequest();

        MultipleChoiseAnswer answer = null;
        try {
            answer = bindForm(MultipleChoiseAnswer.class);
        } catch (MalformedDataException e) {
            e.printStackTrace();
        }

        Logger.debug(answer.toString());

        return ok("Tentti tallennettiin");
    }
}
