package controllers.iop;

import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import io.ebean.Ebean;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import io.ebean.text.json.EJson;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.typesafe.config.ConfigFactory;
import controllers.SettingsController;
import controllers.StudentExamController;
import controllers.base.BaseController;
import controllers.iop.api.ExternalExamAPI;
import models.*;
import models.json.ExternalExam;
import models.questions.Question;
import org.joda.time.DateTime;
import org.springframework.beans.BeanUtils;
import play.db.ebean.Transactional;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;
import util.AppUtil;
import util.java.AutoEvaluationHandler;
import util.java.JsonDeserializer;
import util.java.NoShowHandler;

import javax.inject.Inject;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;


public class ExternalExamController extends BaseController implements ExternalExamAPI {

    @Inject
    private WSClient wsClient;

    @Inject
    private AutoEvaluationHandler autoEvaluationHandler;

    @Inject
    private NoShowHandler noShowHandler;

    private Exam createCopy(Exam src, Exam parent, User user) {
        Exam clone = new Exam();
        BeanUtils.copyProperties(src, clone, "id", "parent", "examSections", "examEnrolments", "examParticipations",
                "examInspections", "autoEvaluationConfig", "creator", "created", "examOwners");
        clone.setParent(parent);
        AppUtil.setCreator(clone, user);
        AppUtil.setModifier(clone, user);
        clone.generateHash();
        clone.save();

        if (src.getAutoEvaluationConfig() != null) {
            AutoEvaluationConfig configClone = src.getAutoEvaluationConfig().copy();
            configClone.setExam(clone);
            configClone.save();
            clone.setAutoEvaluationConfig(configClone);
        }
        for (ExamInspection ei : src.getExamInspections()) {
            ExamInspection inspection = new ExamInspection();
            BeanUtils.copyProperties(ei, inspection, "id", "exam");
            inspection.setExam(clone);
            inspection.save();
        }
        Set<ExamSection> sections = new TreeSet<>();
        sections.addAll(src.getExamSections());
        for (ExamSection es : sections) {
            ExamSection esCopy = es.copyWithAnswers(clone);
            AppUtil.setCreator(esCopy, user);
            AppUtil.setModifier(esCopy, user);
            esCopy.save();
            for (ExamSectionQuestion esq : esCopy.getSectionQuestions()) {
                Question questionCopy = esq.getQuestion();
                AppUtil.setCreator(questionCopy, user);
                AppUtil.setModifier(questionCopy, user);
                questionCopy.update();
                esq.save();
            }
            clone.getExamSections().add(esCopy);
        }
        clone.save();
        return clone;
    }


    @SubjectNotPresent
    @Transactional
    public Result addExamForAssessment(String ref) throws IOException {
        ExamEnrolment enrolment = getPrototype(ref);
        if (enrolment == null) {
            return notFound();
        }
        JsonNode body = request().body().asJson();
        ExternalExam ee = JsonDeserializer.deserialize(ExternalExam.class, body);
        if (ee == null) {
            return badRequest();
        }
        Exam parent = Ebean.find(Exam.class).where().eq("hash", ee.getExternalRef()).findUnique();
        if (parent == null) {
            return notFound();
        }
        Exam clone = createCopy(ee.deserialize(), parent, enrolment.getUser());
        enrolment.setExam(clone);
        enrolment.update();

        ExamParticipation ep = new ExamParticipation();
        ep.setExam(clone);
        ep.setUser(enrolment.getUser());
        ep.setStarted(ee.getStarted());
        ep.setEnded(ee.getFinished());
        ep.setReservation(enrolment.getReservation());
        ep.setDuration(new DateTime(ee.getFinished().getMillis() - ee.getStarted().getMillis()));

        if (clone.getState().equals(Exam.State.REVIEW)) {
            GeneralSettings settings = SettingsController.getOrCreateSettings("review_deadline", null, "14");
            int deadlineDays = Integer.parseInt(settings.getValue());
            DateTime deadline = ee.getFinished().plusDays(deadlineDays);
            ep.setDeadline(deadline);
            autoEvaluationHandler.autoEvaluate(clone);
        }
        ep.save();
        return created();
    }

