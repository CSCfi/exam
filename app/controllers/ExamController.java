package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Query;
import models.Exam;
import models.ExamEvent;
import models.ExamSection;
import models.User;
import models.questions.AbstractQuestion;
import models.questions.MultipleChoiceQuestion;
import models.questions.MultipleChoiseOption;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

import java.sql.Timestamp;
import java.util.List;

public class ExamController extends SitnetController {


	//    @Authenticate
	//    @Restrict(@Group({"TEACHER"}))
    public static Result getExams() {
        Logger.debug("getExams()");

        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("examSections")
                .where()
                .eq("state", "PUBLISHED")
        		.findList();
        
        return ok(Json.toJson(exams));
    }

    public static Result getExam(Long id) {
    	Logger.debug("getExam(:id)");

        Query<Exam> query = Ebean.createQuery(Exam.class);
        query.fetch("examEvent");
        query.fetch("course");
        query.setId(id);

        Exam exam = query.findUnique();
   	
    	return ok(Json.toJson(exam));
    }

    public static Result updateExam(Long id) throws MalformedDataException {
    	Logger.debug("updateExam(:id)");
    	Exam ex = Form.form(Exam.class).bindFromRequest(
    	"id",
    	"examEvent",
    	"instruction",
    	"name",
    	"shared",
    	"state").get();

        Logger.debug("Exam: "+ ex.toString());
    	ex.update();

    	return ok(Json.toJson(ex));
    }
    
    public static Result createExamDraft() throws MalformedDataException {
        Logger.debug("createExamDraft()");

        Exam ex = bindForm(Exam.class);
        ex.setId(null);

        ex.save();

        return ok(Json.toJson(ex));
    }

    public static Result insertSection(Long id) throws MalformedDataException {
        Logger.debug("insertSection()");


        ExamSection section = bindForm(ExamSection.class);
        section.setExam(Ebean.find(Exam.class, id));

        section = (ExamSection) SitnetUtil.setCreator(section);

        section.save();

        return ok(Json.toJson(section));
    }

    public static Result insertQuestion(Long eid, Long sid) throws MalformedDataException {
        Logger.debug("insertQuestion()");


        return ok();
    }


    //  @Authenticate
//    @Restrict(@Group({"TEACHER"}))
    public static Result createExam() throws MalformedDataException {
        Logger.debug("createExam()");

        User user = UserController.getLoggedUser();
        Timestamp currentTime = new Timestamp(System.currentTimeMillis());

        Exam ex = bindForm(Exam.class);
//        ex.setId(null);

        switch (ex.getState()) {
            case "DRAFT":
            {
                ex.setId(null);

                if(ex.getCreator() == null) {
                    ex.setCreator(user);
                    ex.setCreated(currentTime);
                } else {
                    ex.setModifier(user);
                    ex.setModified(currentTime);
                }

                ex.save();

                return ok(Json.toJson(ex));
            }

            case "PUBLISHED": {

                List<ExamSection> examSections = ex.getExamSections();
                for (ExamSection es : examSections) {
                    es.setId(null);
//            es.save();

                    List<AbstractQuestion> questions = es.getQuestions();
                    for (AbstractQuestion q : questions) {
                        q.setId(null);
//                q.save();

                        switch (q.getType()) {
                            case "MultipleChoiceQuestion": {
                                List<MultipleChoiseOption> options = ((MultipleChoiceQuestion) q).getOptions();
                                for (MultipleChoiseOption o : options) {
                                    o.setId(null);
                                }
                            }
                            break;

                        }
                    }
                }

                ExamEvent event = ex.getExamEvent();
                Logger.debug(event.toString());

                DateTime dtStart = DateTimeFormat.forPattern("dd-MM-yyyy").parseDateTime(event.getExamReadableStartDate());
                event.setExamActiveStartDate(new Timestamp(dtStart.getMillis()));

                DateTime dtEnd = DateTimeFormat.forPattern("dd-MM-yyyy").parseDateTime(event.getExamReadableEndDate());
                event.setExamActiveEndDate(new Timestamp(dtEnd.getMillis()));

                Logger.debug(ex.toString());
                ex.save();

                return ok();
            }

            default:

        }



/**
 *
 * play.api.Application$$anon$1: Execution exception[[PersistenceException: ERROR executing DML bindLog[] error[NULL not allowed for column
 * "QUESTION_TYPE"; SQL statement:\n insert into question
 * (id, question_type, created, modified, type, question, shared, instruction, hash, creator_id, modifier_id, derived_from_question_id)
 * values (?,?,?,?,?,?,?,?,?,?,?,?) [23502-172]]]]

 Ebean fails to insert Discriminator
 This is a bug

 Discussion:
 *  http://eclipse.1072660.n5.nabble.com/Value-of-DiscriminatorValue-not-persisted-td162195.html
 *
 *  Bug:
 *  https://bugs.eclipse.org/bugs/show_bug.cgi?id=415526
 *
 *  Possible solution:
 *  Update Ebean to v.2.5.1
 *
 *
 *
 */


        return badRequest("Jokin meni pieleen");
    }

    //  @Authenticate
    public static Result getExamSections(Long examid) {
        List<ExamSection> sections = Ebean.find(ExamSection.class).where()
                .eq("id", examid)
                .findList();

        return ok(Json.toJson(sections));
    }

 //  @Authenticate
    public static Result deleteSection(Long sectionId) {
        Ebean.delete(ExamSection.class, sectionId);

        return ok();
    }

    //    @Authenticate
//    @Restrict(@Group({"TEACHER"}))
    public static Result addSection() {

        DynamicForm df = Form.form().bindFromRequest();

        Logger.debug("course Code: " + df.get("courseCode"));
        Logger.debug("course Name: " + df.get("courseName"));
        Logger.debug("course Scope: " + df.get("courseScope"));
        Logger.debug("Faculty Name: " + df.get("facultyName"));
        Logger.debug("Exam Instructor Name: " + df.get("instructorName"));

        User user = UserController.getLoggedUser();

        return ok("section created");
    }

    //  @Authenticate
    public static Result getExamEvents() {

        List<ExamEvent> examEvents = Ebean.find(ExamEvent.class).findList();
        return ok(Json.toJson(examEvents));
    }

    @Restrict(@Group({"TEACHER"}))
    public static Result insertEvent() throws MalformedDataException {

        ExamEvent examEvent = bindForm(ExamEvent.class);
        return ok(Json.toJson(examEvent));
    }

//    @Restrict(@Group({"TEACHER"}))
    public static Result insertEventWithExam(Long examId) throws MalformedDataException {

        ExamEvent examEvent = bindForm(ExamEvent.class);

        Exam exam = Ebean.find(Exam.class, examId);
        exam.setExamEvent(examEvent);
//        examEvent.setBlueprint(exam);
//        examEvent.getExams().add(exam);

        examEvent.save();
        exam.save();

        return ok(Json.toJson(examEvent));
    }

}
