package controllers;

import Exceptions.UnauthorizedAccessException;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamEnrolment;
import models.ExamParticipation;
import models.User;
import models.answers.EssayAnswer;
import models.answers.MultipleChoiseAnswer;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import models.questions.MultipleChoiseOption;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Created by avainik on 3/3/14.
 */
public class StudentExamController extends SitnetController {

//    @Restrict(@Group({"STUDENT"}))
    public static Result listActiveExams() {

        User user = UserController.getLoggedUser();

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where()
                .eq("user.id", user.getId())
                .findList();

        List<Exam> exams = new ArrayList<Exam>();

        for (ExamEnrolment e : enrolments)
        {
            exams.add(e.getExam());
        }

//        String oql = "find  exam "
//                        +" fetch examSections "
//                        +" fetch course "
//                        +" where state=:published or state=:started or state=:returned";
//
//        Query<Exam> query = Ebean.createQuery(Exam.class, oql);
//        query.setParameter("published", "PUBLISHED");
//        query.setParameter("started", "STUDENT_STARTED");
//        query.setParameter("returned", "REVIEW");
//
//        List<Exam> exams = query.findList();

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
            studentExam.setState("STUDENT_STARTED");
            studentExam.setParent(blueprint);
            studentExam.generateHash();
            studentExam.save();

            User user = UserController.getLoggedUser();

            ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                    .where()
                    .eq("user.id", user.getId())
                    .eq("exam.id", blueprint.getId())
                    .findUnique();

            enrolment.setExam(studentExam);
            enrolment.save();

            // 1. might want try Serialization clone approach
            // @Version http://blog.matthieuguillermin.fr/2012/11/ebean-and-the-optimisticlockexception/
            // http://avaje.org/topic-112.html


            ExamParticipation examParticipation = new ExamParticipation();
            examParticipation.setUser(user);
            examParticipation.setExam(studentExam);
            examParticipation.setStarted(new Timestamp(new Date().getTime()));
            examParticipation.save();
            user.getParticipations().add(examParticipation);

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
//            previousAnswer.setCreated(currentTime);
//            previousAnswer.setCreator(user);
        }

//        previousAnswer.setModifier(user);
//        previousAnswer.setModified(currentTime);
        previousAnswer.setAnswer(answerString);
        previousAnswer.save();

        question.setAnswer(previousAnswer);
        question.save();
        Logger.debug(((EssayAnswer) question.getAnswer()).getAnswer());
        return ok("success");
    }

    public static Result insertAnswer(String hash, Long qid, Long oid)  {

        // Todo: onko käyttäjällä aikaa jäljellä tehdä koetta?

        AbstractQuestion question = Ebean.find(AbstractQuestion.class)
                .fetch("answer")
                .where()
                .eq("id", qid)
                .findUnique();

        MultipleChoiseOption option = Ebean.find(MultipleChoiseOption.class, oid);

        // must clone answered option because teacher can remove original option.
        MultipleChoiseOption answeredOption = new MultipleChoiseOption();
        answeredOption.setOption(option.getOption());
        answeredOption.setCorrectOption(option.isCorrectOption());
        answeredOption.setScore(option.getScore());
        answeredOption.save();

        User user = UserController.getLoggedUser();
        Timestamp currentTime = new Timestamp(System.currentTimeMillis());

        if(question.getAnswer() == null) {
            MultipleChoiseAnswer answer = new MultipleChoiseAnswer();
            answer.setOption(answeredOption);
//            answer.setCreator(user);
//            answer.setCreated(currentTime);
//            answer.setModifier(user);
//            answer.setModified(currentTime);
            question.setAnswer(answer);
            answer.save();
            question.save();
            return ok(Json.toJson(answer));
        } else {
            MultipleChoiseAnswer answer = (MultipleChoiseAnswer) question.getAnswer();
            MultipleChoiseOption agh = Ebean.find(MultipleChoiseOption.class, answer.getOption().getId());
            answer.setOption(agh);

            long optionId = answer.getOption().getId();
            answer.setOption(answeredOption);

//            answer.setModified(currentTime);
//            answer.setModifier(user);
            answer.update();
            question.update();

            // delete old answered option
            Ebean.delete(MultipleChoiseOption.class, optionId);

            return ok(Json.toJson(answer));
        }
    }
}
