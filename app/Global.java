import akka.actor.Cancellable;
import com.avaje.ebean.Ebean;
import com.typesafe.config.ConfigException;
import com.typesafe.config.ConfigFactory;
import controllers.StatisticsController;
import exceptions.AuthenticateException;
import exceptions.MalformedDataException;
import models.*;
import org.joda.time.DateTime;
import org.joda.time.DateTimeConstants;
import org.joda.time.Minutes;
import org.joda.time.Seconds;
import play.Application;
import play.GlobalSettings;
import play.Logger;
import play.api.mvc.Handler;
import play.cache.Cache;
import play.libs.Akka;
import play.libs.F;
import play.libs.F.Promise;
import play.libs.Json;
import play.mvc.*;
import play.mvc.Http.Request;
import scala.concurrent.duration.Duration;
import scala.concurrent.duration.FiniteDuration;
import util.SitnetUtil;
import util.java.EmailComposer;

import javax.xml.bind.DatatypeConverter;
import java.io.IOException;
import java.lang.reflect.Method;
import java.util.*;
import java.util.concurrent.TimeUnit;

public class Global extends GlobalSettings {

    public static final String SITNET_TOKEN_HEADER_KEY = "x-sitnet-authentication";
    public static final String SITNET_FAILURE_HEADER_KEY = "x-sitnet-token-failure";
    public static final String SITNET_CACHE_KEY = "user.session.";
    public static final int SITNET_EXAM_REVIEWER_START_AFTER_MINUTES = 1;
    public static final int SITNET_EXAM_REVIEWER_INTERVAL_MINUTES = 1;

    private Cancellable reportSender;
    private Cancellable reviewRunner;

    @Override
    public void onStop(Application app) {
        if (reportSender != null && !reportSender.isCancelled()) {
            reportSender.cancel();
        }
        if (reviewRunner != null && !reviewRunner.isCancelled()) {
            reviewRunner.cancel();
        }
        super.onStop(app);
    }

    @Override
    public void onStart(Application app) {

        System.setProperty("user.timezone", "UTC");
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

        //todo: make these interval and start times configurable via configuration files

        reviewRunner = Akka.system().scheduler().schedule(
                Duration.create(SITNET_EXAM_REVIEWER_START_AFTER_MINUTES, TimeUnit.MINUTES),
                Duration.create(SITNET_EXAM_REVIEWER_INTERVAL_MINUTES, TimeUnit.MINUTES),
                new ReviewRunner(),
                Akka.system().dispatcher()
        );

        weeklyEmailReport();

        SitnetUtil.initializeDataModel();
        StatisticsController.createReportDirectory();

        super.onStart(app);
    }

    private int secondsUntilNextMondayRun(int scheduledHour) {
        DateTime now = DateTime.now();
        DateTime nextRun = now.withHourOfDay(scheduledHour)
                .withMinuteOfHour(0)
                .withSecondOfMinute(0)
                .plusWeeks(now.getDayOfWeek() == DateTimeConstants.MONDAY ? 0 : 1)
                .withDayOfWeek(DateTimeConstants.MONDAY);
        if (nextRun.isBefore(now)) {
            nextRun = nextRun.plusWeeks(1); // now is a Monday after scheduled run time -> postpone
        }
        return Seconds.secondsBetween(now, nextRun).getSeconds();
    }

    private void weeklyEmailReport() {
        // TODO: store the time of last dispatch in db so we know if scheduler was not run and send an extra report
        // in that case?

        // Every Monday at 5AM UTC
        FiniteDuration delay = FiniteDuration.create(secondsUntilNextMondayRun(5), TimeUnit.SECONDS);
        FiniteDuration frequency = FiniteDuration.create(7, TimeUnit.DAYS);
        Runnable showTime = new Runnable() {
            @Override
            public void run() {

                Logger.info(new Date() + "Running weekly email report");
                List<User> teachers = Ebean.find(User.class)
                        .fetch("roles")
                        .where()
                        .eq("roles.name", "TEACHER")
                        .findList();
                try {
                    for (User teacher : teachers) {
                        EmailComposer.composeWeeklySummary(teacher);
                    }
                } catch (IOException e) {
                    Logger.error("Failed to read email template from disk!", e);
                    e.printStackTrace();
                }
            }
        };
        reportSender = Akka.system().scheduler().schedule(delay, frequency, showTime, Akka.system().dispatcher());
    }

