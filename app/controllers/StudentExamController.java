package controllers;

import Exceptions.UnauthorizedAccessException;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
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

    public static Result getFinishedExams(Long uid) {
        Logger.debug("getFinishedExams()");

//        List<Exam> finishedExams = Ebean.find(Exam.class)
//                .fetch("creator")
//                .fetch("course")
//                .where()
//                .eq("creator.id", uid)
//                .eq("state", "REVIEW")
//                .eq("state", "REVIEWED")
//                .findList();

        String oql = null;
        Query<Exam> query = null;

        User user = UserController.getLoggedUser();
        if(user.hasRole("STUDENT")) {
            oql = "find exam " +
                    "fetch examSections " +
                    "fetch course " +
                    "where (state=:review or state=:reviewed) " +
                    "and (creator.id=:userid)";

            query = Ebean.createQuery(Exam.class, oql);
            query.setParameter("review", "REVIEW");
            query.setParameter("reviewed", "REVIEWED");
            query.setParameter("userid", user.getId());
        }

        List<Exam> finishedExams = query.findList();

        if (finishedExams == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, creator, name, course, state");
            options.setPathProperties("creator", "id");
            options.setPathProperties("course", "code");

            return ok(jsonContext.toJsonString(finishedExams, true, options)).as("application/json");
        }



//        List<Exam> finishedExams = Ebean.find(Exam.class)
//                .fetch("exam")
//                .where()
//                .eq("creator.id", uid)
//                .eq("state", "REVIEW")
//                .eq("state", "IN_REVIEW_STARTED")
//                .eq("state", "GRADED")
//                .findList();

//        String oql = "find exam " +
//                "fetch examSections " +
//                "fetch course " +
//                "where (state=:review or state=:in_review_started or state=:graded) ";
//
//        Query<Exam> query = Ebean.createQuery(Exam.class, oql);
//        query.setParameter("review", "REVIEW");
//        query.setParameter("in_review_started", "IN_REVIEW_STARTED");
//        query.setParameter("graded", "GRADED");
//
//        List<Exam> exams = query.findList();

//        return ok(Json.toJson(finishedExams));
    }

    public static Result getEnrolmentsForUser(Long uid) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("reservation")
                .where()
                .eq("user.id", uid)
                .findList();

        if (enrolments == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, enrolledOn, user, exam, reservation");
            options.setPathProperties("user", "id");
            options.setPathProperties("exam", "id, name, course");
            options.setPathProperties("exam.course", "code");
            options.setPathProperties("reservation", "startAt, machine");
            options.setPathProperties("reservation.machine", "name");

            return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
        }
    }

    public static Result startExam(String hash) throws UnauthorizedAccessException {

        Exam possibleClone = Ebean.find(Exam.class)
                .fetch("examSections")
                .where()
                .eq("hash", hash)
                .eq("state", "STUDENT_STARTED").findUnique();

        //todo: check credentials / token
        Exam blueprint = Ebean.find(Exam.class)
                .fetch("examSections")
                .where()
                .eq("hash", hash)
                .findUnique();

        if (blueprint == null) {
            //todo: add proper exception
            throw new UnauthorizedAccessException("a");
        }

        if (possibleClone == null) {
            User user = UserController.getLoggedUser();

            Exam studentExam = (Exam)blueprint.clone();
            if (studentExam == null) {
                return notFound();
            } else {
                studentExam.setState("STUDENT_STARTED");
                studentExam.setCreator(user);
                studentExam.setParent(blueprint);
                studentExam.generateHash();
                studentExam.save();

            // 1. might want try Serialization clone approach
            // @Version http://blog.matthieuguillermin.fr/2012/11/ebean-and-the-optimisticlockexception/
            // http://avaje.org/topic-112.html

//            ExamParticipation examParticipation = new ExamParticipation();
//            examParticipation.setUser(user);
//            examParticipation.setExam(studentExam);
//            examParticipation.setStarted(new Timestamp(new Date().getTime()));
//            examParticipation.save();
//            user.getParticipations().add(examParticipation);

            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();

            options.setRootPathProperties("id, name, creator, course, examType, instruction, shared, examSections, hash, examActiveStartDate, examActiveEndDate, room, " +
                    "duration, examLanguage, answerLanguage, state, expanded");
            options.setPathProperties("creator", "id");
            options.setPathProperties("course", "id, organisation, code, name, level, type, credits");
            options.setPathProperties("course.organisation", "id, code, name, nameAbbreviation, courseUnitInfoUrl, recordsWhitelistIp, vatIdNumber");
            options.setPathProperties("examType", "id, type");
            options.setPathProperties("examSections", "id, name, questions, exam, expanded");
            options.setPathProperties("examSections.questions", "id, type, question, instruction, maxScore, options");
            options.setPathProperties("examSections.questions.options", "id, option" );
            options.setPathProperties("examSections.questions.comments", "id, comment");

            return ok(jsonContext.toJsonString(studentExam, true, options)).as("application/json");
            }
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
