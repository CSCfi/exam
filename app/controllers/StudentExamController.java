package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.FetchConfig;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.PathProperties;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import models.questions.EssayAnswer;
import org.joda.time.DateTime;
import play.Environment;
import play.Logger;
import play.data.DynamicForm;
import play.db.ebean.Transactional;
import play.libs.Json;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.net.MalformedURLException;
import java.util.*;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

public class StudentExamController extends BaseController {

    private static final boolean PERM_CHECK_ACTIVE = AppUtil.isEnrolmentPermissionCheckActive();

    @Inject
    protected ExternalAPI externalAPI;
    @Inject
    protected EmailComposer emailComposer;
    @Inject
    protected ActorSystem actor;
    @Inject
    protected Environment environment;


    @Restrict({@Group("STUDENT")})
    public CompletionStage<Result> listAvailableExams(final Optional<String> filter) throws MalformedURLException {
        if (!PERM_CHECK_ACTIVE) {
            return wrapAsPromise(listExams(filter.orElse(null), Collections.emptyList()));
        }
        return externalAPI.getPermittedCourses(getLoggedUser())
                .thenApplyAsync(codes ->
                        {
                            if (codes.isEmpty()) {
                                return ok(Json.toJson(Collections.<Exam>emptyList()));
                            } else {
                                return listExams(filter.orElse(null), codes);
                            }
                        }
                ).exceptionally(throwable -> internalServerError(throwable.getMessage()));
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
                .conjunction()
                .eq("state", Exam.State.GRADED)
                .isNotNull("autoEvaluationConfig")
                .isNotNull("autoEvaluationNotified")
                .endJunction()
                .endJunction()
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        exam.setMaxScore();
        exam.setApprovedAnswerCount();
        exam.setRejectedAnswerCount();
        exam.setTotalScore();
        PathProperties pp = PathProperties.parse("(*)");
        return ok(exam, pp);
    }

