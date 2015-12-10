package controllers;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.google.inject.Inject;
import com.typesafe.config.ConfigFactory;
import exceptions.MalformedDataException;
import models.Session;
import models.User;
import play.cache.CacheApi;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.F;
import play.mvc.Controller;
import play.mvc.Http;
import play.mvc.Result;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public class BaseController extends Controller {

    public static final String SITNET_TOKEN_HEADER_KEY = "x-exam-authentication";
    public static final String SITNET_CACHE_KEY = "user.session.";
    public static final int SITNET_TIMEOUT_MINUTES = 30;

    protected static final String LOGIN_TYPE = ConfigFactory.load().getString("sitnet.login");

    @Inject
    protected CacheApi cache;

    public <T> T bindForm(final Class<T> clazz) {
        final Form<T> form = Form.form(clazz);
        if (form.hasErrors()) {
            throw new MalformedDataException(form.errorsAsJson().asText());
        }
        return form.bindFromRequest().get();
    }

    protected Result ok(Object object) {
        String body = Ebean.json().toJson(object);
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

    public static String getToken(Http.Request request) {
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

    protected void updateSession(Session session) {
        cache.set(SITNET_CACHE_KEY + getToken(), session);
    }

    protected String createSession(Session session) {
        String token = createToken();
        cache.set(SITNET_CACHE_KEY + token, session);
        return token;
    }

    protected List<String> parseArrayFieldFromBody(String field) {
        DynamicForm df = Form.form().bindFromRequest();
        String args = df.get(field);
        String[] array;
        if (args == null || args.isEmpty()) {
            array = new String[]{};
        } else {
            array = args.split(",");
        }
        return Arrays.asList(array);
    }

    protected <T> ExpressionList<T> applyUserFilter(String prefix, ExpressionList<T> query, String filter) {
        String rawFilter = filter.replaceAll(" +", " ").trim();
        String condition = String.format("%%%s%%", rawFilter);
        String fnField = prefix == null ? "firstName" : String.format("%s.firstName", prefix);
        String lnField = prefix == null ? "lastName" : String.format("%s.lastName", prefix);
        if (rawFilter.contains(" ")) {
            // Possible that user provided us two names. Lets try out some combinations of first and last names
            String name1 = rawFilter.split(" ")[0];
            String name2 = rawFilter.split(" ")[1];
            query = query.disjunction().conjunction()
                    .ilike(fnField, String.format("%%%s%%", name1))
                    .ilike(lnField, String.format("%%%s%%", name2))
                    .endJunction().conjunction()
                    .ilike(fnField, String.format("%%%s%%", name2))
                    .ilike(lnField, String.format("%%%s%%", name1))
                    .endJunction().endJunction();
        } else {
            query = query.ilike(fnField, condition)
                    .ilike(lnField, condition);
        }
        return query;
    }

    protected F.Promise<Result> wrapAsPromise(final Result result) {
        return F.Promise.promise(() -> result);
    }
}
