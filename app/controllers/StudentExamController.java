package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.Query;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import models.questions.Answer;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import org.joda.time.DateTime;
import play.Play;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.F;
import play.libs.Json;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.net.MalformedURLException;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class StudentExamController extends BaseController {

    private static final boolean PERM_CHECK_ACTIVE = AppUtil.isEnrolmentPermissionCheckActive();

    @Inject
    protected ExternalAPI externalAPI;
    @Inject
    protected EmailComposer emailComposer;
    @Inject
    protected ActorSystem actor;


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
    public Result getExam(Long eid) {
        Exam exam = Ebean.find(Exam.class).fetch("course", "code")
                .where()
                .idEq(eid)
                .eq("state", Exam.State.PUBLISHED)
                .eq("examEnrolments.user", getLoggedUser())
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        return ok(exam);
    }


    @Restrict({@Group("STUDENT")})
    public Result getFinishedExams() {
        User user = getLoggedUser();
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .select("ended")
                .fetch("exam", "id, state, name")
                .fetch("exam.creator", "id")
                .fetch("exam.course", "code")
                .fetch("exam.parent.examOwners", "firstName, lastName, id")
                .fetch("exam.examInspections.user", "firstName, lastName, id")
                .where()
                .isNotNull("exam.parent")
                .ne("exam.state", Exam.State.STUDENT_STARTED)
                .ne("exam.state", Exam.State.ABORTED)
                .ne("exam.state", Exam.State.DELETED)
                .eq("exam.creator", user)
                .findList();
        return ok(participations);
    }

    @Restrict({@Group("STUDENT")})
    public Result getExamScore(Long eid) {
        Exam exam = Ebean.find(Exam.class)
                .fetch("examSections.sectionQuestions.question")
                .where()
                .eq("id", eid)
                .eq("creator", getLoggedUser())
                .disjunction()
                .eq("state", Exam.State.GRADED_LOGGED)
                .eq("state", Exam.State.ARCHIVED)
                .endJunction()
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
    public Result getExamGeneralInfo(Long id) {

        Exam exam = Ebean.find(Exam.class)
                .fetch("creator", "firstName, lastName, email")
                .fetch("course", "code, name, credits")
                .fetch("grade")
                .fetch("gradeScale")
                .fetch("executionType")
                .fetch("examFeedback")
                .fetch("examFeedback.attachment")
                .fetch("gradedByUser", "firstName, lastName")
                .fetch("examInspections.user", "firstName, lastName")
                .fetch("parent.examOwners", "firstName, lastName")
                .fetch("languageInspection.statement")
                .fetch("languageInspection.statement.attachment")
                .where()
                .eq("id", id)
                .eq("creator", getLoggedUser())
                .disjunction()
                .eq("state", Exam.State.REJECTED)
                .eq("state", Exam.State.GRADED_LOGGED)
                .eq("state", Exam.State.ARCHIVED)
                .endJunction()
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        return ok(exam);
    }

    @Restrict({@Group("STUDENT")})
    public Result getEnrolment(Long eid) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("exam.course", "name, code")
                .fetch("exam.examOwners", "firstName, lastName")
                .fetch("exam.examInspections.user", "firstName, lastName")
                .fetch("user", "id")
                .fetch("reservation", "startAt, endAt")
                .fetch("reservation.machine", "name")
                .fetch("reservation.machine.room", "name, roomCode, localTimezone")
                .where()
                .idEq(eid)
                .eq("user", getLoggedUser())
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
                .fetch("exam.executionType")
                .fetch("exam.course", "name, code")
                .fetch("exam.examLanguages")
                .fetch("exam.examOwners", "firstName, lastName")
                .fetch("exam.examInspections.user", "firstName, lastName")
                .fetch("reservation", "startAt, endAt")
                .fetch("reservation.machine", "name")
                .fetch("reservation.machine.room", "name, roomCode, localTimezone")
                .where()
                .eq("user", user)
                .gt("exam.examActiveEndDate", now.toDate())
                .disjunction()
                .gt("reservation.endAt", now.toDate())
                .isNull("reservation")
                .endJunction()
                .disjunction()
                .eq("exam.state", Exam.State.PUBLISHED)
                .eq("exam.state", Exam.State.STUDENT_STARTED)
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
                .isNull("parent")
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
                .findUnique();
    }

    private static Exam getPossibleClone(String hash, User user) {
        return createQuery().where()
                .eq("hash", hash)
                .eq("creator", user)
                .isNotNull("parent")
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
                .findUnique();
    }

    private static Exam createNewExam(Exam prototype, User user, ExamEnrolment enrolment) {
        Exam studentExam = prototype.copy(user, true);
        studentExam.setState(Exam.State.STUDENT_STARTED);
        studentExam.setCreator(user);
        studentExam.setParent(prototype);
        studentExam.generateHash();
        studentExam.save();

        enrolment.setExam(studentExam);
        enrolment.save();

        ExamParticipation examParticipation = new ExamParticipation();
        examParticipation.setUser(user);
        examParticipation.setExam(studentExam);
        examParticipation.setReservation(enrolment.getReservation());
        DateTime now = AppUtil.adjustDST(DateTime.now(), enrolment.getReservation().getMachine().getRoom());
        examParticipation.setStarted(now.toDate());
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
                .fetch("course", "id, code, name, credits, institutionName, department")
                .fetch("examType", "id, type")
                .fetch("executionType")
                .fetch("examSections", "id, name")
                .fetch("examSections.sectionQuestions", "sequenceNumber")
                .fetch("examSections.sectionQuestions.question", "id, type, question, instruction, maxScore, maxCharacters, evaluationType, expanded")
                .fetch("examSections.sectionQuestions.question.options", "id, option")
                .fetch("examSections.sectionQuestions.question.attachment", "fileName")
                .fetch("examSections.sectionQuestions.question.answer", "id, type, answer, objectVersion")
                .fetch("examSections.sectionQuestions.question.answer.options", "id, option")
                .fetch("examSections.sectionQuestions.question.answer.attachment", "fileName")
                .fetch("examLanguages", "code")
                .fetch("attachment", "fileName")
                .fetch("examOwners", "firstName, lastName")
                .fetch("examInspections.user", "firstName, lastName");
    }

    @Restrict({@Group("STUDENT")})
    public Result startExam(String hash) {
        User user = getLoggedUser();
        Exam prototype = getPrototype(hash);
        Exam possibleClone = getPossibleClone(hash, user);
        // no exam found for hash
        if (prototype == null && possibleClone == null) {
            return notFound();
        }
        // exam has been started
        if (possibleClone != null) {
            Exam.State state = possibleClone.getState();
            // sanity check
            if (state != Exam.State.STUDENT_STARTED) {
                return forbidden();
            }
        }

        // Create new exam for student
        if (possibleClone == null) {
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
    public Result turnExam(String hash) {
        User user = getLoggedUser();
        Exam exam = Ebean.find(Exam.class).where().eq("creator", user).eq("hash", hash).findUnique();

        ExamParticipation p = Ebean.find(ExamParticipation.class)
                .where()
                .eq("exam.id", exam.getId())
                .eq("user", user)
                .isNull("ended")
                .findUnique();

        if (p != null) {
            DateTime now = AppUtil.adjustDST(DateTime.now(), p.getReservation().getMachine().getRoom());
            p.setEnded(now.toDate());
            p.setDuration(new Date(p.getEnded().getTime() - p.getStarted().getTime()));

            GeneralSettings settings = SettingsController.getOrCreateSettings("review_deadline", null, "14");
            int deadlineDays = Integer.parseInt(settings.getValue());
            Date deadline = new DateTime(p.getEnded()).plusDays(deadlineDays).toDate();
            p.setDeadline(deadline);
            p.save();
            exam.setState(Exam.State.REVIEW);
            exam.update();
            if (exam.isPrivate()) {
                notifyTeachers(exam);
            }
            return ok("Exam sent for review");
        } else {
            return forbidden("exam already returned");
        }
    }

    @Restrict({@Group("STUDENT")})
    public Result abortExam(String hash) {
        User user = getLoggedUser();
        Exam exam = Ebean.find(Exam.class).where().eq("creator", user).eq("hash", hash).findUnique();

        ExamParticipation p = Ebean.find(ExamParticipation.class)
                .where()
                .eq("exam.id", exam.getId())
                .eq("user", user)
                .isNull("ended")
                .findUnique();

        if (p != null) {
            DateTime now = AppUtil.adjustDST(DateTime.now(), p.getReservation().getMachine().getRoom());
            p.setEnded(now.toDate());
            p.setDuration(new Date(p.getEnded().getTime() - p.getStarted().getTime()));
            p.save();
            exam.setState(Exam.State.ABORTED);
            exam.update();
            if (exam.isPrivate()) {
                notifyTeachers(exam);
            }
            return ok("Exam aborted");
        } else {
            return forbidden("Exam already returned");
        }
    }

    private Result checkEnrolment(String hash) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                .eq("exam.hash", hash)
                .eq("exam.creator", getLoggedUser())
                .eq("exam.state", Exam.State.STUDENT_STARTED)
                .findUnique();
        return checkEnrolmentOK(enrolment);
    }

    @Restrict({@Group("STUDENT")})
    public Result answerEssay(String hash, Long questionId) {
        Result failure = checkEnrolment(hash);
        if (failure != null) {
            return failure;
        }
        DynamicForm df = Form.form().bindFromRequest();
        String essayAnswer = df.get("answer");
        Question question = Ebean.find(Question.class, questionId);
        if (question == null) {
            return forbidden();
        }

        Answer answer = question.getAnswer();
        if (answer == null) {
            answer = new Answer();
            answer.setType(Answer.Type.EssayAnswer);
        } else {
            long objectVersion = Long.parseLong(df.get("objectVersion"));
            answer.setObjectVersion(objectVersion);
        }
        answer.setAnswer(essayAnswer);
        answer.save();

        question.setAnswer(answer);
        question.save();
        return ok(answer);
    }

    @Restrict({@Group("STUDENT")})
    public Result answerMultiChoice(String hash, Long qid, String oids) {
        Result failure = checkEnrolment(hash);
        if (failure != null) {
            return failure;
        }
        List<Long> optionIds;
        if (oids.equals("none")) { // not so elegant but will do for now
            optionIds = new ArrayList<>();
        } else {
            optionIds = Stream.of(oids.split(",")).map(Long::parseLong).collect(Collectors.toList());
        }
        Question question = Ebean.find(Question.class).fetch("answer").where().idEq(qid).findUnique();
        if (question == null) {
            return forbidden();
        }
        Answer answer = question.getAnswer();
        if (answer == null) {
            answer = new Answer();
            answer.setType(question.getType());
            answer.save();
            question.setAnswer(answer);
            question.update();
        }
        answer.getOptions().stream().forEach(o -> {
            o.setAnswer(null);
            o.update();
        });
        List<MultipleChoiceOption> options = optionIds.isEmpty()
                ? new ArrayList<>() : Ebean.find(MultipleChoiceOption.class).where().idIn(optionIds).findList();
        for (MultipleChoiceOption o : options) {
            o.setAnswer(answer);
            o.save();
        }
        answer.getOptions().clear();
        answer.getOptions().addAll(options);
        return ok(Json.toJson(answer));
    }

    private Result listExams(F.Option<String> filter, Collection<String> courseCodes) {
        ExpressionList<Exam> query = Ebean.find(Exam.class)
                .select("id, name, examActiveStartDate, examActiveEndDate, enrollInstruction")
                .fetch("course", "code")
                .fetch("examOwners", "firstName, lastName")
                .fetch("examInspections.user", "firstName, lastName")
                .fetch("examLanguages", "code, name")
                .fetch("creator", "firstName, lastName")
                .where()
                .eq("state", Exam.State.PUBLISHED)
                .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString())
                .gt("examActiveEndDate", DateTime.now().toDate());
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

    private void notifyTeachers(Exam exam) {
        Set<User> recipients = new HashSet<>();
        recipients.addAll(exam.getParent().getExamOwners());
        recipients.addAll(exam.getExamInspections().stream().map(
                ExamInspection::getUser).collect(Collectors.toSet()));
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            AppUtil.notifyPrivateExamEnded(recipients, exam, emailComposer);
        }, actor.dispatcher());
    }

}
