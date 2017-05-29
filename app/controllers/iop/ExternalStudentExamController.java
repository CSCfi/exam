package controllers.iop;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.PathProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import controllers.StudentExamController;
import controllers.base.ActionMethod;
import models.Exam;
import models.ExamEnrolment;
import models.ExamSectionQuestion;
import models.User;
import models.json.ExternalExam;
import models.questions.ClozeTestAnswer;
import models.questions.EssayAnswer;
import org.joda.time.DateTime;
import play.data.DynamicForm;
import play.mvc.Result;
import play.mvc.Results;
import system.interceptors.SensitiveDataPolicy;
import util.AppUtil;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@SensitiveDataPolicy(sensitiveFieldNames = {"score", "defaultScore", "correctOption"})
@Restrict({@Group("STUDENT")})
public class ExternalStudentExamController extends StudentExamController {

    @ActionMethod
    @Override
    public Result startExam(String hash) throws IOException {
        User user = getLoggedUser();
        Optional<ExternalExam> optional = getExternalExam(hash);
        if (!optional.isPresent()) {
            return forbidden();
        }
        ExternalExam externalExam = optional.get();
        Optional<ExamEnrolment> optionalEnrolment = getEnrolment(user, externalExam);
        if (!optionalEnrolment.isPresent()) {
            return forbidden();
        }
        ExamEnrolment enrolment = optionalEnrolment.get();
        Exam newExam = externalExam.deserialize();
        return getEnrolmentError(optionalEnrolment.get()).orElseGet(() -> {
            if (newExam.getState().equals(Exam.State.PUBLISHED)) {
                newExam.setState(Exam.State.STUDENT_STARTED);
                try {
                    externalExam.serialize(newExam);
                } catch (IOException e) {
                    return internalServerError();
                }
                DateTime now = AppUtil.adjustDST(DateTime.now(), enrolment.getReservation().getMachine().getRoom());
                externalExam.setStarted(now);
                externalExam.update();
            }
            newExam.setCloned(false);
            newExam.setDerivedMaxScores();
            processClozeTestQuestions(newExam);
            return ok(newExam, getPath(false));
        });
    }

    @ActionMethod
    @Override
    public Result turnExam(String hash) {
        return terminateExam(hash, Exam.State.REVIEW);
    }

    @ActionMethod
    @Override
    public Result abortExam(String hash) {
        return terminateExam(hash, Exam.State.ABORTED);
    }

    @ActionMethod
    @Override
    public Result answerMultiChoice(String hash, Long qid) {
        return getEnrolmentError(hash).orElseGet(() -> {
            Optional<ExternalExam> optional = getExternalExam(hash);
            if (!optional.isPresent()) {
                return forbidden();
            }
            ExternalExam ee = optional.get();
            ArrayNode node = (ArrayNode) request().body().asJson().get("oids");
            List<Long> optionIds = StreamSupport.stream(node.spliterator(), false)
                    .map(JsonNode::asLong)
                    .collect(Collectors.toList());
            Optional<ExamSectionQuestion> question;
            Exam content;
            try {
                content = ee.deserialize();
                question = findQuestion(qid, content);
            } catch (IOException e) {
                return internalServerError();
            }
            return question
                    .map(q -> processOptions(optionIds, q, ee, content))
                    .orElseGet(Results::forbidden);
        });
    }

    @ActionMethod
    @Override
    public Result answerEssay(String hash, Long qid) {
        return getEnrolmentError(hash).orElseGet(() -> {
            Optional<ExternalExam> optional = getExternalExam(hash);
            if (!optional.isPresent()) {
                return forbidden();
            }
            ExternalExam ee = optional.get();
            DynamicForm df = formFactory.form().bindFromRequest();
            String essayAnswer = df.get("answer");

            Optional<ExamSectionQuestion> optionalQuestion;
            Exam content;
            try {
                content = ee.deserialize();
                optionalQuestion = findQuestion(qid, content);
            } catch (IOException e) {
                return internalServerError();
            }
            if (!optionalQuestion.isPresent()) {
                return forbidden();
            }
            ExamSectionQuestion question = optionalQuestion.get();
            EssayAnswer answer = question.getEssayAnswer();
            if (answer == null) {
                answer = new EssayAnswer();
            } else if (df.get("objectVersion") != null) {
                long objectVersion = Long.parseLong(df.get("objectVersion"));
                if (answer.getObjectVersion() > objectVersion) {
                    // Optimistic locking problem
                    return forbidden("sitnet_error_data_has_changed");
                }
                answer.setObjectVersion(objectVersion + 1);
            }
            answer.setAnswer(essayAnswer);
            question.setEssayAnswer(answer);
            try {
                ee.serialize(content);
            } catch (IOException e) {
                return internalServerError();
            }
            return ok(answer);
        });
    }

