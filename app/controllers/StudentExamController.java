package controllers;

import Exceptions.UnauthorizedAccessException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Query;
import models.Exam;
import models.User;
import models.answers.AbstractAnswer;
import models.answers.EssayAnswer;
import models.answers.MultipleChoiseAnswer;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import models.questions.MultipleChoiseOption;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;

import java.sql.Timestamp;
import java.util.List;

/**
 * Created by avainik on 3/3/14.
 */
public class StudentExamController extends SitnetController {

    @Restrict(@Group({"STUDENT"}))
    public static Result listActiveExams() {
//        User user = UserController.getLoggedUser();
//        Timestamp now = new Timestamp(DateTime.now().getMillis());

        String oql =
                "  find  exam "
                        +" fetch examSections "
                        +" fetch course "
                        +" fetch examEvent "
                        +" where state=:published or state=:started or state=:returned";

        Query<Exam> query = Ebean.createQuery(Exam.class, oql);
        query.setParameter("published", "PUBLISHED");
        query.setParameter("started", "STUDENT_STARTED");
        query.setParameter("returned", "REVIEW");

        List<Exam> exams = query.findList();

//        List<Exam> exams = Ebean.find(Exam.class)
//                .fetch("examSections")
//                .where()
//                .eq("state", "PUBLISHED")
////                .lt("examEvent.examActiveEndDate", now)
////                .eq("examEvent.enrolledStudents.id", user.getId())
//                .findList();

        return ok(Json.toJson(exams));
    }

    public static Result startExam(String hash) throws UnauthorizedAccessException {

        //todo: check credentials / token
        Exam blueprint = Ebean.find(Exam.class)
                .fetch("examSections")
                .where()
                .eq("hash", hash)
                .findUnique();

        Exam possibleClone = Ebean.find(Exam.class)
                .fetch("examSections")
                .where()
                .eq("hash", hash)
                .eq("state", "STUDENT_STARTED").findUnique();

        if (blueprint == null) {
            //todo: add proper exception
            throw new UnauthorizedAccessException("a");
        }

        if (possibleClone == null) {
            Exam studentExam = (Exam)blueprint.clone();
//            studentExam.setStudent(UserController.getLoggedUser());
//            studentExam.setAnsweringStarted(new Timestamp(new Date().getTime()));
            studentExam.setState("STUDENT_STARTED");
            studentExam.generateHash();


            // 1. might want try Serialization clone approach
            // @Version http://blog.matthieuguillermin.fr/2012/11/ebean-and-the-optimisticlockexception/
            // http://avaje.org/topic-112.html

            studentExam.save();

            return ok(Json.toJson(studentExam));
        } else {
            return ok(Json.toJson(possibleClone));
        }
    }

    public static Result saveAnswersAndExit(Long id) {
        Logger.debug("saveAnswersAndExit()");

        Exam exam = Ebean.find(Exam.class, id);
        exam.setState("REVIEW");
        exam.update();

        return ok("Exam send for review");
    }

    public static Result abortExam(Long id) {
        Logger.debug("saveAnswersAndExit()");

        Exam exam = Ebean.find(Exam.class, id);
        exam.setState("ABORTED");
        exam.update();

        return ok("Exam aborted");
    }

    public static Result insertEssay(String hash, Long questionId) {
        String answerString = request().body().asJson().get("answer").toString();

        Logger.debug(answerString);

        EssayQuestion question = Ebean.find(EssayQuestion.class, questionId);

        Timestamp currentTime = new Timestamp(System.currentTimeMillis());
        User user = UserController.getLoggedUser();

        EssayAnswer previousAnswer = (EssayAnswer) question.getAnswer();

        if(previousAnswer == null) {
            previousAnswer = new EssayAnswer();
            previousAnswer.setCreated(currentTime);
            previousAnswer.setCreator(user);
        }

        previousAnswer.setModifier(user);
        previousAnswer.setModified(currentTime);
        previousAnswer.setAnswer(answerString);
        previousAnswer.save();

        question.setAnswer(previousAnswer);
        question.save();
        Logger.debug(((EssayAnswer) question.getAnswer()).getAnswer());
        return ok("success");
    }

    public static Result insertAnswer(String hash, Long qid, Long oid)  {
        // Todo: onko käyttäjällä aikaa jäljellä tehdä koetta?

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, qid);
        MultipleChoiseOption option = Ebean.find(MultipleChoiseOption.class, oid);

        User user = UserController.getLoggedUser();
        Timestamp currentTime = new Timestamp(System.currentTimeMillis());

        if(question.getAnswer() == null) {
            MultipleChoiseAnswer answer = new MultipleChoiseAnswer();
            answer.setOption(option);
            answer.setCreator(user);
            answer.setCreated(currentTime);
            answer.setModifier(user);
            answer.setModified(currentTime);
            question.setAnswer(answer);
            answer.save();
            question.save();
        } else {
            AbstractAnswer answer = question.getAnswer();
            ((MultipleChoiseAnswer) answer).setOption(option);
            answer.setModified(currentTime);
            answer.setModifier(user);
            answer.update();
            question.update();
        }
        return ok("Vastaus tallennettiin");
    }
}
