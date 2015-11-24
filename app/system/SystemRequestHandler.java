package system;


import com.avaje.ebean.Ebean;
import com.google.inject.Inject;
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
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SystemRequestHandler implements HttpRequestHandler {

    private static final String SITNET_FAILURE_HEADER_KEY = "x-exam-token-failure";

    protected CacheApi cache;

    @Inject
    public SystemRequestHandler(CacheApi cache) {
        this.cache = cache;
    }

    @Override
    public Action createAction(Http.Request request, Method actionMethod) {
        String token = BaseController.getToken(request);
        Session session = cache.get(BaseController.SITNET_CACHE_KEY + token);
        User user = session == null ? null : Ebean.find(User.class, session.getUserId());
        AuditLogger.log(request, user);
        if (session == null) {
            Logger.info("Session with token {} not found", token);
            return propagateAction();
        }
        Action validationAction = validateSession(session, token);
        if (validationAction != null) {
            return validationAction;
        }

        updateSession(request, session, token);

        if (user == null || !user.hasRole("STUDENT", session) || request.path().equals("/logout")) {
            // propagate further right away
            return propagateAction();
        } else {
            // requests are candidates for extra processing
            return processAction(request, user);
        }
    }

    @Override
    public Action wrapAction(Action action) {
        return action;
    }

    private Action validateSession(Session session, String token) {
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
        return null;
    }

    private Action processAction(Http.Request request, User user) {
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
                return propagateAction(headers);
            } else {
                return propagateAction();
            }
        }
    }

    private Action propagateAction() {
        return propagateAction(Collections.emptyMap());
    }

    private Action propagateAction(Map<String, String> headers) {
        return new Action.Simple() {
            @Override
            public F.Promise<Result> call(Http.Context ctx) throws Throwable {
                F.Promise<Result> promise = delegate.call(ctx);
                Http.Response response = ctx.response();
                response.setHeader("Cache-Control", "no-cache;no-store");
                response.setHeader("Pragma", "no-cache");
                for (Map.Entry<String, String> entry : headers.entrySet()) {
                    response.setHeader(entry.getKey(), entry.getValue());
                }
                return promise;
            }
        };
    }

    private void updateSession(Http.Request request, Session session, String token) {
        if (!request.path().contains("checkSession")) {
            session.setSince(DateTime.now());
            cache.set(BaseController.SITNET_CACHE_KEY + token, session);
        }
    }

    private boolean isOnExamMachine(Http.Request request) {
        return Ebean.find(ExamMachine.class).where().eq("ipAddress", request.remoteAddress()).findUnique() != null;
    }

    private boolean isMachineOk(ExamEnrolment enrolment, Http.Request request, Map<String,
            String> headers) {
        // Loose the checks for dev usage to facilitate for easier testing
        if (Play.isDev()) {
            return true;
        }
        ExamMachine examMachine = enrolment.getReservation().getMachine();
        ExamRoom room = examMachine.getRoom();

        String machineIp = examMachine.getIpAddress();
        String remoteIp = request.remoteAddress();

        Logger.debug("User is on IP: {} <-> Should be on IP: {}", remoteIp, machineIp);

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
        if (!isMachineOk(enrolment, request, headers)) {
            return propagateAction(headers);
        }
        String hash = enrolment.getExam().getHash();
        headers.put("x-exam-start-exam", hash);
        return propagateAction(headers);
    }

    private Action handleUpcomingEnrolment(ExamEnrolment enrolment, Http.Request request) {
        Map<String, String> headers = new HashMap<>();
        if (!isMachineOk(enrolment, request, headers)) {
            return propagateAction(headers);
        }
        String hash = enrolment.getExam().getHash();
        headers.put("x-exam-start-exam", hash);
        headers.put("x-exam-upcoming-exam", enrolment.getId().toString());
        return propagateAction(headers);
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

}
