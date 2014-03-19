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

    public static String clonedHash = null;

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

        // Create a copy from the exam when a student is starting it
        if(!hash.equals("undefined")) {
            // If hash hasn't been cloned, then clone the exam
            if(clonedHash == null) {
                Exam exam = Ebean.find(Exam.class)
                        .fetch("examSections")
                        .where()
                        .eq("hash", hash).findUnique();

                Exam newExam = new Exam();
                newExam = newExam.clone(exam);
                newExam.save();

                clonedHash = newExam.getHash();

                return ok(Json.toJson(newExam));
            } else {
                // This is to avoid duplicate cloning of exams
                if(!clonedHash.equals(hash)) {
                    Exam exam = Ebean.find(Exam.class)
                            .fetch("examSections")
                            .where()
                            .eq("hash", hash).findUnique();

                    Exam newExam = new Exam();
                    newExam = newExam.clone(exam);
                    newExam.save();

                    clonedHash = newExam.getHash();

                    return ok(Json.toJson(newExam));
                } else {
                    Exam clonedExam = Ebean.find(Exam.class)
                            .fetch("examSections")
                            .where()
                            .eq("hash", clonedHash).findUnique();
                    return ok(Json.toJson(clonedExam));
                }
            }
        } else {
            return notFound("Exam hash was undefined, something went horribly wrong.");
        }
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
