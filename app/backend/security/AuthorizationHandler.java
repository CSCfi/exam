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

package backend.security;

import backend.models.Role;
import backend.models.Session;
import backend.models.User;
import be.objectify.deadbolt.java.DeadboltHandler;
import be.objectify.deadbolt.java.DynamicResourceHandler;
import be.objectify.deadbolt.java.models.Subject;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import javax.inject.Singleton;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

@Singleton
class AuthorizationHandler implements DeadboltHandler {
    private SessionHandler sessionHandler;

    @Inject
    AuthorizationHandler(final SessionHandler sessionHandler) {
        this.sessionHandler = sessionHandler;
    }

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
        Optional<Session> os = sessionHandler.getSession(request);
        if (os.isPresent()) {
            User user = new User();
            Session session = os.get();
            user.setRoles(List.of(Role.withName(session.getLoginRole())));
            return CompletableFuture.completedFuture(Optional.of(user));
        }
        return CompletableFuture.completedFuture(Optional.empty());
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
