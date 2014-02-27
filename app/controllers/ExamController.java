package controllers;

import java.util.List;

import models.*;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

import com.avaje.ebean.Ebean;

public class ExamController extends SitnetController {

	
	
//    @Authenticate
    public static Result getExams() {
    	
    	// TODO: tässä pitäisi tarkistaa käyttäjän oikeudet; mitä tenttejä saa näyttää    	
    	
        List<Exam> exams = Ebean.find(Exam.class).findList();
        return ok(Json.toJson(exams));
    }

    //  @Authenticate
//    @BodyParser.Of(BodyParser.Json.class)
    public static Result createExam() {
    	Logger.debug("createExam()");


//        JsonNode json = request().body().asJson();
//        String question = json.findPath("question").toString();
//
//        Logger.debug(json.toString());
//
//        if(question == null) {
//            return badRequest("Missing parameter [question]");
//        } else {
//            return ok("Hello " + question);
//        }
    	
    	DynamicForm df = Form.form().bindFromRequest();
      	Logger.debug("Exam: " +df.toString());
    	Logger.debug("name: " +df.get("name"));



//      Logger.debug("olio: "+ df.toString());
//    	Logger.debug("course Code: " +df.get("courseCode"));
//    	Logger.debug("course Name: " +df.get("courseName"));
//    	Logger.debug("course Scope: " +df.get("courseScope"));
//    	Logger.debug("Faculty Name: " +df.get("facultyName"));
//    	Logger.debug("Exam Instructor Name: " +df.get("instructorName"));
    	
        User user = UserController.getLoggedUser();
        
    	//Todo: implement the missing variables User, CourseType and Double
//    	Course course = new Course(null, df.get("facultyName"), df.get("courseCode"), df.get("courseName"), null, null);
//    	Logger.debug("Course created with following code: " +course.getCode());
    	
    	//Todo: what is the exam name? is it the same as course name? 
//    	Exam exam = new Exam(user, new Course(df.get("courseName")));
    	
//    	Logger.debug("Exam created with following name: " +exam.getName());
    	
    	return ok("");
    }
    
    //  @Authenticate
    public static Result getExamSections(Long examid) {

    	List<ExamSection> sections = Ebean.find(ExamSection.class).where()
    		      .eq("id", examid)
    		      .findList();
    	
    	return ok(Json.toJson(sections));
    }
    
//    @Authenticate
    public static Result addSection() {

    	DynamicForm df = Form.form().bindFromRequest();
		
    	Logger.debug("course Code: " +df.get("courseCode"));
    	Logger.debug("course Name: " +df.get("courseName"));
    	Logger.debug("course Scope: " +df.get("courseScope"));
    	Logger.debug("Faculty Name: " +df.get("facultyName"));
    	Logger.debug("Exam Instructor Name: " +df.get("instructorName"));
    	
        User user = UserController.getLoggedUser();

        return ok("section created");
    }

    //  @Authenticate
    public static Result getExamEvents() {

        List<ExamEvent> examEvents = Ebean.find(ExamEvent.class).findList();
        return ok(Json.toJson(examEvents));
    }

}
