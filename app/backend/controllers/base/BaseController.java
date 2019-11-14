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
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.inject.Inject;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.text.PathProperties;
import play.Logger;
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
import backend.models.User;
import backend.models.api.CountsAsTrial;
import backend.sanitizers.Attrs;
import backend.system.interceptors.AnonymousJsonAction;

public class BaseController extends Controller {

    private static final Logger.ALogger logger = Logger.of(BaseController.class);

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
        // Sort by trial time desc
        List<CountsAsTrial> trials = Stream.concat(participations.stream(), noShows.stream())
                .sorted(Comparator.comparing(CountsAsTrial::getTrialTime).reversed())
                .collect(Collectors.toList());

        if (trials.size() >= trialCount) {
            return trials.stream().limit(trialCount).anyMatch(CountsAsTrial::isProcessed);
        }
        return true;
    }

    protected CompletionStage<Result> wrapAsPromise(Result result) {
        return CompletableFuture.supplyAsync(() -> result);
    }

    protected Result writeAnonymousResult(Http.Request request, Result result, boolean anonymous, boolean admin) {
        if (anonymous && !admin) {
            return withAnonymousHeader(result, request, Collections.emptySet());
        }
        return result;
    }

    protected Result writeAnonymousResult(Http.Request request, Result result, boolean anonymous) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return writeAnonymousResult(request, result, anonymous, user.hasRole(Role.Name.ADMIN));
    }

    protected Result writeAnonymousResult(Http.Request request, Result result, Set<Long> anonIds) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!anonIds.isEmpty() && !user.hasRole(Role.Name.ADMIN)) {
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
