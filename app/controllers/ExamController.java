package controllers;

import java.util.List;

import models.Exam;
import play.libs.Json;
import play.mvc.Result;
import actions.Authenticate;

import com.avaje.ebean.Ebean;

public class ExamController extends SitnetController {

	
	
//    @Authenticate
    public static Result getExams() {
    	
    	// TODO: tässä pitäisi tarkistaa käyttäjän oikeudet; mitä tenttejä saa näyttää    	
    	
        List<Exam> exams = Ebean.find(Exam.class).findList();
        return ok(Json.toJson(exams));
    }
    
    
}
