package controllers;

import Exceptions.MalformedDataException;
import Exceptions.UnauthorizedAccessException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.User;
import models.answers.MultipleChoiseAnswer;
import models.questions.AbstractQuestion;
import models.questions.MultipleChoiseOption;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;

import java.sql.Timestamp;
import java.util.Date;
import java.util.List;

/**
 * Created by avainik on 3/3/14.
 */
public class StudentExamController extends SitnetController {

    @Restrict(@Group({"STUDENT"}))
    public static Result listActiveExams() {
        User user = UserController.getLoggedUser();
        Timestamp now = new Timestamp(DateTime.now().getMillis());

        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("examSections")
                .where()
                .eq("state", "PUBLISHED")
                .lt("examEvent.examActiveEndDate", now)
                .eq("examEvent.enrolledStudents.id", user.getId())
                .findList();

        return ok(Json.toJson(exams));
    }


    public static Result startExam(String hash) throws UnauthorizedAccessException {

        //todo: check credentials / token
        Exam blueprint = Ebean.find(Exam.class)
                .fetch("examSections")
                .where()
                .eq("hash", hash).findUnique();


        if(blueprint == null) {
            //todo: add proper exception
            throw new UnauthorizedAccessException("a");
        }

        Exam studentExam = blueprint.clone();

        Exam possibleClone = Ebean.find(Exam.class)
                .fetch("examSections")
                .where()
                .eq("hash", studentExam.getHash()).findUnique();

        if(possibleClone != null) {
            return ok(Json.toJson(possibleClone));
        }

        studentExam.save();
        studentExam.setAnsweringStarted(new Timestamp(new Date().getTime()));
        return ok(Json.toJson(studentExam));
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

    public static Result insertAnswer(String hash, Long qid, Long oid) throws MalformedDataException {
        Logger.debug("insertAnswer()");

        // Todo: onko käyttäjällä aikaa jäljellä tehdä koetta?
        AbstractQuestion question = Ebean.find(AbstractQuestion.class, qid);
        MultipleChoiseOption option = Ebean.find(MultipleChoiseOption.class, oid);

        User user = UserController.getLoggedUser();
        Timestamp currentTime = new Timestamp(System.currentTimeMillis());


        if(question.getAnswer() == null) {
            // Insert new answer
            MultipleChoiseAnswer m_answer = new MultipleChoiseAnswer();
            m_answer.setOption(option);
            m_answer.setCreator(user);
            m_answer.setCreated(currentTime);
            m_answer.setModifier(user);
            m_answer.setModified(currentTime);
            question.setAnswer(m_answer);
            m_answer.save();
            question.save();

            return ok("Vastaus tallennettiin");
        } else {
            // Update answer
            MultipleChoiseAnswer answer = (MultipleChoiseAnswer)question.getAnswer();
            answer.setOption(option);
            answer.setModified(currentTime);
            answer.setModifier(user);

            answer.update();
            question.update();
        }



        return ok("Vastaus tallennettiin");
    }
}