    @ActionMethod
    @Override
    public Result answerClozeTest(String hash, Long qid) {
        return getEnrolmentError(hash).orElseGet(() -> {
            Optional<ExternalExam> optional = getExternalExam(hash);
            if (!optional.isPresent()) {
                return forbidden();
            }
            ExternalExam ee = optional.get();
            Optional<ExamSectionQuestion> optionalQuestion;
            Exam content;
            try {
                content = ee.deserialize();
                optionalQuestion = findQuestion(qid, content);
            } catch (IOException e) {
                return internalServerError();
            }
            if (!optionalQuestion.isPresent()) {
                return forbidden();
            }
            ExamSectionQuestion esq = optionalQuestion.get();
            JsonNode node = request().body().asJson();
            ClozeTestAnswer answer = esq.getClozeTestAnswer();
            if (answer == null) {
                answer = new ClozeTestAnswer();
                esq.setClozeTestAnswer(answer);
            } else {
                long objectVersion = node.get("objectVersion").asLong();
                if (answer.getObjectVersion() > objectVersion) {
                    // Optimistic locking problem
                    return forbidden("sitnet_error_data_has_changed");
                }
                answer.setObjectVersion(objectVersion + 1);
            }
            answer.setAnswer(node.get("answer").toString());
            try {
                ee.serialize(content);
            } catch (IOException e) {
                return internalServerError();
            }
            return ok(answer, PathProperties.parse("(id, objectVersion, answer)"));
        });
    }

    private Optional<ExamSectionQuestion> findQuestion(Long qid, Exam content) throws IOException {
        return content.getExamSections().stream()
                .flatMap(es -> es.getSectionQuestions().stream())
                .filter(esq -> esq.getId().equals(qid))
                .findFirst();
    }

    private Result processOptions(List<Long> oids, ExamSectionQuestion esq, ExternalExam ee, Exam content) {
        esq.getOptions().forEach(o -> o.setAnswered(oids.contains(o.getId())));
        try {
            ee.serialize(content);
        } catch (IOException e) {
            return internalServerError();
        }
        return ok();
    }

    private Optional<ExternalExam> getExternalExam(String hash) {
        return Optional.ofNullable(Ebean.find(ExternalExam.class, hash));
    }

    private Optional<ExamEnrolment> getEnrolment(User user, ExternalExam prototype) {
        DateTime now = AppUtil.adjustDST(DateTime.now());
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("user.id", user.getId())
                .eq("externalExam.hash", prototype.getHash())
                .le("reservation.startAt", now.toDate())
                .gt("reservation.endAt", now.toDate())
                .eq("reservation.externalUserRef", user.getEppn())
                .findUnique();
        return Optional.ofNullable(enrolment);
    }

    private Optional<Result> getEnrolmentError(String hash) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                .eq("externalExam.hash", hash)
                .eq("externalExam.creator", getLoggedUser())
                .jsonEqualTo("externalExam.content", "state", Exam.State.STUDENT_STARTED.toString())
                .findUnique();
        return getEnrolmentError(enrolment);
    }

    private Result terminateExam(String hash, Exam.State newState) {
        User user = getLoggedUser();
        ExternalExam ee = Ebean.find(ExternalExam.class).where().idEq(hash).eq("creator", user).findUnique();
        if (ee == null) {
            return forbidden();
        }
        Optional<ExamEnrolment> optionalEnrolment = getEnrolment(user, ee);
        if (!optionalEnrolment.isPresent()) {
            return forbidden();
        }
        ExamEnrolment enrolment = optionalEnrolment.get();
        DateTime now = AppUtil.adjustDST(DateTime.now(), enrolment.getReservation().getMachine().getRoom());
        ee.setFinished(now);
        try {
            Exam content = ee.deserialize();
            if (content.getState().equals(Exam.State.STUDENT_STARTED)) {
                content.setState(newState);
            }
            ee.serialize(content);
        } catch (IOException e) {
            return internalServerError();
        }
        return ok();
    }

}
