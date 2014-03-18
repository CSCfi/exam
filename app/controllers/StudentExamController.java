package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamSection;
import models.User;
import models.answers.AbstractAnswer;
import models.answers.MultipleChoiseAnswer;
import models.questions.AbstractQuestion;
import models.questions.MultipleChoiseOption;
import models.questions.MultipleChoiseQuestion;
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

        Exam exam = Ebean.find(Exam.class).where().eq("hash", hash).findUnique();
        
        // Create a copy from the exam when a student is starting it
        if(exam != null) {

            Exam exam_copy = (Exam)exam._ebean_createCopy();

            exam_copy.setId(null);
//            exam_copy.save();

            List<ExamSection> examSections = exam_copy.getExamSections();
            for (ExamSection es : examSections) {
                es.setId(null);
//                es.saveManyToManyAssociations("questions");

                List<AbstractQuestion> questions = es.getQuestions();
                for (AbstractQuestion q : questions) {
                    q.setId(null);
//                    q.save();

                    switch (q.getType()) {
                        case "MultipleChoiseQuestion": {
                            List<MultipleChoiseOption> options = ((MultipleChoiseQuestion) q).getOptions();
                            for (MultipleChoiseOption o : options) {
                                o.setId(null);
//                                o.save();
                            }
                        }
                        break;
                    }
                }
            }

            exam_copy.save();

            return ok(Json.toJson(exam_copy));
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

    public static Result saveAnswers() throws MalformedDataException {
        Logger.debug("saveAnswers()");

        MultipleChoiseAnswer answer = null;
        try {
            answer = bindForm(MultipleChoiseAnswer.class);
        } catch (MalformedDataException e) {
            e.printStackTrace();
        }

        MultipleChoiseOption option = answer.getOption();

        return ok(Json.toJson(answer));
    }

    public static Result saveAnswersAndExit(Long id) throws MalformedDataException {
        Logger.debug("saveAnswersAndExit()");

        MultipleChoiseAnswer answer = null;
        try {
            answer = bindForm(MultipleChoiseAnswer.class);
        } catch (MalformedDataException e) {
            e.printStackTrace();
        }

        MultipleChoiseOption option = answer.getOption();

//        DynamicForm df = Form.form().bindFromRequest();
//
//        try {
//            Class<?> clazz = Class.forName("models.answers."+df.get("type"));
//            Object answer = clazz.newInstance();
//
//            User user = UserController.getLoggedUser();
//            Timestamp currentTime = new Timestamp(System.currentTimeMillis() * 1000);
//
//            answer = bindForm(answer.getClass());
//
//            switch(df.get("type"))
//            {
//                case "MultipleChoiseQuestion":
//                {
//
//                    if( ((MultipleChoiseAnswer)answer).getCreator() == null)
//                    {
//                        ((MultipleChoiseAnswer)answer).setCreator(user);
//                        ((MultipleChoiseAnswer)answer).setCreated(currentTime);
//                    }
//                    else
//                    {
//                        ((MultipleChoiseAnswer)answer).setModifier(user);
//                        ((MultipleChoiseAnswer)answer).setModified(new Timestamp(System.currentTimeMillis() * 1000));
//                    }
//                } break;
//
//                case "EssayQuestion":
//                {
//
//
//                } break;
//
//                case "MathQuestion":
//                {
//
//
//                } break;
//                default:
//
//            }
//
//            Ebean.save(answer);
//            return ok(Json.toJson(answer));
//
//        } catch (ClassNotFoundException e) {
//            e.printStackTrace();
//        } catch (InstantiationException e) {
//            e.printStackTrace();
//        } catch (IllegalAccessException e) {
//            e.printStackTrace();
//        }

        return ok("fail");
    }
}
