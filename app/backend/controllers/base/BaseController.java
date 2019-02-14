/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.controllers.base;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.inject.Inject;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.text.PathProperties;
import play.Logger;
import play.cache.SyncCacheApi;
import play.data.Form;
import play.data.FormFactory;
import play.libs.typedmap.TypedKey;
import play.mvc.Controller;
import play.mvc.Http;
import play.mvc.Result;

import backend.exceptions.MalformedDataException;
import backend.impl.EmailComposer;
import backend.impl.NoShowHandler;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamParticipation;
import backend.models.Reservation;
import backend.models.Role;
import backend.models.Session;
import backend.models.User;
import backend.models.api.CountsAsTrial;
import backend.system.interceptors.AnonymousJsonAction;

public class BaseController extends Controller {

    public static final String SITNET_CACHE_KEY = "user.session.";

    protected static final int SITNET_TIMEOUT_MINUTES = 30;
    protected static final String LOGIN_TYPE = ConfigFactory.load().getString("sitnet.login");

    private static final double HUNDRED = 100d;
    public static final String SITNET_TOKEN_HEADER_KEY = "x-exam-authentication";

    private static final Logger.ALogger logger = Logger.of(BaseController.class);

    @Inject
    protected SyncCacheApi cache;
    @Inject
    protected FormFactory formFactory;
    @Inject
    private NoShowHandler noShowHandler;

    protected <T> T bindForm(final Class<T> clazz, Http.Request request) {
        final Form<T> form = formFactory.form(clazz);
        if (form.hasErrors()) {
            throw new MalformedDataException(form.errorsAsJson().asText());
        }
        return form.bindFromRequest(request).get();
    }

    protected Result ok(Object object) {
        String body = Ebean.json().toJson(object);
        return ok(body).as("application/json");
    }

    protected Result ok(Object object, PathProperties props) {
        String body = Ebean.json().toJson(object, props);
        return ok(body).as("application/json");
    }

    protected Result created(Object object) {
        String body = Ebean.json().toJson(object);
        return created(body).as("application/json");
    }

    protected Result created(Object object, PathProperties props) {
        String body = Ebean.json().toJson(object, props);
        return created(body).as("application/json");
    }

    private Optional<String> createToken(Http.Request request) {
        return LOGIN_TYPE.equals("HAKA") ?
                request.header("Shib-Session-ID") :
                Optional.of(UUID.randomUUID().toString());
    }

    @Deprecated
    public static Optional<String> getToken(Http.Request request) {
        return request.header(LOGIN_TYPE.equals("HAKA") ? "Shib-Session-ID" : SITNET_TOKEN_HEADER_KEY);
    }

    @Deprecated
    public static Optional<String> getToken(Http.Context ctx) {
        return ctx.request().header(LOGIN_TYPE.equals("HAKA") ? "Shib-Session-ID" : SITNET_TOKEN_HEADER_KEY);
    }

    @Deprecated
    protected User getLoggedUser(Http.Request request) {
        Optional<Session> session = cache.getOptional(SITNET_CACHE_KEY + getToken(request).orElse(""));
        if (session.isPresent()) {
            Optional<User> ou = session.map(session1 -> Ebean.find(User.class, session1.getUserId()));
            if (ou.isPresent()) {
                User user = ou.get();
                user.setLoginRole(Role.Name.valueOf(session.get().getLoginRole()));
                return user;
            }
        }
        return null;
    }

    @Deprecated
    protected Optional<Session> getSession(Http.Request request) {
        return cache.getOptional(SITNET_CACHE_KEY + getToken(request).orElse(""));
    }

    protected void updateSession(Session session, Http.Request request) {
        cache.set(SITNET_CACHE_KEY + getToken(request).orElse(""), session);
    }

    protected String createSession(Session session, Http.Request request) {
        String token = createToken(request).orElse("INVALID");
        cache.set(SITNET_CACHE_KEY + token, session);
        return token;
    }

    protected <T> ExpressionList<T> applyUserFilter(String prefix, ExpressionList<T> query, String filter) {
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

    private void handleNoShow(User user, Long examId, EmailComposer composer) {

        List<Reservation> reservations = Ebean.find(Reservation.class)
                .fetch("enrolment")
                .fetch("enrolment.exam")
                .where()
                .eq("user", user)
                .eq("noShow", false)
                .lt("endAt", new Date())
                // Either a) exam id matches and exam state is published OR
                //        b) collaborative exam id matches and exam is NULL
                .or()
                .and()
                .eq("enrolment.exam.id", examId)
                .eq("enrolment.exam.state", Exam.State.PUBLISHED)
                .endAnd()
                .and()
                .eq("enrolment.collaborativeExam.id", examId)
                .isNull("enrolment.exam")
                .endAnd()
                .endOr()
                .isNull("externalReservation")
                .findList();
        noShowHandler.handleNoShows(reservations);
    }

    protected boolean isAllowedToParticipate(Exam exam, User user, EmailComposer composer) {
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
        trials.sort((o1, o2) -> o1.getTrialTime().isAfter(o2.getTrialTime()) ? -1 : 1);

        if (trials.size() >= trialCount) {
            List<CountsAsTrial> subset = trials.subList(0, trialCount);
            return subset.stream().anyMatch(CountsAsTrial::isProcessed);
        }
        return true;
    }

    protected CompletionStage<Result> wrapAsPromise(Result result) {
        return CompletableFuture.supplyAsync(() -> result);
    }

    protected boolean isUserAdmin(Http.Request request) {
        return getLoggedUser(request).hasRole(Role.Name.ADMIN);
    }

    protected Double round(Double src) {
        return src == null ? null : Math.round(src * HUNDRED) / HUNDRED;
    }

    protected Result writeAnonymousResult(Http.Request request, Result result, boolean anonymous, boolean admin) {
        if (anonymous && !admin) {
            return withAnonymousHeader(result, request, Collections.emptySet());
        }
        return result;
    }

    protected Result writeAnonymousResult(Http.Request request, Result result, boolean anonymous) {
        return writeAnonymousResult(request, result, anonymous, isUserAdmin(request));
    }

    protected Result writeAnonymousResult(Http.Request request, Result result, Set<Long> anonIds) {
        if (!anonIds.isEmpty() && !getLoggedUser(request).hasRole(Role.Name.ADMIN)) {
            return withAnonymousHeader(result, request, anonIds);
        }
        return result;
    }

    private Result withAnonymousHeader(Result result, Http.Request request, Set<Long> anonIds) {
        TypedKey<Set<Long>> tk = TypedKey.create(AnonymousJsonAction.CONTEXT_KEY);
        request.addAttr(tk, anonIds);
        return result.withHeader(AnonymousJsonAction.ANONYMOUS_HEADER, Boolean.TRUE.toString());
    }

    protected JsonNode serialize(Object o) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            String json = mapper.writeValueAsString(o);
            return mapper.readTree(json);
        } catch (IOException e) {
            logger.error("unable to serialize");
            throw new RuntimeException(e);
        }
    }
}
