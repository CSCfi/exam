// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.base;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.inject.Inject;
import impl.NoShowHandler;
import io.ebean.DB;
import io.ebean.text.PathProperties;
import java.io.IOException;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import models.user.Role;
import play.data.FormFactory;
import play.libs.concurrent.ClassLoaderExecutionContext;
import play.libs.typedmap.TypedKey;
import play.mvc.Controller;
import play.mvc.Http;
import play.mvc.Result;
import system.interceptors.AnonymousJsonAction;
import validation.core.Attrs;

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
        var json = DB.json().toJson(o, pp);
        try {
            return mapper.readTree(json);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
