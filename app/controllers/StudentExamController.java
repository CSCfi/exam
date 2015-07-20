package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.Query;
import com.fasterxml.jackson.databind.node.ObjectNode;
import exceptions.SitnetException;
import models.*;
import models.questions.Answer;
import models.questions.MultipleChoiseOption;
import models.questions.Question;
import org.joda.time.DateTime;
import play.Logger;
import play.Play;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.F;
import play.libs.Json;
import play.mvc.Result;
import util.AppUtil;

import javax.inject.Inject;
import java.net.MalformedURLException;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.List;

public class StudentExamController extends BaseController {

    private static final boolean PERM_CHECK_ACTIVE = AppUtil.isEnrolmentPermissionCheckActive();

    @Inject
    protected ExternalAPI externalAPI;

    @Restrict({@Group("STUDENT")})
    public F.Promise<Result> listAvailableExams(final F.Option<String> filter) throws MalformedURLException {
        if (!PERM_CHECK_ACTIVE) {
            return wrapAsPromise(listExams(filter, Collections.<String>emptyList()));
        }
        F.Promise<Collection<String>> promise = externalAPI.getPermittedCourses(getLoggedUser());
        return promise.map(codes -> {
            if (codes.isEmpty()) {
                return ok(Json.toJson(Collections.<Exam>emptyList())).as("application/json");
            } else {
                return listExams(filter, codes);
            }
        }).recover(throwable -> internalServerError(throwable.getMessage()));
    }

    @Restrict({@Group("STUDENT")})
    public Result getFinishedExams(Long uid) {
        User user = getLoggedUser();
        List<Exam> exams = Ebean.find(Exam.class)
                .select("id, state, name")
                .fetch("creator", "id")
                .fetch("course", "code")
				.fetch("examParticipations", "ended")
				.fetch("examInspectors", "firstName, lastName")
                .where()
                .ne("state", Exam.State.STUDENT_STARTED.toString())
                .ne("state", Exam.State.ABORTED.toString())
                .eq("creator", user)
                .findList();
        return ok(exams);
    }

    @Restrict({@Group("STUDENT")})
    public Result getExamGeneralInfo(Long id) {

        Exam exam = Ebean.find(Exam.class)
                .fetch("creator", "firstName, lastName, email")
                .fetch("course", "code, name, level, type, credits")
                .fetch("grade")
                .fetch("gradeScale")
                .fetch("examFeedback")
                .fetch("gradedByUser", "firstName, lastName")
                .fetch("parent.examOwners", "firstName, lastName")
                .where()
                .eq("id", id)
                .eq("state", Exam.State.GRADED_LOGGED.toString())
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        exam.setMaxScore();
        exam.setApprovedAnswerCount();
        exam.setRejectedAnswerCount();
        exam.setTotalScore();

        return ok(exam);
    }

    @Restrict({@Group("STUDENT")})
    public Result getEnrolment(Long eid) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("exam.course", "name, code")
                .fetch("exam.examOwners", "firstName, lastName")
                .fetch("user", "id")
                .fetch("reservation.machine", "name")
                .fetch("reservation.machine.room", "name, roomCode")
                .where()
                .idEq(eid)
                .findUnique();

