// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package security;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import models.user.Role;
import models.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.concurrent.ClassLoaderExecutionContext;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;
import repository.UserRepository;
import validation.java.core.Attrs;

public class AuthenticatedAction extends Action<Authenticated> {

    private final ClassLoaderExecutionContext ec;
    private final UserRepository userRepository;

    private final Logger logger = LoggerFactory.getLogger(AuthenticatedAction.class);

    @Inject
    public AuthenticatedAction(ClassLoaderExecutionContext ec, UserRepository userRepository) {
        this.ec = ec;
        this.userRepository = userRepository;
    }

    private CompletionStage<Optional<User>> getLoggedInUser(Http.Request request) {
        Map<String, String> session = request.session().data();
        if (session.containsKey("id")) {
            return userRepository
                .getLoggedInUser(Long.parseLong(session.get("id")))
                .thenApplyAsync(
                    ou -> {
                        if (ou.isPresent()) {
                            User user = ou.get();
                            user.setLoginRole(Role.Name.valueOf(session.get("role")));
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
        return getLoggedInUser(request).thenComposeAsync(
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
