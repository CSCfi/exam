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

package controllers.base;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.inject.Inject;
import impl.NoShowHandler;
import io.ebean.DB;
import io.ebean.ExpressionList;
import io.ebean.text.PathProperties;
import java.io.IOException;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import models.Exam;
import models.ExamEnrolment;
import models.Role;
import models.User;
import play.data.FormFactory;
import play.libs.concurrent.ClassLoaderExecutionContext;
import play.libs.typedmap.TypedKey;
import play.mvc.Controller;
import play.mvc.Http;
import play.mvc.Result;
import sanitizers.Attrs;
import system.interceptors.AnonymousJsonAction;

public class BaseController extends Controller {

    @Inject
    protected FormFactory formFactory;

    @Inject
    protected ClassLoaderExecutionContext ec;

    @Inject
    protected NoShowHandler noShowHandler;

    protected Result ok(Object object) {
        var body = DB.json().toJson(object);
        return ok(body).as("application/json");
    }

    protected Result ok(Object object, PathProperties props) {
        var body = DB.json().toJson(object, props);
        return ok(body).as("application/json");
    }

    protected Result created(Object object) {
        var body = DB.json().toJson(object);
        return created(body).as("application/json");
    }

    protected Result created(Object object, PathProperties props) {
        var body = DB.json().toJson(object, props);
        return created(body).as("application/json");
    }

    protected <T> ExpressionList<T> applyUserFilter(String prefix, ExpressionList<T> query, String filter) {
        var result = query;
        var rawFilter = filter.replaceAll(" +", " ").trim();
        var condition = String.format("%%%s%%", rawFilter);
        var fnField = prefix == null ? "firstName" : String.format("%s.firstName", prefix);
        var lnField = prefix == null ? "lastName" : String.format("%s.lastName", prefix);
        if (rawFilter.contains(" ")) {
            // Possible that user provided us two names. Let's try out some combinations of first and last names
            var name1 = rawFilter.split(" ")[0];
            var name2 = rawFilter.split(" ")[1];
            result =
                result
                    .or()
                    .and()
                    .ilike(fnField, String.format("%%%s%%", name1))
                    .ilike(lnField, String.format("%%%s%%", name2))
                    .endAnd()
                    .and()
                    .ilike(fnField, String.format("%%%s%%", name2))
                    .ilike(lnField, String.format("%%%s%%", name1))
                    .endAnd()
                    .endOr();
        } else {
            result = result.ilike(fnField, condition).ilike(lnField, condition);
        }
        return result;
    }

    private void handleNoShow(User user, Long examId) {
        var enrolments = DB
            .find(ExamEnrolment.class)
            .fetch("reservation")
            .fetch("exam")
            .where()
            .eq("user", user)
            .eq("noShow", false)
            .or()
            .lt("reservation.endAt", new Date())
            .lt("examinationEventConfiguration.examinationEvent.start", new Date()) // FIXME: exam period
            .endOr()
            // Either (a) exam id matches and exam state is published OR
            //        (b) collaborative exam id matches and exam is NULL
            .or()
            .and()
            .eq("exam.id", examId)
            .eq("exam.state", Exam.State.PUBLISHED)
            .endAnd()
            .and()
            .eq("collaborativeExam.id", examId)
            .isNull("exam")
            .endAnd()
            .endOr()
            .isNull("reservation.externalReservation")
            .findList();
        noShowHandler.handleNoShows(enrolments, Collections.emptyList());
    }

    protected boolean isAllowedToParticipate(Exam exam, User user) {
        handleNoShow(user, exam.getId());
        Integer trialCount = exam.getTrialCount();
        if (trialCount == null) {
            return true;
        }
        var trials = DB
            .find(ExamEnrolment.class)
            .fetch("exam")
            .where()
            .eq("user", user)
            .eq("exam.parent.id", exam.getId())
            .ne("exam.state", Exam.State.DELETED)
            .ne("exam.state", Exam.State.INITIALIZED)
            .ne("retrialPermitted", true)
            .findList()
            .stream()
            .sorted(Comparator.comparing(ExamEnrolment::getId).reversed())
            .toList();

        if (trials.size() >= trialCount) {
            return trials.stream().limit(trialCount).anyMatch(ExamEnrolment::isProcessed);
        }
        return true;
    }

    protected CompletionStage<Result> wrapAsPromise(Result result) {
        return CompletableFuture.completedFuture(result);
    }

    protected Result writeAnonymousResult(Http.Request request, Result result, boolean anonymous, boolean admin) {
        if (anonymous && !admin) {
            return withAnonymousHeader(result, request, Collections.emptySet());
        }
        return result;
    }

    protected Result writeAnonymousResult(Http.Request request, Result result, boolean anonymous) {
        var user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return writeAnonymousResult(request, result, anonymous, user.hasRole(Role.Name.ADMIN));
    }

    protected Result writeAnonymousResult(Http.Request request, Result result, Set<Long> anonIds) {
        var user = request.attrs().get(Attrs.AUTHENTICATED_USER);
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
        var mapper = new ObjectMapper();
        try {
            var json = mapper.writeValueAsString(o);
            return mapper.readTree(json);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    protected JsonNode serialize(Object o, PathProperties pp) {
        var mapper = new ObjectMapper();
        try {
            var json = DB.json().toJson(o, pp);
            return mapper.readTree(json);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
