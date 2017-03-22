package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.PathProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import controllers.api.ExternalAPI;
import controllers.base.ActionMethod;
import controllers.base.BaseController;
import models.*;
import models.questions.ClozeTestAnswer;
import models.questions.EssayAnswer;
import models.questions.Question;
import org.joda.time.DateTime;
import play.Environment;
import play.Logger;
import play.data.DynamicForm;
import play.db.ebean.Transactional;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import security.interceptors.SensitiveDataPolicy;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@SensitiveDataPolicy(sensitiveFieldNames = {"score", "defaultScore", "correctOption"})
@Restrict({@Group("STUDENT")})
public class StudentExamController extends BaseController {

    @Inject
    protected ExternalAPI externalAPI;
    @Inject
    protected EmailComposer emailComposer;
    @Inject
    protected ActorSystem actor;
    @Inject
    protected Environment environment;


    @ActionMethod
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
                processClozeTestQuestions(newExam);
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
            processClozeTestQuestions(possibleClone);
            return ok(possibleClone, getPath());
        }
    }

    @ActionMethod
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
                            () -> emailComposer.composeInspectionReady(student, null, exam, Collections.emptySet()),
                            actor.dispatcher());
                    Logger.debug("Mail sent about automatic evaluation to {}", student.getEmail());
                }
            }
            return ok("Exam sent for review");
        } else {
            return ok("exam already returned");
        }
    }

    @ActionMethod
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

    @ActionMethod
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
            } else if (df.get("objectVersion") != null) {
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

    @ActionMethod
    public Result answerMultiChoice(String hash, Long qid) {
        return getEnrolmentError(hash).orElseGet(() -> {
            ArrayNode node = (ArrayNode) request().body().asJson().get("oids");
            List<Long> optionIds = StreamSupport.stream(node.spliterator(), false)
                    .map(JsonNode::asLong)
                    .collect(Collectors.toList());
            ExamSectionQuestion question =
                    Ebean.find(ExamSectionQuestion.class, qid);
            if (question == null) {
                return forbidden();
            }
            question.getOptions().forEach(o -> {
                o.setAnswered(optionIds.contains(o.getId()));
                o.update();
            });
            return ok();
        });
    }

    @ActionMethod
    public Result answerClozeTest(String hash, Long questionId) {
        return getEnrolmentError(hash).orElseGet(() -> {
            ExamSectionQuestion esq = Ebean.find(ExamSectionQuestion.class, questionId);
            if (esq == null) {
                return forbidden();
            }
            JsonNode node = request().body().asJson();
            ClozeTestAnswer answer = esq.getClozeTestAnswer();
            if (answer == null) {
                answer = new ClozeTestAnswer();
            } else {
                long objectVersion = node.get("objectVersion").asLong();
                answer.setObjectVersion(objectVersion);
            }
            answer.setAnswer(node.get("answer").toString());
            answer.save();
            return ok(answer, PathProperties.parse("(id, objectVersion, answer)"));
        });
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
                        "question(id, type, question, attachment(id, fileName))" +
                        "options(id, answered, option(id, option))" +
                        "essayAnswer(id, answer, objectVersion, attachment(fileName))" +
                        "clozeTestAnswer(id, question, answer, objectVersion)" +
                        ")))");
    }

    private static Query<Exam> createQuery() {
        Query<Exam> query = Ebean.find(Exam.class);
        PathProperties props = getPath();
        props.apply(query);
        return query;
    }

    private void processClozeTestQuestions(Exam exam) {
        Set<Question> questionsToHide = new HashSet<>();
        exam.getExamSections().stream()
                .flatMap(es -> es.getSectionQuestions().stream())
                .filter(esq -> esq.getQuestion().getType() == Question.Type.ClozeTestQuestion)
                .forEach( esq -> {
                    ClozeTestAnswer answer = esq.getClozeTestAnswer();
                    if (answer == null) {
                        answer = new ClozeTestAnswer();
                    }
                    answer.setQuestion(esq);
                    esq.setClozeTestAnswer(answer);
                    esq.update();
                    questionsToHide.add(esq.getQuestion());
                });
        questionsToHide.forEach(q -> q.setQuestion(null));
    }


    private Optional<Result> getEnrolmentError(String hash) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                .eq("exam.hash", hash)
                .eq("exam.creator", getLoggedUser())
                .eq("exam.state", Exam.State.STUDENT_STARTED)
                .findUnique();
        return getEnrolmentError(enrolment);
    }

    private Grade getGradeBasedOnScore(Exam exam) {
        Double totalScore = exam.getTotalScore();
        Double maxScore = exam.getMaxScore();
        Double percentage = maxScore == 0 ? 0 : totalScore * 100 / maxScore;
        List<GradeEvaluation> gradeEvaluations = new ArrayList<>(exam.getAutoEvaluationConfig().getGradeEvaluations());
        gradeEvaluations.sort(Comparator.comparingInt(GradeEvaluation::getPercentage));
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
                // Highest possible grade
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
