package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.*;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

import java.sql.Timestamp;
import java.util.List;

public class ExamController extends SitnetController {


    //    @Authenticate
//    @Restrict(@Group({"TEACHER"}))
    public static Result getExams() {

        List<Exam> exams = Ebean.find(Exam.class).findList();
        return ok(Json.toJson(exams));
    }

    //  @Authenticate
    @Restrict(@Group({"TEACHER"}))
    public static Result createExam() throws MalformedDataException {
        Logger.debug("createExam()");

        Exam ex = bindForm(Exam.class);
        ex.setId(null);

        List<ExamSection> examSections = ex.getExamSections();
        for (ExamSection es : examSections) {
            es.setId(null);
            es.save();

            List<Question> questions = es.getQuestions();
            for (Question q : questions) {
                q.setId(null);
                q.save();

                Question.QuestionType type = q.getType();
                switch (type) {
                    case MULTIPLE_CHOICE_ONE_CORRECT: {
                        List<MultipleChoiseOption> options = q.getOptions();
                        for (MultipleChoiseOption o : options) {
                            o.setId(null);
                        }
                    } break;

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

    //  @Authenticate
    public static Result getExamSections(Long examid) {

        List<ExamSection> sections = Ebean.find(ExamSection.class).where()
                .eq("id", examid)
                .findList();

        return ok(Json.toJson(sections));
    }

    //    @Authenticate
    @Restrict(@Group({"TEACHER"}))
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

    public static Result listActiveExams() {

        // TODO: bug on this line
//        User user = UserController.getLoggedUser();

        Timestamp now = new Timestamp(DateTime.now().getMillis());

        List<ExamEvent> examEvents = Ebean.find(ExamEvent.class)
                .where()
                .lt("examActiveEndDate", now)
                .findList();



//        List<Exam> exams = Ebean.find(Exam.class).where()
//                .lt("examEvent.examReadableEndDate", now)
//                .findList();

//        Logger.debug(exams);

        return ok(Json.toJson(examEvents));
    }



}