    private PathProperties getPath() {
        String path = "(id, name, state, instruction, hash, duration, cloned, course(id, code, name), executionType(id, type), " + // (
                "autoEvaluationConfig(releaseType, releaseDate, amountDays, gradeEvaluations(percentage, grade(id, gradeScale(id)))), " +
                "examLanguages(code), attachment(fileName), examOwners(firstName, lastName)" +
                "examInspections(user(firstName, lastName)), " +
                "examType(id, type), creditType(id, type), gradeScale(id, displayName, grades(id, name)), " +
                "examSections(id, name, sequenceNumber, description, " + // ((
                "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, " + // (((
                "question(id, type, question, attachment(id, fileName), options(id, option, correctOption, defaultScore)), " +
                "options(id, answered, score, option(id, option)), " +
                "essayAnswer(id, answer, objectVersion, attachment(fileName)), " +
                "clozeTestAnswer(id, question, answer, objectVersion)" +
                ")))";
        return PathProperties.parse(path);
    }

    @SubjectNotPresent
    public Result provideEnrolment(String ref) {
        ExamEnrolment enrolment = getPrototype(ref);
        if (enrolment == null) {
            return notFound();
        }
        return ok(enrolment.getExam(), getPath());
    }

    @SubjectNotPresent
    public Result addNoShow(String ref) {
        ExamEnrolment enrolment = getPrototype(ref);
        noShowHandler.handleNoShowAndNotify(enrolment.getReservation());
        return ok();
    }

    @Override
    public CompletionStage<ExamEnrolment> requestEnrolment(User user, Reservation reservation) throws MalformedURLException {
        URL url = parseUrl(reservation.getExternalRef());
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, ExamEnrolment> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != 200) {
                return null;
            }
            // Create external exam!
            Exam document = JsonDeserializer.deserialize(Exam.class, root);
            // Set references so that:
            // - external ref is the reference we got from outside. Must not be changed.
            // - local ref is an UUID X. It is used locally for referencing the exam
            // - content's hash is set to X in order to simplify things with frontend

            String externalRef = document.getHash();
            String ref = UUID.randomUUID().toString();
            document.setHash(ref);
            Map<String, Object> content;
            try {
                ObjectMapper om = new ObjectMapper();
                String txt = om.writeValueAsString(document);
                content = EJson.parseObject(txt);
            } catch (IOException e) {
                return null;
            }
            ExternalExam ee = new ExternalExam();
            ee.setExternalRef(externalRef);
            ee.setHash(ref);
            ee.setContent(content);
            ee.setCreator(user);
            ee.setCreated(DateTime.now());
            ee.save();

            ExamEnrolment enrolment = new ExamEnrolment();
            enrolment.setExternalExam(ee);
            enrolment.setReservation(reservation);
            enrolment.setUser(user);
            enrolment.save();
            return enrolment;
        };
        return request.get().thenApplyAsync(onSuccess);
    }


    private static Query<ExamEnrolment> createQuery() {
        Query<ExamEnrolment> query = Ebean.find(ExamEnrolment.class);
        PathProperties props = StudentExamController.getPath(true);
        props.apply(query);
        return query;
    }

    private static ExamEnrolment getPrototype(String ref) {
        return createQuery()
                .where()
                .eq("reservation.externalRef", ref)
                .isNull("exam.parent")
                .orderBy("exam.examSections.id, exam.examSections.sectionQuestions.sequenceNumber")
                .findUnique();
    }

    private static URL parseUrl(String reservationRef) throws MalformedURLException {
        return new URL(ConfigFactory.load().getString("sitnet.integration.iop.host")
                + String.format("/api/enrolments/%s", reservationRef));
    }


}
