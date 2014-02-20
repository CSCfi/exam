package controllers;

import java.util.List;

import models.Course;
import models.Exam;
import models.ExamSection;
import models.User;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
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

    //  @Authenticate
    public static Result createExam() {
    	Logger.debug("createExam() called!");
    	
    	DynamicForm df = Form.form().bindFromRequest();
    			
    	Logger.debug("course Code: " +df.get("courseCode"));
    	Logger.debug("course Name: " +df.get("courseName"));
    	Logger.debug("course Scope: " +df.get("courseScope"));
    	Logger.debug("Faculty Name: " +df.get("facultyName"));
    	Logger.debug("Exam Instructor Name: " +df.get("instructorName"));
    	
        User user = UserController.getLoggedUser();
        
    	//Todo: implement the missing variables User, CourseType and Double
//    	Course course = new Course(null, df.get("facultyName"), df.get("courseCode"), df.get("courseName"), null, null);
//    	
//    	Logger.debug("Course created with following code: " +course.getCode());
    	
    	//Todo: what is the exam name? is it the same as course name? 
    	Exam exam = new Exam(user, new Course(df.get("courseName")));
    	
    	Logger.debug("Exam created with following name: " +exam.getName());
    	
    	return ok("Successfully created the exam!");
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
}