    @Restrict({@Group("STUDENT")})
    public Result getExamFeedback(Long id) {

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
                .conjunction()
                .eq("state", Exam.State.GRADED)
                .isNotNull("autoEvaluationConfig")
                .isNotNull("autoEvaluationNotified")
                .endJunction()
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
        Exam studentExam = prototype.copyForStudent(user);
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

    private Optional<Result> getEnrolmentError(ExamEnrolment enrolment) {
        // If this is null, it means someone is either trying to access an exam by wrong hash
        // or the reservation is not in effect right now.
        if (enrolment == null) {
            return Optional.of(forbidden("sitnet_reservation_not_found"));
        }
        String clientIP = request().remoteAddress();
        // Exam and enrolment found. Is student on the right machine?
        if (enrolment.getReservation() == null) {
            return Optional.of(forbidden("sitnet_reservation_not_found"));
        } else if (enrolment.getReservation().getMachine() == null) {
            return Optional.of(forbidden("sitnet_reservation_machine_not_found"));
        } else if (!environment.isDev() && !enrolment.getReservation().getMachine().getIpAddress().equals(clientIP)) {
            ExamRoom examRoom = Ebean.find(ExamRoom.class)
                    .fetch("mailAddress")
                    .where()
                    .eq("id", enrolment.getReservation().getMachine().getRoom().getId())
                    .findUnique();
            if (examRoom == null) {
                return Optional.of(notFound());
            }
            String message = "sitnet_wrong_exam_machine " + examRoom.getName()
                    + ", " + examRoom.getMailAddress().toString()
                    + ", sitnet_exam_machine " + enrolment.getReservation().getMachine().getName();
            return Optional.of(forbidden(message));
        }
        return Optional.empty();
    }

    private static PathProperties getPath() {
        return PathProperties.parse(
                "(id, name, instruction, hash, duration, cloned, course(id, code, name), executionType(id, type), " + // (
                        "examLanguages(code), attachment(fileName), examOwners(firstName, lastName)" +
                        "examInspections(user(firstName, lastName))" +
                        "examSections(id, name, sequenceNumber, description, " + // ((
                        "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, " + // (((
                        "question(id, type, question, attachment(fileName))" +
                        "options(id, answered, option(id, option))" +
                        "essayAnswer(id, answer, objectVersion, attachment(fileName))" +
                        ")))");
    }

    private static Query<Exam> createQuery() {
        Query<Exam> query = Ebean.find(Exam.class);
        PathProperties props = getPath();
        props.apply(query);
        return query;
    }

    @Restrict({@Group("STUDENT")})
    @Transactional
    public Result startExam(String hash) {
        User user = getLoggedUser();
        Exam prototype = getPrototype(hash);
        Exam possibleClone = getPossibleClone(hash, user);
        // no exam found for hash
        if (prototype == null && possibleClone == null) {
            return notFound();
        }
        // Exam not started yet, create new exam for student
        if (possibleClone == null) {
            ExamEnrolment enrolment = getEnrolment(user, prototype);
            return getEnrolmentError(enrolment).orElseGet(() -> {
                Exam newExam = createNewExam(prototype, user, enrolment);
                newExam.setCloned(true);
                newExam.setDerivedMaxScores();
                return ok(newExam, getPath());
            });
        } else {
            // Exam started already
            // sanity check
            if (possibleClone.getState() != Exam.State.STUDENT_STARTED) {
                return forbidden();
            }
            possibleClone.setCloned(false);
            possibleClone.setDerivedMaxScores();
            return ok(possibleClone, getPath());
        }
    }

    @Restrict({@Group("STUDENT")})
    @Transactional
    public Result turnExam(String hash) {
        User user = getLoggedUser();
        Exam exam = Ebean.find(Exam.class)
                .fetch("examSections.sectionQuestions.question")
                .where()
                .eq("creator", user)
                .eq("hash", hash)
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
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
            AutoEvaluationConfig config = exam.getAutoEvaluationConfig();
            if (config != null) {
                // Grade automatically
                autoEvaluate(exam);
                if (config.getReleaseType() == AutoEvaluationConfig.ReleaseType.IMMEDIATE) {
                    // Notify student immediately
                    exam.setAutoEvaluationNotified(new Date());
                    exam.update();
                    User student = exam.getCreator();
                    actor.scheduler().scheduleOnce(Duration.create(5, TimeUnit.SECONDS),
                            () -> emailComposer.composeInspectionReady(student, null, exam),
                            actor.dispatcher());
                    Logger.debug("Mail sent about automatic evaluation to {}", student.getEmail());
                }
            }
            return ok("Exam sent for review");
        } else {
            return forbidden("exam already returned");
        }
    }

    @Restrict({@Group("STUDENT")})
    @Transactional
    public Result abortExam(String hash) {
        User user = getLoggedUser();
        Exam exam = Ebean.find(Exam.class).where().eq("creator", user).eq("hash", hash).findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
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

    private Optional<Result> getEnrolmentError(String hash) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                .eq("exam.hash", hash)
                .eq("exam.creator", getLoggedUser())
                .eq("exam.state", Exam.State.STUDENT_STARTED)
                .findUnique();
        return getEnrolmentError(enrolment);
    }

    @Restrict({@Group("STUDENT")})
    public Result answerEssay(String hash, Long questionId) {
        return getEnrolmentError(hash).orElseGet(() -> {
            DynamicForm df = formFactory.form().bindFromRequest();
            String essayAnswer = df.get("answer");
            ExamSectionQuestion question = Ebean.find(ExamSectionQuestion.class, questionId);
            if (question == null) {
                return forbidden();
            }
            EssayAnswer answer = question.getEssayAnswer();
            if (answer == null) {
                answer = new EssayAnswer();
            } else {
                long objectVersion = Long.parseLong(df.get("objectVersion"));
                answer.setObjectVersion(objectVersion);
            }
            answer.setAnswer(essayAnswer);
            answer.save();
            question.setEssayAnswer(answer);
            question.save();
            return ok(answer);
        });
    }

