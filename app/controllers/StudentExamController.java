package controllers;

import Exceptions.UnauthorizedAccessException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import models.*;
import models.answers.EssayAnswer;
import models.answers.MultipleChoiseAnswer;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import models.questions.MultipleChoiseOption;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Created by avainik on 3/3/14.
 */
public class StudentExamController extends SitnetController {

    @Restrict({@Group("STUDENT")})
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
            if(e.getExam().getState().equals("STUDENT_STARTED")) {
                // if exam not over -> return
                ExamParticipation participation = Ebean.find(ExamParticipation.class)
                        .fetch("exam")
                        .where()
                        .eq("exam.id", e.getExam().getId())
                        .findUnique();

                if(participation != null && participation.getStarted().getTime() + ((e.getExam().getDuration()) * 60 * 1000) > new Date().getTime()) {
                    exams.add(e.getExam());
                }

            } else {
                exams.add(e.getExam());
            }
        }

        return ok(Json.toJson(exams));
    }

    @Restrict({@Group("STUDENT")})
    public static Result getFinishedExams(Long uid) {
        Logger.debug("getFinishedExams()");

        String oql = null;
        Query<Exam> query = null;

        User user = UserController.getLoggedUser();
        if(user.hasRole("STUDENT")) {
            oql = "find exam " +
                    "fetch examSections " +
                    "fetch course " +
                    "where (state=:review or state=:graded or state=:graded_logged or state=:aborted) " +
                    "and (creator.id=:userid)";

            query = Ebean.createQuery(Exam.class, oql);
            query.setParameter("review", "REVIEW");
            query.setParameter("graded", "GRADED");
            query.setParameter("graded_logged", "GRADED_LOGGED");
            query.setParameter("aborted", "ABORTED");
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
    }

    @Restrict({@Group("STUDENT")})
    public static Result getExamGeneralInfo(Long id)  {

        Exam exam = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("examFeedback")
                .where()
                .eq("id", id)
                .findUnique();

        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, name, grade, examActiveStartDate, examActiveEndDate, duration, grading, room, course, creator, examFeedback, gradedByUser");
        options.setPathProperties("course", "code, name, level, type, credits");
        options.setPathProperties("creator", "firstName, lastName, email");
        options.setPathProperties("examFeedback", "comment");
        options.setPathProperties("gradedByUser", "firstName, lastName");

        return ok(jsonContext.toJsonString(exam, true, options)).as("application/json");
    }

    @Restrict({@Group("STUDENT")})
    public static Result getEnrolmentsForUser(Long uid) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("user.id", uid)
                .disjunction()
                    .eq("exam.state", "PUBLISHED")
                    .eq("exam.state", "STUDENT_STARTED")
                    //.eq("exam.state", "ABORTED")
                .endJunction()
                .findList();

        if (enrolments == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, enrolledOn, user, exam, reservation");
            options.setPathProperties("user", "id");
            options.setPathProperties("exam", "id, name, course, hash, duration, state");
            options.setPathProperties("exam.course", "name, code");
            options.setPathProperties("reservation", "id, startAt, endAt, machine");
            options.setPathProperties("reservation.machine", "name");
            options.setPathProperties("reservation.machine", "name, room");
            options.setPathProperties("reservation.machine.room", "name, roomCode");


            return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
        }
    }

    public static Result createExam(String hash, User user) throws UnauthorizedAccessException {

        Exam blueprint = Ebean.find(Exam.class)
                .fetch("examSections")
                .where()
                .eq("hash", hash)
                .eq("parent", null)
                .findUnique();


        Exam possibleClone = Ebean.find(Exam.class)
                .fetch("examSections")
                .where()
                .eq("hash", hash)
                .ne("parent", null)
                .findUnique();

        //ko. hashilla ei ole koetta olemassa
        if (blueprint == null && possibleClone == null) {
            return notFound();
        }

        //aloitettu koe
        if(possibleClone != null) {
            String state = possibleClone.getState();
            //kokeen tila on jokin muu kuin käynnissäoleva
            if (!state.equals(Exam.State.STUDENT_STARTED.toString())) {
                return forbidden();
            }
        }

        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();

        // tehdään uusi koe opiskelijalle "oletus"
        if (possibleClone == null) {

            Exam studentExam = (Exam)blueprint.clone();
            if (studentExam == null) {
                return notFound();
            } else {

                ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                        .fetch("reservation")
                        .fetch("reservation.machine")
                        .where()
                        .eq("user.id", user.getId())
                        .eq("exam.id", blueprint.getId())
                        .findUnique();

                //et ole ilmoittautunut kokeeseen
                if(enrolment == null) {
                    return forbidden("you have no enrolment");
                }

                if(enrolment.getReservation() ==  null) {
                      return forbidden("you have no reservation");
                }

                if(enrolment.getReservation().getMachine() == null ) {
                    return internalServerError("there is no machine on the reservation");
                }

                /*
                String ip = request().remoteAddress();
                if(!enrolment.getReservation().getMachine().getIpAddress().equals(ip)){
                    return forbidden("wrong machine");
                }
                */

                studentExam.setState("STUDENT_STARTED");
                studentExam.setCreator(user);
                studentExam.setParent(blueprint);
                studentExam.generateHash();
                studentExam.save();

                // 1. might want try Serialization clone approach
                // @Version http://blog.matthieuguillermin.fr/2012/11/ebean-and-the-optimisticlockexception/
                // http://avaje.org/topic-112.html


                enrolment.setExam(studentExam);
                enrolment.save();

                ExamParticipation examParticipation = new ExamParticipation();
                examParticipation.setUser(user);
                examParticipation.setExam(studentExam);
                examParticipation.setStarted(new Timestamp(new Date().getTime()));
                examParticipation.save();
                user.getParticipations().add(examParticipation);

                setStudentExamContent(options);

                return ok(jsonContext.toJsonString(studentExam, true, options)).as("application/json");
            }
        } else {
            //palautetaan olemassa oleva koe, esim. sessio katkennut tms. jatketaan kokeen tekemistä.

            setStudentExamContent(options);

            return ok(jsonContext.toJsonString(possibleClone, true, options)).as("application/json");
        }
    }

    private static void setStudentExamContent(JsonWriteOptions options) {

        options.setRootPathProperties("id, name, creator, course, examType, instruction, shared, examSections, hash, examActiveStartDate, examActiveEndDate, room, " +
                "duration, examLanguage, answerLanguage, state, expanded, attachment");
        options.setPathProperties("creator", "id");
        options.setPathProperties("attachment", "fileName");
        options.setPathProperties("course", "id, organisation, code, name, level, type, credits");
        options.setPathProperties("room", "roomInstruction, roomInstructionEN, roomInstructionSV");
        options.setPathProperties("course.organisation", "id, code, name, nameAbbreviation, courseUnitInfoUrl, recordsWhitelistIp, vatIdNumber");
        options.setPathProperties("examType", "id, type");
        options.setPathProperties("examSections", "id, name, questions, exam, expanded");
        options.setPathProperties("examSections.questions", "id, type, question, instruction, maxScore, maxCharacters, options, attachment");
        options.setPathProperties("examSections.questions.attachment", "fileName");
        options.setPathProperties("examSections.questions.options", "id, option" );
        options.setPathProperties("examSections.questions.comments", "id, comment");
    }

    @Restrict({@Group("STUDENT")})
    public static Result startExam(String hash) throws UnauthorizedAccessException {
        User user = UserController.getLoggedUser();
        return createExam(hash, user );
    }

    @Restrict({@Group("STUDENT")})
    public static Result saveAnswersAndExit(Long id) {
        Logger.debug("saveAnswersAndExit()");

        Exam exam = Ebean.find(Exam.class, id);

        ExamParticipation p = Ebean.find(ExamParticipation.class)
                .where()
                .eq("exam.id", id)
                .findUnique();

        if(p != null) {
            p.setEnded(SitnetUtil.getTime());
            p.setDuration(new Timestamp(p.getEnded().getTime() - p.getStarted().getTime()));

            // Todo: should not read from application.conf, come up with a better idea
//            long deadline = ConfigFactory.load().getLong("sitnet.deadline");
            GeneralSettings settings = Ebean.find(GeneralSettings.class, 1);

            p.setDeadline(new Timestamp(p.getEnded().getTime() + settings.getReviewDeadline()));

            p.save();
        }

        exam.setState("REVIEW");
        exam.update();

        return ok("Exam send for review");
    }

    @Restrict({@Group("STUDENT")})
    public static Result abortExam(Long id) {
        Logger.debug("saveAnswersAndExit()");

        Exam exam = Ebean.find(Exam.class, id);

        ExamParticipation p = Ebean.find(ExamParticipation.class)
                .where()
                .eq("exam.id", id)
                .findUnique();

        if(p != null) {
            p.setEnded(SitnetUtil.getTime());
            p.setDuration(new Timestamp(p.getEnded().getTime() - p.getStarted().getTime()));

            GeneralSettings settings = Ebean.find(GeneralSettings.class, 1);

            p.setDeadline(new Timestamp(p.getEnded().getTime() + settings.getReviewDeadline()));

            p.save();
        }

        exam.setState("ABORTED");
        exam.update();

        return ok("Exam aborted");
    }

    @Restrict({@Group("STUDENT")})
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

    @Restrict({@Group("STUDENT")})
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
