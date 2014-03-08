package controllers;

import java.sql.Timestamp;
import java.util.List;

import models.Exam;
import models.User;

import org.joda.time.DateTime;

import play.libs.Json;
import play.mvc.Controller;
import play.mvc.Result;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;

import com.avaje.ebean.Ebean;

/**
 * Created by avainik on 3/3/14.
 */
public class StudentExamController extends Controller {

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
}
