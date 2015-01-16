package controllers;

import Exceptions.UnauthorizedAccessException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import models.answers.EssayAnswer;
import models.answers.MultipleChoiseAnswer;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import models.questions.MultipleChoiceQuestion;
import models.questions.MultipleChoiseOption;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

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

        List<Exam> exams = new ArrayList<>();

        for (ExamEnrolment e : enrolments) {
            if (e.getExam().getState().equals("STUDENT_STARTED")) {
                // if exam not over -> return
                ExamParticipation participation = Ebean.find(ExamParticipation.class)
                        .fetch("exam")
                        .where()
                        .eq("exam.id", e.getExam().getId())
                        .findUnique();

                if (participation != null && participation.getStarted().getTime() + ((e.getExam().getDuration()) * 60 * 1000) > new Date().getTime()) {
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
        User user = UserController.getLoggedUser();
        String oql = "find exam " +
                "fetch examSections " +
                "fetch course " +
                "where (state=:review or state=:graded or state=:graded_logged or state=:aborted) " +
                "and (creator.id=:userid)";

        Query<Exam> query = Ebean.createQuery(Exam.class, oql);
        query.setParameter("review", "REVIEW");
        query.setParameter("graded", "GRADED");
        query.setParameter("graded_logged", "GRADED_LOGGED");
        query.setParameter("aborted", "ABORTED");
        query.setParameter("userid", user.getId());

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
    public static Result getExamGeneralInfo(Long id) {

        Exam exam = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("examFeedback")
                .where()
                .eq("id", id)
                .findUnique();

        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, name, grade, examActiveStartDate, examActiveEndDate, duration, grading, " +
                "room, course, creator, examFeedback, gradedByUser, enrollment, enrollInstruction");
        options.setPathProperties("course", "code, name, level, type, credits");
        options.setPathProperties("creator", "firstName, lastName, email");
        options.setPathProperties("examFeedback", "comment");
        options.setPathProperties("gradedByUser", "firstName, lastName");

        return ok(jsonContext.toJsonString(exam, true, options)).as("application/json");
    }

    @Restrict({@Group("STUDENT")})
    public static Result getEnrolment(Long eid) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("id", eid)
                .findUnique();

        if (enrolment == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, enrolledOn, user, exam, reservation");
            options.setPathProperties("user", "id");
            options.setPathProperties("exam", "id, name, course, hash, duration, state, examLanguage, enrollInstruction");
            options.setPathProperties("exam.course", "name, code");
            options.setPathProperties("reservation", "id, startAt, endAt, machine");
            options.setPathProperties("reservation.machine", "name");
            options.setPathProperties("reservation.machine", "name, room");
            options.setPathProperties("reservation.machine.room", "name, roomCode");

            return ok(jsonContext.toJsonString(enrolment, true, options)).as("application/json");
        }
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
            options.setPathProperties("exam", "id, name, course, hash, duration, state, examLanguage, enrollInstruction");
            options.setPathProperties("exam.course", "name, code");
            options.setPathProperties("reservation", "id, startAt, endAt, machine");
            options.setPathProperties("reservation.machine", "name");
            options.setPathProperties("reservation.machine", "name, room");
            options.setPathProperties("reservation.machine.room", "name, roomCode");


            return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("STUDENT")})
    public static Result getReservationInstructions(Long eid) {
        Exam exam = Ebean.find(Exam.class).where().eq("id", eid).findUnique();
        if (exam == null) {
            return notFound();
        }
        ObjectNode node = Json.newObject();
        node.put("enrollInstructions", exam.getEnrollInstruction());
        return ok(Json.toJson(node));
    }

    @Restrict({@Group("STUDENT")})
    public static Result getExamInspectors(Long id) {

        List<ExamInspection> inspections = Ebean.find(ExamInspection.class)
                .fetch("user")
                .fetch("exam")
                .where()
                .eq("exam.id", id)
                .findList();

        if (inspections == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, user, exam");
            options.setPathProperties("user", "firstName, lastName");
            options.setPathProperties("exam", "id");

            return ok(jsonContext.toJsonString(inspections, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("STUDENT")})
    public static Result createExam(String hash, User user) throws UnauthorizedAccessException {

        Exam blueprint = Ebean.find(Exam.class)
                .fetch("examSections")
                .fetch("examSections.sectionQuestions")
                .fetch("examSections.sectionQuestions.question")
                .where()
                .eq("hash", hash)
                .eq("parent", null)
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
                .findUnique();

        Exam possibleClone = Ebean.find(Exam.class)
                .fetch("examSections")
                .fetch("examSections.sectionQuestions")
                .fetch("examSections.sectionQuestions.question")
                .where()
                .eq("hash", hash)
                .ne("parent", null)
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
                .findUnique();

        // no exam found for hash
        if (blueprint == null && possibleClone == null) {
            return notFound();
        }

        // exam has been started
        if (possibleClone != null) {
            String state = possibleClone.getState();
            // sanity check
            if (!state.equals(Exam.State.STUDENT_STARTED.toString())) {
                return forbidden();
            }
        }

        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();

        // Create new exam for student
        if (possibleClone == null) {
            DateTime now = DateTime.now();
            String clientIP = request().remoteAddress();

            ExamEnrolment possibeEnrolment = Ebean.find(ExamEnrolment.class)
                    .fetch("reservation")
                    .fetch("reservation.machine")
                    .fetch("reservation.machine.room")
                    .where()
                    .eq("user.id", user.getId())
                    .eq("exam.id", blueprint.getId())
                    .findUnique();

            // if this is null, it means someone is trying to access an exam by wrong hash
            // which is weird.
            if (possibeEnrolment == null) {
                return forbidden("sitnet_reservation_not_found");
            }

            // exam and enrolment found. Is student on the right machine?

            if (possibeEnrolment.getReservation() == null) {
                return forbidden("sitnet_reservation_not_found");
            } else if (possibeEnrolment.getReservation().getMachine() == null) {
                return forbidden("sitnet_reservation_machine_not_found");
            } else if (!possibeEnrolment.getReservation().getMachine().getIpAddress().equals(clientIP)) {

                ExamRoom examRoom = Ebean.find(ExamRoom.class)
                        .fetch("mailAddress")
                        .where()
                        .eq("id", possibeEnrolment.getReservation().getMachine().getRoom().getId())
                        .findUnique();

                String message = "sitnet_wrong_exam_machine " + examRoom.getName()
                        + ", " + examRoom.getMailAddress().toString()
                        + ", sitnet_exam_machine " + possibeEnrolment.getReservation().getMachine().getName();

                return forbidden(message);
            }

            ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                    .fetch("reservation")
                    .fetch("reservation.machine")
                    .fetch("reservation.machine.room")
                    .where()
                    .eq("user.id", user.getId())
                    .eq("exam.id", blueprint.getId())
                    .le("reservation.startAt", now.toDate())
                    .gt("reservation.endAt", now.toDate())
                    .findUnique();

            // Wrong moment in time. Student is early or late

            if (enrolment == null) {

                DateTime endAt = new DateTime(possibeEnrolment.getReservation().getEndAt().getTime());
                DateTime startAt = new DateTime(possibeEnrolment.getReservation().getStartAt().getTime());

                DateTimeFormatter dateTimeFormat = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm");

                // too late
                if (now.isAfter(endAt)) {
                    return forbidden("sitnet_exam_has_ended " + dateTimeFormat.print(endAt.getMillis()));
                }
                // early
                else if (now.isBefore(startAt)) {
                    return forbidden("sitnet_exam_starts " + dateTimeFormat.print(startAt.getMillis()));
                } else {
                    Logger.error("enrolment not found when it was supposed to");
                    return internalServerError();
                }
            }

            /*
            *
            * Everything matches
            * - time
            * - place
            * - exam machine IP
            * - student
            * - exam
            *
            * We can start the exam
            *
             */
            Exam studentExam = (Exam) blueprint.clone();
            if (studentExam == null) {
                return notFound("sitnet_error_creating_exam");
            }

            studentExam.setState("STUDENT_STARTED");
            studentExam.setCreator(user);
            studentExam.setParent(blueprint);
            studentExam.generateHash();
            studentExam.save();

            enrolment.setExam(studentExam);
            enrolment.save();

            ExamParticipation examParticipation = new ExamParticipation();
            examParticipation.setUser(user);
            examParticipation.setExam(studentExam);
            examParticipation.setStarted(now.toDate());
            examParticipation.save();
            user.getParticipations().add(examParticipation);

            setStudentExamContent(options);

            return ok(jsonContext.toJsonString(studentExam, true, options)).as("application/json");

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
        options.setPathProperties("course", "id, code, name, level, type, credits, institutionName, department");
        options.setPathProperties("room", "roomInstruction, roomInstructionEN, roomInstructionSV");
        options.setPathProperties("examType", "id, type");
        options.setPathProperties("examSections", "id, name, sectionQuestions, exam, expanded");
        options.setPathProperties("examSections.sectionQuestions", "sequenceNumber, question");
        options.setPathProperties("examSections.sectionQuestions.question", "id, type, question, instruction, " +
                "maxScore, maxCharacters, options, attachment, answer");
        options.setPathProperties("examSections.sectionQuestions.question.answer", "id, type, option, attachment, answer");
        options.setPathProperties("examSections.sectionQuestions.question.answer.option", "id, option");
        options.setPathProperties("examSections.sectionQuestions.question.answer.attachment", "fileName");
        options.setPathProperties("examSections.sectionQuestions.question.attachment", "fileName");
        options.setPathProperties("examSections.sectionQuestions.question.options", "id, option");
        options.setPathProperties("examSections.sectionQuestions.question.comments", "id, comment");
    }

    @Restrict({@Group("STUDENT")})
    public static Result startExam(String hash) throws UnauthorizedAccessException {
        User user = UserController.getLoggedUser();
        return createExam(hash, user);
    }

    @Restrict({@Group("STUDENT")})
    public static Result saveAnswersAndExit(Long id) {
        Logger.debug("saveAnswersAndExit()");

        Exam exam = Ebean.find(Exam.class, id);

        ExamParticipation p = Ebean.find(ExamParticipation.class)
                .where()
                .eq("exam.id", id)
                .findUnique();

        if (p != null) {
            p.setEnded(new Date());
            p.setDuration(new Date(p.getEnded().getTime() - p.getStarted().getTime()));

            GeneralSettings settings = Ebean.find(GeneralSettings.class, 1);
            int deadlineDays = (int) settings.getReviewDeadline();
            Date deadline = new DateTime(p.getEnded()).plusDays(deadlineDays).toDate();
            p.setDeadline(deadline);
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

        if (p != null) {
            p.setEnded(new Date());
            p.setDuration(new Date(p.getEnded().getTime() - p.getStarted().getTime()));

            GeneralSettings settings = Ebean.find(GeneralSettings.class, 1);

            p.setDeadline(new Date(p.getEnded().getTime() + settings.getReviewDeadline()));

            p.save();
        }

        exam.setState("ABORTED");
        exam.update();

        return ok("Exam aborted");
    }

    @Restrict({@Group("STUDENT")})
    private static Result insertEmptyAnswer(String hash, Long questionId) {

        MultipleChoiceQuestion question = Ebean.find(MultipleChoiceQuestion.class, questionId);
        MultipleChoiseAnswer answer = new MultipleChoiseAnswer();
        MultipleChoiseOption option = new MultipleChoiseOption();

        option.setQuestion(question);
        answer.setOption(option);
        question.setAnswer(answer);

        option.save();
        answer.save();
        question.save();

        return ok(Json.toJson(answer));
    }

    @Restrict({@Group("STUDENT")})
    public static Result insertEssay(String hash, Long questionId) {
        DynamicForm df = Form.form().bindFromRequest();
        String answer = df.get("answer");

        Logger.debug(answer);

        EssayQuestion question = Ebean.find(EssayQuestion.class, questionId);
        EssayAnswer previousAnswer = (EssayAnswer) question.getAnswer();

        if (previousAnswer == null) {
            previousAnswer = new EssayAnswer();
        }

        previousAnswer.setAnswer(answer);
        previousAnswer.save();

        question.setAnswer(previousAnswer);
        question.save();
        Logger.debug(((EssayAnswer) question.getAnswer()).getAnswer());
        return ok("success");
    }


    @Restrict({@Group("STUDENT")})
    public static Result insertAnswer(String hash, Long qid, Long oid) {

        // Todo: onko käyttäjällä aikaa jäljellä tehdä koetta?

        AbstractQuestion question = Ebean.find(AbstractQuestion.class)
                .fetch("answer")
                .where()
                .eq("id", qid)
                .findUnique();

        if (oid > 0) {

            MultipleChoiseOption option = Ebean.find(MultipleChoiseOption.class, oid);

            // must clone answered option because teacher can remove original option.
            MultipleChoiseOption answeredOption = new MultipleChoiseOption();
            answeredOption.setOption(option.getOption());
            answeredOption.setCorrectOption(option.isCorrectOption());
            answeredOption.setScore(option.getScore());
            answeredOption.save();

            if (question.getAnswer() == null) {
                MultipleChoiseAnswer answer = new MultipleChoiseAnswer();
                answer.setOption(answeredOption);
                question.setAnswer(answer);
                answer.save();
                question.save();

                return ok(Json.toJson(answer));

            } else {
                MultipleChoiseAnswer answer = (MultipleChoiseAnswer) question.getAnswer();
                if (answer.getOption() == null) {

                    answer.setOption(answeredOption);
                    answer.update();
                    question.update();

                } else {

                    long optionId = answer.getOption().getId();
                    answer.setOption(answeredOption);

                    answer.update();
                    question.update();

                    // delete old answered option
                    Ebean.delete(MultipleChoiseOption.class, optionId);
                }
                return ok(Json.toJson(answer));
            }
        } else {
            return insertEmptyAnswer(hash, qid);
        }
    }

}
