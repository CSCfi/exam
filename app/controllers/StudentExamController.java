package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import com.fasterxml.jackson.databind.node.ObjectNode;
import exceptions.SitnetException;
import models.*;
import models.answers.EssayAnswer;
import models.answers.MultipleChoiseAnswer;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import models.questions.MultipleChoiceQuestion;
import models.questions.MultipleChoiseOption;
import org.joda.time.DateTime;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.F;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

import java.net.MalformedURLException;
import java.util.*;

public class StudentExamController extends SitnetController {

    private static final boolean PERM_CHECK_ACTIVE = SitnetUtil.isEnrolmentPermissionCheckActive();


    @Restrict({@Group("STUDENT")})
    public static F.Promise<Result> listAvailableExams(final F.Option<String> filter) throws MalformedURLException {
        if (!PERM_CHECK_ACTIVE) {
            return wrapAsPromise(listExams(filter, Collections.<String>emptyList()));
        }
        F.Promise<Collection<String>> promise = Interfaces.getPermittedCourses(UserController.getLoggedUser());
        return promise.map(new F.Function<Collection<String>, Result>() {
            @Override
            public Result apply(Collection<String> codes) throws Throwable {
                return listExams(filter, codes);
            }
        }).recover(new F.Function<Throwable, Result>() {
            @Override
            public Result apply(Throwable throwable) throws Throwable {
                return internalServerError(throwable.getMessage());
            }
        });
    }

    @Restrict({@Group("STUDENT")})
    public static Result getFinishedExams(Long uid) {
        Logger.debug("getFinishedExams()");
        User user = UserController.getLoggedUser();
        String oql = "find exam " +
                "fetch examSections " +
                "fetch course " +
                "where (state=:graded_logged or state=:aborted or state=:review or state=:graded) " +
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
                .fetch("examRecord")
                .fetch("examRecord.examScore")
                .fetch("examSections")
                .fetch("examSections.sectionQuestions")
                .fetch("examSections.sectionQuestions.question")
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
        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, name, grade, examActiveStartDate, examActiveEndDate, duration, gradeScale, " +
                "room, course, creator, examFeedback, gradedByUser, enrollment, totalScore, maxScore, rejectedAnswerCount," +
                "approvedAnswerCount, enrollInstruction, parent, customCredit");
        options.setPathProperties("grade", "name");
        options.setPathProperties("course", "code, name, level, type, credits");
        options.setPathProperties("creator", "firstName, lastName, email");
        options.setPathProperties("examFeedback", "comment");
        options.setPathProperties("gradedByUser", "firstName, lastName");
        options.setPathProperties("parent", "examOwners");
        options.setPathProperties("parent.examOwners", "firstName, lastName");

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
            options.setPathProperties("exam", "id, name, course, hash, duration, state, examLanguage, enrollInstruction, examOwners");
            options.setPathProperties("exam.course", "name, code");
            options.setPathProperties("exam.examOwners", "firstName, lastName");
            options.setPathProperties("reservation", "id, startAt, endAt, machine");
            options.setPathProperties("reservation.machine", "name");
            options.setPathProperties("reservation.machine", "name, room");
            options.setPathProperties("reservation.machine.room", "name, roomCode");