    @Restrict({@Group("STUDENT")})
    public Result answerMultiChoice(String hash, Long qid) {
        return getEnrolmentError(hash).orElseGet(() -> {
            ArrayNode node = (ArrayNode) request().body().asJson().get("oids");
            List<Long> optionIds = new ArrayList<>();
            node.forEach(n -> optionIds.add(n.asLong()));
            ExamSectionQuestion question =
                    Ebean.find(ExamSectionQuestion.class, qid);
            if (question == null) {
                return forbidden();
            }
            question.getOptions().forEach(o -> {
                o.setAnswered(optionIds.contains(o.getId()));
                o.update();
            });
            PathProperties pp = PathProperties.parse("(id, answered, option(id, option))");
            return ok(question.getOptions(), pp);
        });
    }

    private Result listExams(String filter, Collection<String> courseCodes) {
        ExpressionList<Exam> query = Ebean.find(Exam.class)
                .select("id, name, examActiveStartDate, examActiveEndDate, enrollInstruction")
                .fetch("course", "code")
                .fetch("examOwners", "firstName, lastName")
                .fetch("examInspections.user", "firstName, lastName")
                .fetch("examLanguages", "code, name", new FetchConfig().query())
                .fetch("creator", "firstName, lastName")
                .where()
                .eq("state", Exam.State.PUBLISHED)
                .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString())
                .gt("examActiveEndDate", DateTime.now().toDate());
        if (!courseCodes.isEmpty()) {
            query.in("course.code", courseCodes);
        }
        if (filter != null) {
            String condition = String.format("%%%s%%", filter);
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

    private Grade getGradeBasedOnScore(Exam exam) {
        Double totalScore = exam.getTotalScore();
        Double maxScore = exam.getMaxScore();
        Double percentage = maxScore == 0 ? 0 : totalScore * 100 / maxScore;
        List<GradeEvaluation> gradeEvaluations = new ArrayList<>(exam.getAutoEvaluationConfig().getGradeEvaluations());
        gradeEvaluations.sort((o1, o2) -> o1.getPercentage() - o2.getPercentage());
        Grade grade = null;
        Iterator<GradeEvaluation> it = gradeEvaluations.iterator();
        GradeEvaluation prev = null;
        while (it.hasNext()) {
            GradeEvaluation ge = it.next();
            int threshold = 0;
            if (ge.getPercentage() > percentage) {
                // Grade falls short of threshold
                grade = prev == null ? ge.getGrade() : prev.getGrade();
                threshold = prev == null ? ge.getPercentage() : prev.getPercentage();
            }
            else if (!it.hasNext()) {
                // Top grade
                grade = ge.getGrade();
                threshold = ge.getPercentage();
            }
            if (grade != null) {
                Logger.info("Automatically grading exam #{}, {}/{} points ({}%) graded as {} using percentage threshold {}",
                        exam.getId(), totalScore, maxScore, percentage, grade.getName(), threshold);
                break;
            }
            prev = ge;
        }
        if (!exam.getGradeScale().getGrades().contains(grade)) {
            throw new RuntimeException("Grade in auto evaluation configuration not found in exam grade scale!");
        }
        return grade;
    }

    private void autoEvaluate(Exam exam) {
        Grade grade = getGradeBasedOnScore(exam);
        if (grade != null) {
            exam.setGrade(grade);
            exam.setGradedTime(new Date());
            exam.setCreditType(exam.getExamType());
            // NOTE: do not set graded by person here, one who makes a record will get the honor
            if (!exam.getExamLanguages().isEmpty()) {
                exam.setAnswerLanguage(exam.getExamLanguages().get(0).getCode());
            } else {
                throw new RuntimeException("No exam language found!");
            }
            exam.setState(Exam.State.GRADED);
            exam.update();
        }
    }

    private void notifyTeachers(Exam exam) {
        Set<User> recipients = new HashSet<>();
        recipients.addAll(exam.getParent().getExamOwners());
        recipients.addAll(exam.getExamInspections().stream().map(
                ExamInspection::getUser).collect(Collectors.toSet()));
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS),
                () -> AppUtil.notifyPrivateExamEnded(recipients, exam, emailComposer),
                actor.dispatcher());
    }

}
