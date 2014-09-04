import Exceptions.AuthenticateException;
import Exceptions.MalformedDataException;
import Exceptions.UnauthorizedAccessException;
import com.avaje.ebean.Ebean;
import controllers.StatisticsController;
import controllers.StudentExamController;
import models.*;
import models.questions.QuestionInterface;
import org.joda.time.DateTime;
import play.Application;
import play.GlobalSettings;
import play.Logger;
import play.cache.Cache;
import play.libs.Akka;
import play.libs.F;
import play.libs.F.Promise;
import play.libs.Json;
import play.libs.Yaml;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Http.Request;
import play.mvc.Results;
import play.mvc.SimpleResult;
import scala.concurrent.duration.Duration;

import java.lang.reflect.Method;
import java.sql.Timestamp;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class Global extends GlobalSettings {

    public static final String SITNET_TOKEN_HEADER_KEY = "x-sitnet-authentication";
    public static final String SITNET_FAILURE_HEADER_KEY = "x-sitnet-token-failure";
    public static final String SITNET_CACHE_KEY = "user.session.";
    public static final int SITNET_EXAM_REVIEWER_START_AFTER_MINUTES = 15;
    public static final int SITNET_EXAM_REVIEWER_INTERVAL_MINUTES = 5;



    @Override
    public void onStart(Application app) {

        //todo: make these interval and start times configurable via configuration files

        Akka.system().scheduler().schedule(
                Duration.create(SITNET_EXAM_REVIEWER_START_AFTER_MINUTES, TimeUnit.MINUTES),
                Duration.create(SITNET_EXAM_REVIEWER_INTERVAL_MINUTES, TimeUnit.MINUTES),
                new ReviewRunner(),
                Akka.system().dispatcher()
        );

// Todo: in production should use 7 DAYS
        Akka.system().scheduler().schedule(
                Duration.create(1, TimeUnit.MINUTES),
                Duration.create(1, TimeUnit.DAYS),
                new WeeklyEmailReport(),
                Akka.system().dispatcher()
        );

        InitialData.insert(app);
        StatisticsController.createReportDirectory();
    }

    @Override
    public Promise<SimpleResult> onError(Http.RequestHeader request, final Throwable t) {
        F.Promise<SimpleResult> promise = F.Promise.promise(new F.Function0<SimpleResult>() {
            public SimpleResult apply() {
                Throwable cause = t.getCause();
                String errorMessage = cause.getMessage();
                if (cause instanceof UnauthorizedAccessException) {
                    return Results.forbidden(Json.toJson(errorMessage));
                }
                if (cause instanceof AuthenticateException) {
                    return Results.unauthorized(Json.toJson(errorMessage));
                }
                if (cause instanceof MalformedDataException) {
                    return Results.badRequest(Json.toJson(errorMessage));
                }
                if (cause instanceof IllegalArgumentException) {
                    return Results.badRequest(Json.toJson(new ApiError(errorMessage)));
                }
                return Results.internalServerError(Json.toJson(errorMessage));
            }
        });
        return promise;
    }

    @Override
    public Promise<SimpleResult> onBadRequest(Http.RequestHeader request, final String error) {
        return F.Promise.promise(new F.Function0<SimpleResult>() {
            public SimpleResult apply() {
                return Results.badRequest(Json.toJson(new ApiError(error)));
            }
        });
    }

    private class AddHeader extends Action {
        private HashMap<String, String> headers;
        public AddHeader(Action action, HashMap<String, String> headers) {
            this.headers = headers;
            this.delegate = action;
        }

        @Override
        public Promise<SimpleResult> call(Http.Context context) throws Throwable {
            final Promise promise = this.delegate.call(context);
            Http.Response response = context.response();

            for(String key : headers.keySet()){
                response.setHeader(key, headers.get(key));
            }
            return promise;
        }
    }

    @Override
    public Action onRequest(Request request, Method actionMethod) {


        String token = request.getHeader(SITNET_TOKEN_HEADER_KEY);
        Session session = (Session) Cache.get(SITNET_CACHE_KEY + token);
        AuditLogger.log(request, actionMethod, session);

        if(session == null) {
            return super.onRequest(request, actionMethod);
        }

        //ugh, this works, apparently. I don't like play.
        if (!session.isValid()) {
            return new Action.Simple() {
                public Promise<SimpleResult> call(final Http.Context ctx) throws Throwable {
                    F.Promise<SimpleResult> promise = F.Promise.promise(new F.Function0<SimpleResult>() {
                        public SimpleResult apply() {
                            ctx.response().getHeaders().put(SITNET_FAILURE_HEADER_KEY, "Invalid token");
                            return Action.badRequest("Token has expired / You have logged out, please close all browser windows and login again.");
                        }
                    });
                    return promise;
                }
            };
        }

        if(session.getUserId() == null) {
            return super.onRequest(request, actionMethod);
        }

        User user = Ebean.find(User.class, session.getUserId());
        if (user == null || !user.hasRole("STUDENT")) {
            return super.onRequest(request, actionMethod);
        }


        //todo: widen the range, to see upcoming enrolments
        //todo: add cases for these
        Timestamp now = new Timestamp(DateTime.now().getMillis());

        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .fetch("exam")
                .where()
                .eq("user.id", user.getId())
                .le("reservation.startAt", now)
                .gt("reservation.endAt", now)
                //there should be no overlapping reservations, right?
                .findUnique();

        if(enrolment == null) {
            return super.onRequest(request, actionMethod);
        }

        String machineIp = enrolment.getReservation().getMachine().getIpAddress();
        String remoteIp = request.remoteAddress();

        HashMap<String, String> headers = new HashMap<>();

        Logger.debug("User   ip: " + remoteIp + "\nRemote ip: " + machineIp);
        //todo: is there another way to identify/match machines?
        //todo: eg. some transparent proxy that add id header etc.
        if(!remoteIp.equals(machineIp)) {
            ExamMachine machine = enrolment.getReservation().getMachine();
            ExamRoom room = machine.getRoom();

            String info = room.getCampus() + ":::" +
                            room.getBuildingName() + ":::" +
                            room.getRoomCode() + ":::" +
                            machine.getName() ;

            headers.put("X-Sitnet-Wrong-Machine", Base64.getEncoder().encodeToString(info.getBytes()));
            //todo: add note, about wrong machine?
            return new AddHeader( super.onRequest(request, actionMethod), headers);
        }

        String hash = enrolment.getExam().getHash();
        try {
            StudentExamController.createExam(hash, user);
        } catch (UnauthorizedAccessException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }
        headers.put("X-Sitnet-Start-Exam", hash);
        return new AddHeader( super.onRequest(request, actionMethod), headers);
    }

    private class InvalidTokenAction extends Action {
        @Override
        public Promise<SimpleResult> call(Http.Context context) throws Throwable {
            F.Promise<SimpleResult> promise = F.Promise.promise(new F.Function0<SimpleResult>() {
                public SimpleResult apply() {
                    return Action.badRequest("Token has expired / You have logged out, please close all browser windows and login again.");
                }
            });
            return promise;
        }
    }

    private static class InitialData {
        public static void insert(Application app) {
            if (Ebean.find(User.class).findRowCount() == 0) {

                 @SuppressWarnings("unchecked")
                 Map<String, List<Object>> all = (Map<String, List<Object>>) Yaml.load("initial-data.yml");

                // HUOM, järjestyksellä on väliä
                Ebean.save(all.get("user-roles"));
                Ebean.save(all.get("user_languages"));
                Ebean.save(all.get("organisations"));
                Ebean.save(all.get("users"));
                Ebean.save(all.get("attachments"));
                Ebean.save(all.get("question_essay"));
                Ebean.save(all.get("question_multiple_choice"));
                Ebean.save(all.get("courses"));
                Ebean.save(all.get("comments"));
                Ebean.save(all.get("exam-types"));
                Ebean.save(all.get("exams"));
                Ebean.save(all.get("exam-sections"));
                Ebean.save(all.get("exam-participations"));
                Ebean.save(all.get("exam-inspections"));
                Ebean.save(all.get("mail-addresses"));
                Ebean.save(all.get("calendar-events"));
                Ebean.save(all.get("softwares"));
                Ebean.save(all.get("exam-rooms"));
                Ebean.save(all.get("exam-machines"));
                Ebean.save(all.get("exam-room-reservations"));
                Ebean.save(all.get("exam-enrolments"));
                Ebean.save(all.get("user-agreament"));
                Ebean.save(all.get("grades"));


                // generate hashes for questions
                List<QuestionInterface> questions = (List) all.get("question_multiple_choice");
                for (QuestionInterface q : questions) {
                    q.generateHash();
                }
                Ebean.save(questions);

                // generate hashes for questions
                List<Exam> exams = (List) all.get("exams");
                for (Exam e : exams) {
                    e.generateHash();
                }
                Ebean.save(exams);

            }
        }
    }
}