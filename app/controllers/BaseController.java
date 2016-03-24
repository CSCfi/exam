package controllers;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.text.PathProperties;
import com.google.inject.Inject;
import com.typesafe.config.ConfigFactory;
import exceptions.MalformedDataException;
import models.*;
import models.api.CountsAsTrial;
import play.cache.CacheApi;
import play.data.DynamicForm;
import play.data.Form;
import play.data.FormFactory;
import play.mvc.Controller;
import play.mvc.Http;
import play.mvc.Result;
import util.java.EmailComposer;
import util.java.NoShowHandlerUtil;

import java.io.*;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public class BaseController extends Controller {

    public static final String SITNET_CACHE_KEY = "user.session.";
    static final int SITNET_TIMEOUT_MINUTES = 30;
    static final String LOGIN_TYPE = ConfigFactory.load().getString("sitnet.login");
    private static final int KB = 1024;
    private static final String SITNET_TOKEN_HEADER_KEY = "x-exam-authentication";

    @Inject
    protected CacheApi cache;
    @Inject
    protected FormFactory formFactory;

    <T> T bindForm(final Class<T> clazz) {
        final Form<T> form = formFactory.form(clazz);
        if (form.hasErrors()) {
            throw new MalformedDataException(form.errorsAsJson().asText());
        }
        return form.bindFromRequest().get();
    }

    protected Result ok(Object object) {
        String body = Ebean.json().toJson(object);
        return ok(body).as("application/json");
    }

    protected Result ok(Object object, PathProperties props) {
        String body = Ebean.json().toJson(object, props);
        return ok(body).as("application/json");
    }

    private String createToken() {
        String token;
        if (LOGIN_TYPE.equals("HAKA")) {
            token = request().getHeader("Shib-Session-ID");
        } else {
            token = UUID.randomUUID().toString();
        }
        return token;
    }

    private String getToken() {
        String token;
        if (LOGIN_TYPE.equals("HAKA")) {
            token = request().getHeader("Shib-Session-ID");
        } else {
            token = request().getHeader(SITNET_TOKEN_HEADER_KEY);
        }
        return token;
    }

    public static String getToken(Http.RequestHeader request) {
        String token;
        if (LOGIN_TYPE.equals("HAKA")) {
            token = request.getHeader("Shib-Session-ID");
        } else {
            token = request.getHeader(SITNET_TOKEN_HEADER_KEY);
        }
        return token;
    }

    public static String getToken(Http.Context context) {
        String token;
        if (LOGIN_TYPE.equals("HAKA")) {
            token = context.request().getHeader("Shib-Session-ID");
        } else {
            token = context.request().getHeader(SITNET_TOKEN_HEADER_KEY);
        }
        return token;
    }

    protected User getLoggedUser() {
        Session session = cache.get(SITNET_CACHE_KEY + getToken());
        return Ebean.find(User.class, session.getUserId());
    }

    protected Session getSession() {
        return cache.get(SITNET_CACHE_KEY + getToken());
    }

    void updateSession(Session session) {
        cache.set(SITNET_CACHE_KEY + getToken(), session);
    }

    String createSession(Session session) {
        String token = createToken();
        cache.set(SITNET_CACHE_KEY + token, session);
        return token;
    }

    List<String> parseArrayFieldFromBody(String field) {
        DynamicForm df = formFactory.form().bindFromRequest();
        String args = df.get(field);
        String[] array;
        if (args == null || args.isEmpty()) {
            array = new String[]{};
        } else {
            array = args.split(",");
        }
        return Arrays.asList(array);
    }

    <T> ExpressionList<T> applyUserFilter(String prefix, ExpressionList<T> query, String filter) {
        ExpressionList<T> result = query;
        String rawFilter = filter.replaceAll(" +", " ").trim();
        String condition = String.format("%%%s%%", rawFilter);
        String fnField = prefix == null ? "firstName" : String.format("%s.firstName", prefix);
        String lnField = prefix == null ? "lastName" : String.format("%s.lastName", prefix);
        if (rawFilter.contains(" ")) {
            // Possible that user provided us two names. Lets try out some combinations of first and last names
            String name1 = rawFilter.split(" ")[0];
            String name2 = rawFilter.split(" ")[1];
            result = result.disjunction().conjunction()
                    .ilike(fnField, String.format("%%%s%%", name1))
                    .ilike(lnField, String.format("%%%s%%", name2))
                    .endJunction().conjunction()
                    .ilike(fnField, String.format("%%%s%%", name2))
                    .ilike(lnField, String.format("%%%s%%", name1))
                    .endJunction().endJunction();
        } else {
            result = result.ilike(fnField, condition)
                    .ilike(lnField, condition);
        }
        return result;
    }

    ByteArrayOutputStream setData(File file) {

        ByteArrayOutputStream bos = new ByteArrayOutputStream();

        try {
            InputStream fis = new FileInputStream(file);

            byte[] buf = new byte[KB];

            for (int readNum; (readNum = fis.read(buf)) != -1; ) {
                bos.write(buf, 0, readNum);
            }

            fis.close();
        } catch (IOException ex) {
            ex.printStackTrace();
        }

        return bos;
    }

    private static void handleNoShow(User user, Long examId, EmailComposer composer) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where()
                .eq("user", user)
                .eq("reservation.noShow", false)
                .lt("reservation.endAt", new Date())
                .eq("exam.id", examId)
                .eq("exam.state", Exam.State.PUBLISHED)
                .findList();
        NoShowHandlerUtil.handleNoShows(enrolments, composer, null);
    }

    boolean isAllowedToParticipate(Exam exam, User user, EmailComposer composer) {
        handleNoShow(user, exam.getId(), composer);
        Integer trialCount = exam.getTrialCount();
        if (trialCount == null) {
            return true;
        }
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam")
                .where()
                .eq("user", user)
                .eq("exam.parent.id", exam.getId())
                .ne("exam.state", Exam.State.DELETED)
                .ne("reservation.retrialPermitted", true)
                .findList();
        List<ExamEnrolment> noShows = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .where()
                .eq("user", user)
                .eq("exam.id", exam.getId())
                .eq("reservation.noShow", true)
                .ne("reservation.retrialPermitted", true)
                .findList();
        List<CountsAsTrial> trials = new ArrayList<>(participations);
        trials.addAll(noShows);
        // Sort by trial time desc
        Collections.sort(trials, (o1, o2) -> o1.getTrialTime().after(o2.getTrialTime()) ? -1 : 1);

        if (trials.size() >= trialCount) {
            List<CountsAsTrial> subset = trials.subList(0, trialCount);
            return subset.stream().anyMatch(CountsAsTrial::isProcessed);
        }
        return true;
    }

    CompletionStage<Result> wrapAsPromise(final Result result) {
        return CompletableFuture.supplyAsync(() -> result);
    }
}
