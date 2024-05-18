// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package security;

import be.objectify.deadbolt.java.DeadboltHandler;
import be.objectify.deadbolt.java.DynamicResourceHandler;
import be.objectify.deadbolt.java.models.Subject;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import javax.inject.Singleton;
import models.Permission;
import models.Role;
import models.User;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

@Singleton
class AuthorizationHandler implements DeadboltHandler {

    @Inject
    AuthorizationHandler() {}

    @Override
    public long getId() {
        return 0;
    }

    @Override
    public CompletableFuture<Optional<Result>> beforeAuthCheck(Http.RequestHeader request, Optional<String> content) {
        return CompletableFuture.completedFuture(Optional.empty());
    }

    @Override
    public CompletionStage<Optional<? extends Subject>> getSubject(Http.RequestHeader request) {
        Http.Session session = request.session();
        if (session.get("id").isEmpty()) {
            return CompletableFuture.completedFuture(Optional.empty());
        }
        User user = new User();
        session.get("role").ifPresent(r -> user.setRoles(List.of(Role.withName(session.get("role").get()))));
        session
            .get("permissions")
            .ifPresent(p -> {
                Optional<Permission> permission = Permission.withValue(p);
                permission.ifPresent(value -> user.setPermissions(List.of(value)));
            });
        return CompletableFuture.completedFuture(Optional.of(user));
    }

    @Override
    public CompletionStage<Result> onAuthFailure(Http.RequestHeader request, Optional<String> content) {
        return CompletableFuture.completedFuture(Results.forbidden("Authentication failure"));
    }

    @Override
    public CompletionStage<Optional<DynamicResourceHandler>> getDynamicResourceHandler(Http.RequestHeader request) {
        return CompletableFuture.completedFuture(Optional.of(new CombinedRoleAndPermissionHandler()));
    }
}
