package controllers;

import Exceptions.MalformedDataException;
import Exceptions.UnauthorizedAccessException;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamEvent;
import models.ExamSection;
import models.User;
import play.Logger;
import play.api.libs.json.JsPath;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

import java.util.Date;
import java.util.List;

public class ExamController extends SitnetController {

	
	
//    @Authenticate
    public static Result getExams() {
    	
    	// TODO: tässä pitäisi tarkistaa käyttäjän oikeudet; mitä tenttejä saa näyttää    	
    	
        List<Exam> exams = Ebean.find(Exam.class).findList();
        return ok(Json.toJson(exams));
    }

    //  @Authenticate
//    @BodyParser.Of(BodyParser.Json.class)
    public static Result createExam() throws MalformedDataException, UnauthorizedAccessException {
    	Logger.debug("createExam()");

        Exam ex = bindForm(Exam.class);

        Logger.debug(ex.toString());

//
//        JsonNode json = request().body().asJson();
//
//        if(json != null)
//        {
//            Exam exam = new Exam();
//            Date date = new Date();
//            User user = UserController.getLoggedUser();
//
//
//            exam.setCreated(new Timestamp(date.getTime()));
//            exam.setCreator(user);
//            exam.setModified(new Timestamp(date.getTime()));
//            exam.setModifier(user);
//            exam.setName(json.findPath("name").asText());
//            exam.setExamType(new ExamType(json.findPath("examType").asText()));
//            exam.setInstruction(json.findPath("instruction").asText());
//            exam.setShared(json.findPath("shared").asBoolean());
//
//            // TODO: tässä voi olla jotain häikkää frontedin puolella, jos Opintojaksoa ei ole syötetty
//            JsonNode jsonCourse = json.findPath("course");
//            if(jsonCourse != null)
//            {
//                Course course = new Course();
//
//                course.setId(jsonCourse.findPath("id").asLong());
//                course.setOrganisation(null);
//                course.setName(jsonCourse.findPath("name").asText());
//                course.setResponsibleTeacher(null);
//                course.setType(null);
//                course.setCredits(jsonCourse.findPath("credits").asDouble());
//
//                course.save();
//                /*
//                "course": {
//                    "id": 2,
//                    "organisation": null,
//                    "code": "811380A",
//                    "name": "Tietokantojen perusteet",
//                    "responsibleTeacher": null,
//                    "type": null,
//                    "credits": 7
//                },
//                 */
//                exam.setCourse(course);
//            }
//
//
//            // sections
//            JsonNode jsonSections = json.findPath("examSections");
//            if(jsonSections != null)
//            {
//                ExamSection examSection = new ExamSection();
//
//                exam.setExamSections(null);
//            }
//
//            Logger.debug(exam.toString());
//            exam.save();
//            return ok("Tentti tallennettu");
//
//        }
//        else
//            return status(-1, "Joku meni pieleen");


        return ok();
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
