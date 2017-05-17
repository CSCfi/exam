package controllers.iop;

import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.PathProperties;
import com.avaje.ebean.text.json.EJson;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.typesafe.config.ConfigFactory;
import controllers.SettingsController;
import controllers.StudentExamController;
import controllers.base.BaseController;
import controllers.iop.api.ExternalExamAPI;
import models.Exam;
import models.ExamEnrolment;
import models.ExamParticipation;
import models.GeneralSettings;
import models.Reservation;
import models.User;
import models.json.ExternalExam;
import org.joda.time.DateTime;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;
import util.java.JsonDeserializer;

import javax.inject.Inject;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;


public class ExternalExamController extends BaseController implements ExternalExamAPI {

    @Inject
    private WSClient wsClient;


    private void persistExamAttainment(Exam src) {

    }


    @SubjectNotPresent
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
        Exam content = ee.deserialize();
        // TODO: deep copy and save
        content.save();
        enrolment.setExam(content);
        enrolment.update();

        ExamParticipation ep = new ExamParticipation();
        ep.setExam(content);
        ep.setUser(ee.getCreator());
        ep.setStarted(ee.getStarted());
        ep.setEnded(ee.getFinished());
        ep.setReservation(enrolment.getReservation());
        ep.setDuration(new DateTime(ee.getFinished().getMillis() - ee.getStarted().getMillis()));
        GeneralSettings settings = SettingsController.getOrCreateSettings("review_deadline", null, "14");
        int deadlineDays = Integer.parseInt(settings.getValue());
        DateTime deadline = ee.getFinished().plusDays(deadlineDays);
        ep.setDeadline(deadline);
        ep.save();

        // autoevaluate?

        return created();
    }

    @SubjectNotPresent
    public Result provideEnrolment(String ref) {
        ExamEnrolment enrolment = getPrototype(ref);
        if (enrolment == null) {
            return notFound();
        }
        return ok(enrolment.getExam(), StudentExamController.getPath(false));
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
            Map<String, Object> content;
            try {
                ObjectMapper om = new ObjectMapper();
                String txt = om.writeValueAsString(document);
                content = EJson.parseObject(txt);
            } catch (IOException e) {
                return null;
            }
            ExternalExam ee = new ExternalExam();
            ee.setHash(document.getHash());
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
        StringBuilder sb = new StringBuilder(ConfigFactory.load().getString("sitnet.integration.iop.host"));
        sb.append(String.format("/api/enrolments/%s", reservationRef));
        return new URL(sb.toString());
    }


}