    @Override
    public Promise<Result> onError(Http.RequestHeader request, final Throwable t) {
        return F.Promise.promise(new F.Function0<Result>() {
            public Result apply() {
                Throwable cause = t.getCause();
                String errorMessage = cause.getMessage();

                if (Logger.isDebugEnabled()) {
                    Logger.debug("onError: " + errorMessage);
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
    }

    @Override
    public Promise<Result> onBadRequest(Http.RequestHeader request, final String error) {
        if (Logger.isDebugEnabled()) {
            Logger.debug("onBadRequest: " + error);
        }
        return F.Promise.promise(new F.Function0<Result>() {
            public Result apply() {
                return Results.badRequest(Json.toJson(new ApiError(error)));
            }
        });
    }

    @Override
    public Handler onRouteRequest(Http.RequestHeader request) {

        String loginType;
        try {
            loginType = ConfigFactory.load().getString("sitnet.login");
        } catch (ConfigException e) {
            Logger.debug("Failed to load configuration", e);
            return super.onRouteRequest(request);
        }
        String token = request.getHeader(loginType.equals("HAKA") ? "Shib-Session-ID" : SITNET_TOKEN_HEADER_KEY);
        Session session = (Session) Cache.get(SITNET_CACHE_KEY + token);

        if (session != null && !request.path().contains("checkSession")) {
            session.setSince(DateTime.now());
            Cache.set(SITNET_CACHE_KEY + token, session);
        }

        return super.onRouteRequest(request);
    }

    @Override
    public Action onRequest(final Request request, Method actionMethod) {

        String loginType = ConfigFactory.load().getString("sitnet.login");
        String token = request.getHeader(loginType.equals("HAKA") ? "Shib-Session-ID" : SITNET_TOKEN_HEADER_KEY);
        Session session = (Session) Cache.get(SITNET_CACHE_KEY + token);
        AuditLogger.log(request, session);

        if (session == null) {
            Logger.info("Session with token {} not found", token);
            return super.onRequest(request, actionMethod);
        }

        //ugh, this works, apparently. I don't like play.
        if (!session.isValid()) {
            Logger.warn("Session #{} is marked as invalid", token);
            return new Action.Simple() {
                public Promise<Result> call(final Http.Context ctx) throws Throwable {
                    return F.Promise.promise(new F.Function0<Result>() {
                        public Result apply() {
                            ctx.response().getHeaders().put(SITNET_FAILURE_HEADER_KEY, "Invalid token");
                            return Action.badRequest("Token has expired / You have logged out, please close all browser windows and login again.");
                        }
                    });
                }
            };
        }

        if (session.getUserId() == null) {
            return super.onRequest(request, actionMethod);
        }

        User user = Ebean.find(User.class, session.getUserId());
        if (user != null) {
            if (!session.getXsrfToken().equals(request.getHeader("X-XSRF-TOKEN"))) {
                // Cross site request forgery attempt?
                Logger.warn("XSRF-TOKEN mismatch!");
                // Lets not go there just yet, looks like this happens with HAKA logins if user opens a new tab
                /*return new Action.Simple() {

                    @Override
                    public Promise<SimpleResult> call(Http.Context context) throws Throwable {
                        F.Promise<SimpleResult> promise = F.Promise.promise(new F.Function0<SimpleResult>() {
                            @Override
                            public SimpleResult apply() throws Throwable {
                                return Action.badRequest("WARNING: Can't verify CSRF token authenticity!");
                            }
                        });
                        return promise;
                    }
                };*/
            }
        }
        if (user == null || !user.hasRole("STUDENT") || request.path().equals("/logout")) {
            return super.onRequest(request, actionMethod);
        }

        ExamEnrolment ongoingEnrolment = getNextEnrolment(user.getId(), 0);
        if (ongoingEnrolment != null) {
            return handleOngoingEnrolment(ongoingEnrolment, request, actionMethod);
        } else {
            DateTime now = new DateTime();
            int lookAheadMinutes = Minutes.minutesBetween(now, now.plusDays(1).withMillisOfDay(0)).getMinutes();
            ExamEnrolment upcomingEnrolment = getNextEnrolment(user.getId(), lookAheadMinutes);
            if (upcomingEnrolment != null) {
                return handleUpcomingEnrolment(upcomingEnrolment, request, actionMethod);
            } else if (isOnExamMachine(request)) {
                // User is logged on an exam machine but has no exams for today
                Map<String, String> headers = new HashMap<>();
                headers.put("x-sitnet-upcoming-exam", "none");
                return new AddHeader(super.onRequest(request, actionMethod), headers);
            } else {
                return super.onRequest(request, actionMethod);
            }
        }
    }

    private boolean isOnExamMachine(Request request) {
        return Ebean.find(ExamMachine.class).where().eq("ipAddress", request.remoteAddress()).findUnique() != null;
    }

    private boolean machineOk(ExamEnrolment enrolment, Request request, Map<String,
            String> headers) {
        ExamMachine examMachine = enrolment.getReservation().getMachine();
        ExamRoom room = examMachine.getRoom();

        String machineIp = examMachine.getIpAddress();
        String remoteIp = request.remoteAddress();

        Logger.debug("\nUser ip: " + remoteIp + "\nreservation machine ip: " + machineIp);

        //todo: is there another way to identify/match machines?
        //todo: eg. some transparent proxy that add id header etc.
        if (!remoteIp.equals(machineIp)) {
            String message;
            String header;

            // Is this a known machine?
            ExamMachine lookedUp = Ebean.find(ExamMachine.class).where().eq("ipAddress", remoteIp).findUnique();
            if (lookedUp == null) {
                // IP not known
                header = "x-sitnet-unknown-machine";
                message = room.getCampus() + ":::" +
                        room.getBuildingName() + ":::" +
                        room.getRoomCode() + ":::" +
                        examMachine.getName() + ":::" +
                        enrolment.getReservation().getStartAt().getTime();
            } else if (lookedUp.getRoom().getId().equals(room.getId())) {
                // Right room, wrong machine
                header = "x-sitnet-wrong-machine";
                message = enrolment.getId() + ":::" + lookedUp.getName();
            } else {
                // Wrong room
                header = "x-sitnet-wrong-room";
                message = enrolment.getId() + ":::" + lookedUp.getRoom() + ":::" +
                        lookedUp.getRoom().getRoomCode() + ":::" + lookedUp.getName();
            }
            headers.put(header, DatatypeConverter.printBase64Binary(message.getBytes()));
            Logger.debug("room and machine not ok. " + message);
            return false;
        }
        Logger.debug("room and machine ok");
        return true;
    }

    private Action handleOngoingEnrolment(ExamEnrolment enrolment, Request request, Method method) {
        Map<String, String> headers = new HashMap<>();
        if (!machineOk(enrolment, request, headers)) {
            return new AddHeader(super.onRequest(request, method), headers);
        }
        String hash = enrolment.getExam().getHash();
        headers.put("x-sitnet-start-exam", hash);
        return new AddHeader(super.onRequest(request, method), headers);
    }


    private Action handleUpcomingEnrolment(ExamEnrolment enrolment, Request request, Method method) {
        Map<String, String> headers = new HashMap<>();
        if (!machineOk(enrolment, request, headers)) {
            return new AddHeader(super.onRequest(request, method), headers);
        }
        String hash = enrolment.getExam().getHash();
        headers.put("x-sitnet-start-exam", hash);
        headers.put("x-sitnet-upcoming-exam", enrolment.getId().toString());
        return new AddHeader(super.onRequest(request, method), headers);
    }

    private ExamEnrolment getNextEnrolment(Long userId, int minutesToFuture) {
        Date now = new Date();
        DateTime future = new DateTime(now).plusMinutes(minutesToFuture);
        List<ExamEnrolment> results = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .fetch("exam")
                .where()
                .eq("user.id", userId)
                .disjunction()
                .eq("exam.state", Exam.State.PUBLISHED.toString())
                .eq("exam.state", Exam.State.STUDENT_STARTED.toString())
                .endJunction()
                .le("reservation.startAt", future)
                .gt("reservation.endAt", now)
                .orderBy("reservation.startAt")
                .findList();
        if (results.isEmpty()) {
            return null;
        }
        return results.get(0);
    }

    @SuppressWarnings("unchecked")
    private class AddHeader extends Action {
        private Map<String, String> headers;

        public AddHeader(Action action, Map<String, String> headers) {
            this.headers = headers;
            delegate = action;
        }

        @Override
        public Promise<SimpleResult> call(Http.Context context) throws Throwable {
            Promise<SimpleResult> promise = delegate.call(context);
            Http.Response response = context.response();

            for (Map.Entry<String, String> entry : headers.entrySet()) {
                response.setHeader(entry.getKey(), entry.getValue());
            }
            return promise;
        }
    }
}