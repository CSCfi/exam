import Exceptions.AuthenticateException;
import Exceptions.MalformedDataException;
import Exceptions.UnauthorizedAccessException;
import com.avaje.ebean.Ebean;
import com.typesafe.config.ConfigFactory;
import controllers.StatisticsController;
import models.*;
import models.questions.QuestionInterface;
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
import scala.concurrent.duration.FiniteDuration;
import util.SitnetUtil;
import util.java.EmailComposer;

import java.lang.reflect.Method;
import java.sql.Timestamp;
import java.util.*;
import java.util.concurrent.TimeUnit;

public class Global extends GlobalSettings {

    public static final String SITNET_TOKEN_HEADER_KEY = "x-sitnet-authentication";
    public static final String SITNET_FAILURE_HEADER_KEY = "x-sitnet-token-failure";
    public static final String SITNET_CACHE_KEY = "user.session.";
    public static final int SITNET_EXAM_REVIEWER_START_AFTER_MINUTES = 15;
    public static final int SITNET_EXAM_REVIEWER_INTERVAL_MINUTES = 5;


    @Override
    public void onStart(Application app) {

        System.setProperty("user.timezone", "UTC");
        TimeZone.setDefault(null);

        //todo: make these interval and start times configurable via configuration files

        Akka.system().scheduler().schedule(
                Duration.create(SITNET_EXAM_REVIEWER_START_AFTER_MINUTES, TimeUnit.MINUTES),
                Duration.create(SITNET_EXAM_REVIEWER_INTERVAL_MINUTES, TimeUnit.MINUTES),
                new ReviewRunner(),
                Akka.system().dispatcher()
        );

        // TODO: WeeklyEmailReport.java unused after this
        weeklyEmailReport();

        InitialData.insert();
        StatisticsController.createReportDirectory();
    }

    // TODO: quick fix, experimental scheduler from:
    // http://davidchang168.blogspot.fi/2014/05/how-to-schedule-cron-jobs-in-play-2.html
    private void weeklyEmailReport() {
        Long delayInSeconds;
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, 19);
        c.set(Calendar.MINUTE, 40);
        c.set(Calendar.SECOND, 0);
        Date plannedStart = c.getTime();
        Date now = new Date();
        Date nextRun;
        if(now.after(plannedStart)) {
            c.add(Calendar.DAY_OF_WEEK, 5);
            nextRun = c.getTime();
        } else {
            nextRun = c.getTime();
        }
        delayInSeconds = (nextRun.getTime() - now.getTime()) / 1000; //To convert milliseconds to seconds.
        FiniteDuration delay = FiniteDuration.create(delayInSeconds, TimeUnit.SECONDS);
        FiniteDuration frequency = FiniteDuration.create(7, TimeUnit.DAYS);
        Runnable showTime = new Runnable() {
            @Override
            public void run() {

                Logger.info( new Date() + "Running weekly email report");
                List<User> teachers = Ebean.find(User.class)
                        .fetch("roles")
                        .where()
                        .eq("roles.name", "TEACHER")
                        .findList();

                for (User teacher : teachers) {
                    EmailComposer.composeWeeklySummary(teacher);
                }
            }
        };
        Akka.system().scheduler().schedule(delay, frequency, showTime, Akka.system().dispatcher());
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
        if (user != null) {
            String csrfToken = SitnetUtil.encodeMD5(user.getUserIdentifier());
            if (!csrfToken.equals(request.getHeader("X-XSRF-TOKEN"))) {
                // Cross site forgery attempt?
                Logger.warn("XSRF-TOKEN mismatch!");
                return new Action.Simple() {

                    @Override
                    public Promise<SimpleResult> call(Http.Context context) throws Throwable {
                        F.Promise<SimpleResult> promise = F.Promise.promise(new F.Function0<SimpleResult>() {
                            @Override
                            public SimpleResult apply() throws Throwable {
                                return Action.badRequest("");
                            }
                        });
                        return promise;
                    }
                };
            }
        }
        if (user == null || !user.hasRole("STUDENT")) {
            return super.onRequest(request, actionMethod);
        }


        //todo: widen the range, to see upcoming enrolments
        //todo: add cases for these
        Timestamp now = SitnetUtil.getNowTime();


        Logger.debug(now.toString());
        Logger.debug(now.toString());


        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .fetch("exam")
                .where()
                .eq("user.id", user.getId())
                .le("reservation.startAt", now)
                .gt("reservation.endAt", now)
                //there should be no overlapping reservations, right?
                .findList();



        if(enrolments.isEmpty()) {
            return super.onRequest(request, actionMethod);
        }

        ExamEnrolment enrolment = null;
        for(ExamEnrolment possibleEnrolment : enrolments) {
            if(possibleEnrolment.getExam().getState().equals("PUBLISHED")) {
                enrolment = possibleEnrolment;
                break;
            }
        }

        if(enrolment == null) {
            return super.onRequest(request, actionMethod);
        }

        String machineIp = enrolment.getReservation().getMachine().getIpAddress();
        String remoteIp = request.remoteAddress();

        Logger.debug("\nUser   ip: " + remoteIp + "\nreservation machine ip: " + machineIp);

        HashMap<String, String> headers = new HashMap<>();

        //todo: is there another way to identify/match machines?
        //todo: eg. some transparent proxy that add id header etc.
        if(!remoteIp.equals(machineIp)) {
            ExamMachine machine = enrolment.getReservation().getMachine();
            ExamRoom room = machine.getRoom();

            String info = room.getCampus() + ":::" +
                            room.getBuildingName() + ":::" +
                            room.getRoomCode() + ":::" +
                            machine.getName() ;


            headers.put("x-sitnet-wrong-machine", Base64.getEncoder().encodeToString(info.getBytes()));
            //todo: add note, about wrong machine?
            return new AddHeader( super.onRequest(request, actionMethod), headers);
        }

        String hash = enrolment.getExam().getHash();
        headers.put("x-sitnet-start-exam", hash);
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
        public static void insert() {
            if (Ebean.find(User.class).findRowCount() == 0) {

                String productionData = ConfigFactory.load().getString("sitnet.production.initial.data");

                // Should we load test data
                if(productionData.equals("false")) {

                    @SuppressWarnings("unchecked")
                    Map<String, List<Object>> all = (Map<String, List<Object>>) Yaml.load("production-initial-data.yml");

                    // HUOM, järjestyksellä on väliä
                    Ebean.save(all.get("user-roles"));
                    Ebean.save(all.get("user_languages"));
                    Ebean.save(all.get("organisations"));
                    Ebean.save(all.get("attachments"));
                    Ebean.save(all.get("users"));
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
                    List<Object> questions = all.get("question_multiple_choice");
                    for (Object q : questions) {
                        ((QuestionInterface)q).generateHash();
                    }
                    Ebean.save(questions);

                    // generate hashes for questions
                    List<Object> exams = all.get("exams");
                    for (Object e : exams) {
                        ((Exam)e).generateHash();
                    }
                    Ebean.save(exams);
                }
                else if(productionData.equals("true")) {

                    @SuppressWarnings("unchecked")
                    Map<String, List<Object>> all = (Map<String, List<Object>>) Yaml.load("production-initial-data.yml");

                    Ebean.save(all.get("user-roles"));
                    Ebean.save(all.get("user_languages"));
                    Ebean.save(all.get("users"));
                    Ebean.save(all.get("exam-types"));
                    Ebean.save(all.get("softwares"));
                    Ebean.save(all.get("grades"));
                    Ebean.save(all.get("general-settings"));
                }
            }
        }
    }
}