        if (enrolment == null) {
            return notFound();
        } else {
            return ok(enrolment);
        }
    }

    @Restrict({@Group("STUDENT")})
    public Result getEnrolmentsForUser() {
        DateTime now = AppUtil.adjustDST(new DateTime());
        User user = getLoggedUser();
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("exam.course", "name, code")
                .fetch("exam.examLanguages")
                .fetch("exam.examOwners", "firstName, lastName")
                .fetch("reservation.machine", "name")
                .fetch("reservation.machine.room", "name, roomCode")
                .where()
                .eq("user", user)
                .gt("exam.examActiveEndDate", now.toDate())
                .disjunction()
                .gt("reservation.endAt", now.toDate())
                .isNull("reservation")
                .endJunction()
                .disjunction()
                .eq("exam.state", "PUBLISHED")
                .eq("exam.state", "STUDENT_STARTED")
                .endJunction()
                .findList();
        return ok(enrolments);
    }

    @Restrict({@Group("STUDENT")})
    public Result getReservationInstructions(Long eid) {
        Exam exam = Ebean.find(Exam.class).where().eq("id", eid).findUnique();
        if (exam == null) {
            return notFound();
        }
        ObjectNode node = Json.newObject();
        node.put("enrollInstructions", exam.getEnrollInstruction());
        return ok(Json.toJson(node));
    }

    @Restrict({@Group("STUDENT")})
    public Result getExamInspectors(Long id) {

        List<ExamInspection> inspections = Ebean.find(ExamInspection.class)
                .select("id")
                .fetch("user", "firstName, lastName")
                .fetch("exam", "id")
                .where()
                .eq("exam.id", id)
                .findList();

        if (inspections == null) {
            return notFound();
        } else {
            return ok(inspections);
        }
    }

    private static Exam getPrototype(String hash) {
        return createQuery()
                .where()
                .eq("hash", hash)
                .eq("parent", null)
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
                .findUnique();
    }

    private static Exam getPossibleClone(String hash) {
        return createQuery().where()
                .eq("hash", hash)
                .ne("parent", null)
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
                .findUnique();
    }

    private static Exam createNewExam(Exam prototype, User user, ExamEnrolment enrolment) {
        Exam studentExam = prototype.copy(user);
        studentExam.setState(Exam.State.STUDENT_STARTED.toString());
        studentExam.setCreator(user);
        studentExam.setParent(prototype);
        studentExam.generateHash();
        studentExam.save();

        enrolment.setExam(studentExam);
        enrolment.save();

        ExamParticipation examParticipation = new ExamParticipation();
        examParticipation.setUser(user);
        examParticipation.setExam(studentExam);
        examParticipation.setStarted(DateTime.now().toDate());
        examParticipation.save();
        user.getParticipations().add(examParticipation);

        return studentExam;
    }

    private static ExamEnrolment getEnrolment(User user, Exam prototype) {
        DateTime now = AppUtil.adjustDST(DateTime.now());
        return Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("user.id", user.getId())
                .eq("exam.id", prototype.getId())
                .le("reservation.startAt", now.toDate())
                .gt("reservation.endAt", now.toDate())
                .findUnique();
    }

    private static Result checkEnrolmentOK(ExamEnrolment enrolment) {
        // If this is null, it means someone is either trying to access an exam by wrong hash
        // or the reservation is not in effect right now.
        if (enrolment == null) {
            return forbidden("sitnet_reservation_not_found");
        }
        String clientIP = request().remoteAddress();
        // Exam and enrolment found. Is student on the right machine?
        if (enrolment.getReservation() == null) {
            return forbidden("sitnet_reservation_not_found");
        } else if (enrolment.getReservation().getMachine() == null) {
            return forbidden("sitnet_reservation_machine_not_found");
        } else if (!Play.isDev() && !enrolment.getReservation().getMachine().getIpAddress().equals(clientIP)) {
            ExamRoom examRoom = Ebean.find(ExamRoom.class)
                    .fetch("mailAddress")
                    .where()
                    .eq("id", enrolment.getReservation().getMachine().getRoom().getId())
                    .findUnique();
            String message = "sitnet_wrong_exam_machine " + examRoom.getName()
                    + ", " + examRoom.getMailAddress().toString()
                    + ", sitnet_exam_machine " + enrolment.getReservation().getMachine().getName();
            return forbidden(message);
        }
        return null;
    }

    private static Query<Exam> createQuery() {

        return Ebean.find(Exam.class)
                .select("id, name, instruction, shared, hash, examActiveStartDate, examActiveEndDate, duration, answerLanguage, state, expanded, cloned")
                .fetch("creator", "id")
                .fetch("course", "id, code, name, level, type, credits, institutionName, department")
                .fetch("examType", "id, type")
                .fetch("examSections", "id, name")
                .fetch("examSections.sectionQuestions", "sequenceNumber")
                .fetch("examSections.sectionQuestions.question", "id, type, question, instruction, maxScore, maxCharacters, evaluationType, expanded")
                .fetch("examSections.sectionQuestions.question.options", "id, option")
                .fetch("examSections.sectionQuestions.question.attachment", "fileName")
                .fetch("examSections.sectionQuestions.question.answer", "id, type, answer")
                .fetch("examSections.sectionQuestions.question.answer.option", "id, option")
                .fetch("examSections.sectionQuestions.question.answer.attachment", "fileName")
                .fetch("examLanguages", "code")
                .fetch("attachment", "fileName")
                .fetch("examOwners", "firstName, lastName")
                .fetch("examInspections.user", "firstName, lastName");
    }

    @Restrict({@Group("STUDENT")})
    public Result startExam(String hash) throws SitnetException {
        Exam prototype = getPrototype(hash);
        Exam possibleClone = getPossibleClone(hash);
        // no exam found for hash
        if (prototype == null && possibleClone == null) {
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

        // Create new exam for student
        if (possibleClone == null) {
            User user = getLoggedUser();
            ExamEnrolment enrolment = getEnrolment(user, prototype);
            Result error = checkEnrolmentOK(enrolment);
            if (error != null) {
                return error;
            }
            // We are good to go (reservation and enrolment OK)
            Exam newExam = createNewExam(prototype, user, enrolment);
            //TODO: check how to do better
            Exam studentExam = createQuery().where().idEq(newExam.getId()).findUnique();
            studentExam.setCloned(true);
            return ok(studentExam);
        } else {
            // Returning an already existing student exam
            possibleClone.setCloned(false);
            return ok(possibleClone);
        }
    }

    @Restrict({@Group("STUDENT")})
    public Result saveAnswersAndExit(Long id) {
        Logger.debug("saveAnswersAndExit()");

        Exam exam = Ebean.find(Exam.class, id);

        ExamParticipation p = Ebean.find(ExamParticipation.class)
                .where()
                .eq("exam.id", id)
                .isNull("ended")
                .findUnique();

        if (p != null) {
            p.setEnded(DateTime.now().toDate());
            p.setDuration(new Date(p.getEnded().getTime() - p.getStarted().getTime()));

            GeneralSettings settings = Ebean.find(GeneralSettings.class, 1);
            int deadlineDays = (int) settings.getReviewDeadline();
            Date deadline = new DateTime(p.getEnded()).plusDays(deadlineDays).toDate();
            p.setDeadline(deadline);
            p.save();

            exam.setState("REVIEW");
            exam.update();

            return ok("Exam send for review");
        } else {
            return forbidden("exam already returned");
        }
    }

    @Restrict({@Group("STUDENT")})
    public Result abortExam(Long id) {
        Logger.debug("saveAnswersAndExit()");

        Exam exam = Ebean.find(Exam.class, id);

        ExamParticipation p = Ebean.find(ExamParticipation.class)
                .where()
                .eq("exam.id", id)
                .isNull("ended")
                .findUnique();

        if (p != null) {
            p.setEnded(AppUtil.adjustDST(DateTime.now()).toDate());
            p.setDuration(new Date(p.getEnded().getTime() - p.getStarted().getTime()));

            GeneralSettings settings = Ebean.find(GeneralSettings.class, 1);

            p.setDeadline(new Date(p.getEnded().getTime() + settings.getReviewDeadline()));

            p.save();


            exam.setState("ABORTED");
            exam.update();

            return ok("Exam aborted");
        } else {
            return forbidden("Exam already returned");
        }
    }

    @Restrict({@Group("STUDENT")})
    private static Result insertEmptyAnswer(String hash, Long questionId) {

        Question question = Ebean.find(Question.class, questionId);
        Answer answer = new Answer();
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
    public Result insertEssay(String hash, Long questionId) {
        DynamicForm df = Form.form().bindFromRequest();
        String answer = df.get("answer");

        Logger.debug(answer);

        Question question = Ebean.find(Question.class, questionId);
        Answer previousAnswer = question.getAnswer();

        if (previousAnswer == null) {
            previousAnswer = new Answer();
        }

        previousAnswer.setAnswer(answer);
        previousAnswer.save();

        question.setAnswer(previousAnswer);
        question.save();
        Logger.debug(question.getAnswer().getAnswer());
        return ok("success");
    }


    @Restrict({@Group("STUDENT")})
    public Result insertAnswer(String hash, Long qid, Long oid) {

        Question question = Ebean.find(Question.class)
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
                Answer answer = new Answer();
                answer.setOption(answeredOption);
                question.setAnswer(answer);
                answer.save();
                question.save();

                return ok(Json.toJson(answer));

            } else {
                Answer answer = question.getAnswer();
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

    private Result listExams(F.Option<String> filter, Collection<String> courseCodes) {
        ExpressionList<Exam> query = Ebean.find(Exam.class)
                .select("id, name, examActiveStartDate, examActiveEndDate, enrollInstruction")
                .fetch("course", "code")
                .fetch("examOwners", "firstName, lastName")
                .fetch("examLanguages", "code, name")
                .fetch("creator", "firstName, lastName")
                .where()
                .eq("state", Exam.State.PUBLISHED.toString())
                .gt("examActiveEndDate", DateTime.now().plusDays(1).withTimeAtStartOfDay().toDate());
        if (!courseCodes.isEmpty()) {
            query.in("course.code", courseCodes);
        }
        if (filter.isDefined() && !filter.get().isEmpty()) {
            String condition = String.format("%%%s%%", filter.get());
            query = query.disjunction()
                    .ilike("name", condition)
                    .ilike("course.code", condition)
                    .ilike("examOwners.firstName", condition)
                    .ilike("examOwners.lastName", condition)
                    .endJunction();
        }
        List<Exam> exams = query.orderBy("course.code").findList();
        return ok(exams);
    }

}