            return ok(jsonContext.toJsonString(enrolment, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("STUDENT")})
    public static Result getEnrolmentsForUser(Long uid) {
        DateTime now = SitnetUtil.adjustDST(new DateTime());
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("user.id", uid)
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

        if (enrolments == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, enrolledOn, user, exam, reservation, information, reservationCanceled");
            options.setPathProperties("user", "id");
            options.setPathProperties("exam", "id, name, course, hash, duration, state, examLanguage, enrollInstruction, examOwners");
            options.setPathProperties("exam.examOwners", "firstName, lastName");
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

    private static Exam getProrotype(String hash) {
        return Ebean.find(Exam.class)
                .fetch("examSections")
                .fetch("examSections.sectionQuestions")
                .fetch("examSections.sectionQuestions.question")
                .where()
                .eq("hash", hash)
                .eq("parent", null)
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
                .findUnique();
    }

    private static Exam getPossibleClone(String hash) {
        return Ebean.find(Exam.class)
                .fetch("examSections")
                .fetch("examSections.sectionQuestions")
                .fetch("examSections.sectionQuestions.question")
                .where()
                .eq("hash", hash)
                .ne("parent", null)
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
                .findUnique();
    }

    private static Exam createNewExam(Exam prototype, User user, ExamEnrolment enrolment) {
        Exam studentExam = prototype.copy();
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

        studentExam.setCloned(true);
        return studentExam;
    }

    private static ExamEnrolment getEnrolment(User user, Exam prototype) {
        DateTime now = SitnetUtil.adjustDST(DateTime.now());
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
        } else if (!enrolment.getReservation().getMachine().getIpAddress().equals(clientIP)) {
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

    private static void setStudentExamContent(JsonWriteOptions options) {

        options.setRootPathProperties("id, name, creator, course, examType, instruction, shared, examSections, hash, examActiveStartDate, examActiveEndDate, room, " +
                "duration, examLanguages, answerLanguage, state, expanded, attachment, cloned, examOwners, examInspections");
        options.setPathProperties("examInspections", "user");
        options.setPathProperties("examInspections.user", "firstName, lastName");
        options.setPathProperties("creator", "id");
        options.setPathProperties("examOwners", "firstName, lastName");
        options.setPathProperties("attachment", "fileName");
        options.setPathProperties("course", "id, code, name, level, type, credits, institutionName, department");
        options.setPathProperties("room", "roomInstruction, roomInstructionEN, roomInstructionSV");
        options.setPathProperties("examType", "id, type");
        options.setPathProperties("examLanguages", "code");
        options.setPathProperties("examSections", "id, name, sectionQuestions, exam, expanded");
        options.setPathProperties("examSections.sectionQuestions", "sequenceNumber, question");
        options.setPathProperties("examSections.sectionQuestions.question", "id, type, question, instruction, " +
                "maxScore, maxCharacters, options, attachment, answer, evaluationType");
        options.setPathProperties("examSections.sectionQuestions.question.answer", "id, type, option, attachment, answer");
        options.setPathProperties("examSections.sectionQuestions.question.answer.option", "id, option");
        options.setPathProperties("examSections.sectionQuestions.question.answer.attachment", "fileName");
        options.setPathProperties("examSections.sectionQuestions.question.attachment", "fileName");
        options.setPathProperties("examSections.sectionQuestions.question.options", "id, option");
        options.setPathProperties("examSections.sectionQuestions.question.comments", "id, comment");
    }

    @Restrict({@Group("STUDENT")})
    public static Result startExam(String hash) throws SitnetException {
        Exam prototype = getProrotype(hash);
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

        JsonContext jsonContext = Ebean.createJsonContext();

        // Create new exam for student
        if (possibleClone == null) {
            User user = UserController.getLoggedUser();
            ExamEnrolment enrolment = getEnrolment(user, prototype);
            Result error = checkEnrolmentOK(enrolment);
            if (error != null) {
                return error;
            }
            // We are good to go (reservation and enrolment OK)
            Exam studentExam = createNewExam(prototype, user, enrolment);
            JsonWriteOptions options = new JsonWriteOptions();
            setStudentExamContent(options);
            return ok(jsonContext.toJsonString(studentExam, true, options)).as("application/json");
        } else {
            // Returning an already existing student exam
            possibleClone.setCloned(false);
            JsonWriteOptions options = new JsonWriteOptions();
            setStudentExamContent(options);
            return ok(jsonContext.toJsonString(possibleClone, true, options)).as("application/json");
        }
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
            p.setEnded(DateTime.now().toDate());
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
            p.setEnded(SitnetUtil.adjustDST(DateTime.now()).toDate());
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

    private static Result listExams(F.Option<String> filter, Collection<String> courseCodes) {
        ExpressionList<Exam> query = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("examOwners")
                .where()
                .eq("state", Exam.State.PUBLISHED.toString())
                .gt("examActiveEndDate", DateTime.now().plusDays(1).withTimeAtStartOfDay().toDate())
                .lt("examActiveStartDate", DateTime.now().withTimeAtStartOfDay().toDate());
        if (!courseCodes.isEmpty()) {
            query.in("course.code", courseCodes);
        }
        if (filter.isDefined() && !filter.get().isEmpty()) {
            String condition = String.format("%%%s%%", filter.get());
            query = query.disjunction()
                    .ilike("name", condition)
                    .ilike("course.code", condition)
                            // Because of https://github.com/ebean-orm/avaje-ebeanorm/issues/37 a disjunction does not work here!
                            // TODO: check if doable after having upgraded to Play 2.4
                            //.ilike("examOwners.firstName", condition)
                            //.ilike("examOwners.lastName", condition)
                    .endJunction();
        }
        Set<Exam> exams = query.findSet();
        if (filter.isDefined() && !filter.get().isEmpty()) {
            exams.addAll(Ebean.find(Exam.class)
                    .fetch("course")
                    .fetch("examOwners")
                    .where()
                    .eq("state", Exam.State.PUBLISHED.toString())
                    .gt("examActiveEndDate", DateTime.now().plusDays(1).withTimeAtStartOfDay().toDate())
                    .lt("examActiveStartDate", DateTime.now().withTimeAtStartOfDay().toDate())
                    .disjunction()
                    .ilike("examOwners.firstName", String.format("%%%s%%", filter.get()))
                    .ilike("examOwners.lastName", String.format("%%%s%%", filter.get()))
                    .endJunction()
                    .findSet());
        }
        List<Exam> examList = new ArrayList<>(exams);
        Collections.sort(examList, new Comparator<Exam>() {
            @Override
            public int compare(Exam o1, Exam o2) {
                return o1.getCourse().getCode().compareTo(o2.getCourse().getCode());
            }
        });

        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, name, course, examActiveStartDate, examActiveEndDate, enrollInstruction, " +
                "creator, examLanguages, examOwners, examInspections");
        options.setPathProperties("examInspections", "id, user");
        options.setPathProperties("examInspections.user", "firstName, lastName");
        options.setPathProperties("course", "code");
        options.setPathProperties("examOwners", "firstName, lastName");
        options.setPathProperties("creator", "firstName, lastName, organization");
        options.setPathProperties("examLanguages", "code, name");
        return ok(Ebean.createJsonContext().toJsonString(exams, true, options)).as("application/json");
    }

}
