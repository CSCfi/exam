package system;


import com.avaje.ebean.Ebean;
import com.google.inject.Inject;
import com.typesafe.config.ConfigFactory;
import controllers.BaseController;
import models.*;
import org.joda.time.DateTime;
import org.joda.time.Minutes;
import org.joda.time.format.ISODateTimeFormat;
import play.Logger;
import play.Play;
import play.cache.CacheApi;
import play.http.HttpRequestHandler;
import play.libs.F;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;
import util.AppUtil;

import javax.xml.bind.DatatypeConverter;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SystemRequestHandler implements HttpRequestHandler {

    public static final String SITNET_FAILURE_HEADER_KEY = "x-exam-token-failure";
    public static final String SITNET_CACHE_KEY = "user.session.";
    private static final String LOGIN_TYPE = ConfigFactory.load().getString("sitnet.login");

    protected CacheApi cache;

    @Inject
    public SystemRequestHandler(CacheApi cache) {
        this.cache = cache;

    }

    @Override
    public Action createAction(Http.Request request, Method actionMethod) {
        String token = request.getHeader(LOGIN_TYPE.equals("HAKA") ? "Shib-Session-ID" :
                BaseController.SITNET_TOKEN_HEADER_KEY);
        Session session = cache.get(SITNET_CACHE_KEY + token);
        AuditLogger.log(request, session);

        if (session == null) {
            Logger.info("Session with token {} not found", token);
            return doCreateAction();
        }

        if (!session.isValid()) {
            Logger.warn("Session #{} is marked as invalid", token);
            return new Action.Simple() {
                public F.Promise<Result> call(final Http.Context ctx) throws Throwable {
                    return F.Promise.promise(() -> {
                                ctx.response().getHeaders().put(SITNET_FAILURE_HEADER_KEY, "Invalid token");
                                return Action.badRequest("Token has expired / You have logged out, please close all browser windows and login again.");
                            }
                    );
                }
            };
        }

        updateSession(request, session, token);

        if (session.getUserId() == null) {
            return doCreateAction();
        }

        User user = Ebean.find(User.class, session.getUserId());
        if (user == null || !user.hasRole("STUDENT") || request.path().equals("/logout")) {
            return doCreateAction();
        }

        ExamEnrolment ongoingEnrolment = getNextEnrolment(user.getId(), 0);
        if (ongoingEnrolment != null) {
            return handleOngoingEnrolment(ongoingEnrolment, request);
        } else {
            DateTime now = new DateTime();
            int lookAheadMinutes = Minutes.minutesBetween(now, now.plusDays(1).withMillisOfDay(0)).getMinutes();
            ExamEnrolment upcomingEnrolment = getNextEnrolment(user.getId(), lookAheadMinutes);
            if (upcomingEnrolment != null) {
                return handleUpcomingEnrolment(upcomingEnrolment, request);
            } else if (isOnExamMachine(request)) {
                // User is logged on an exam machine but has no exams for today
                Map<String, String> headers = new HashMap<>();
                headers.put("x-exam-upcoming-exam", "none");
                return new AddHeader(doCreateAction(), headers);
            } else {
                return doCreateAction();
            }
        }
    }

    @Override
    public Action wrapAction(Action action) {
        return action;
    }

    private Action doCreateAction() {
        return new Action.Simple() {
            @Override
            public F.Promise<Result> call(Http.Context ctx) throws Throwable {
                return delegate.call(ctx);
            }
        };
    }

    private void updateSession(Http.Request request, Session session, String token) {
        if (!request.path().contains("checkSession")) {
            session.setSince(DateTime.now());
            cache.set(SITNET_CACHE_KEY + token, session);
        }
    }

    private boolean isOnExamMachine(Http.Request request) {
        return Ebean.find(ExamMachine.class).where().eq("ipAddress", request.remoteAddress()).findUnique() != null;
    }

    private boolean machineOk(ExamEnrolment enrolment, Http.Request request, Map<String,
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
                header = "x-exam-unknown-machine";
                message = room.getCampus() + ":::" +
                        room.getBuildingName() + ":::" +
                        room.getRoomCode() + ":::" +
                        examMachine.getName() + ":::" +
                        ISODateTimeFormat.dateTime().print(new DateTime(enrolment.getReservation().getStartAt()));
            } else if (lookedUp.getRoom().getId().equals(room.getId())) {
                // Right room, wrong machine
                header = "x-exam-wrong-machine";
                message = enrolment.getId() + ":::" + lookedUp.getName();
            } else {
                // Wrong room
                header = "x-exam-wrong-room";
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

    private Action handleOngoingEnrolment(ExamEnrolment enrolment, Http.Request request) {
        Map<String, String> headers = new HashMap<>();
        if (!Play.isDev() && !machineOk(enrolment, request, headers)) {
            return new AddHeader(doCreateAction(), headers);
        }
        String hash = enrolment.getExam().getHash();
        headers.put("x-exam-start-exam", hash);
        return new AddHeader(doCreateAction(), headers);
    }


    private Action handleUpcomingEnrolment(ExamEnrolment enrolment, Http.Request request) {
        Map<String, String> headers = new HashMap<>();
        if (!Play.isDev() && !machineOk(enrolment, request, headers)) {
            return new AddHeader(doCreateAction(), headers);
        }
        String hash = enrolment.getExam().getHash();
        headers.put("x-exam-start-exam", hash);
        headers.put("x-exam-upcoming-exam", enrolment.getId().toString());
        return new AddHeader(doCreateAction(), headers);
    }

    private ExamEnrolment getNextEnrolment(Long userId, int minutesToFuture) {
        DateTime now = AppUtil.adjustDST(new DateTime());
        DateTime future = now.plusMinutes(minutesToFuture);
        List<ExamEnrolment> results = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .fetch("exam")
                .where()
                .eq("user.id", userId)
                .disjunction()
                .eq("exam.state", Exam.State.PUBLISHED)
                .eq("exam.state", Exam.State.STUDENT_STARTED)
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
        public F.Promise<Result> call(Http.Context context) throws Throwable {
            F.Promise<Result> promise = delegate.call(context);
            Http.Response response = context.response();

            for (Map.Entry<String, String> entry : headers.entrySet()) {
                response.setHeader(entry.getKey(), entry.getValue());
            }
            return promise;
        }
    }

}
