/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */

package backend.security;

import backend.models.Role;
import backend.models.Session;
import backend.models.User;
import backend.repository.UserRepository;
import backend.sanitizers.Attrs;
import com.sun.net.httpserver.HttpContext;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import play.Logger;
import play.libs.concurrent.HttpExecutionContext;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

public class AuthenticatedAction extends Action<Authenticated> {
    private final HttpExecutionContext ec;
    private final SessionHandler sessionHandler;
    private final UserRepository userRepository;

    private static final Logger.ALogger logger = Logger.of(AuthenticatedAction.class);

    @Inject
    public AuthenticatedAction(HttpExecutionContext ec, SessionHandler sessionHandler, UserRepository userRepository) {
        this.ec = ec;
        this.sessionHandler = sessionHandler;
        this.userRepository = userRepository;
    }

    private CompletionStage<Optional<User>> getLoggedInUser(Http.Request request) {
        Optional<Session> session = sessionHandler.getSession(request);
        if (session.isPresent()) {
            return userRepository
                .getLoggedInUser(session.get())
                .thenApplyAsync(
                    ou -> {
                        if (ou.isPresent()) {
                            User user = ou.get();
                            user.setLoginRole(Role.Name.valueOf(session.get().getLoginRole()));
                            return Optional.of(user);
                        }
                        return Optional.empty();
                    },
                    ec.current()
                );
        }
        return CompletableFuture.completedFuture(Optional.empty());
    }

    @Override
    public CompletionStage<Result> call(Http.Request request) {
        return getLoggedInUser(request)
            .thenComposeAsync(
                ou -> {
                    if (ou.isPresent()) {
                        User user = ou.get();
                        return delegate.call(request.addAttr(Attrs.AUTHENTICATED_USER, user));
                    }
                    logger.info("Blocked unauthorized access to {}", request.path());
                    return CompletableFuture.completedFuture(Results.unauthorized());
                },
                ec.current()
            );
    }
}
