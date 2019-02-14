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

package backend.system.interceptors;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;

import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import play.Logger;
import play.cache.SyncCacheApi;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import backend.models.Role;
import backend.models.Session;
import backend.models.User;
import backend.sanitizers.Attrs;

public class AuthenticatedAction extends Action<Authenticated> {

    private SyncCacheApi cache;

    private static final String LOGIN_TYPE = ConfigFactory.load().getString("sitnet.login");
    private static final Logger.ALogger logger = Logger.of(AuthenticatedAction.class);

    @Inject
    public AuthenticatedAction(SyncCacheApi cache) {
        this.cache = cache;
    }

    private Optional<String> getToken(Http.Request request) {
        return request.header(LOGIN_TYPE.equals("HAKA") ? "Shib-Session-ID" : configuration.tokenHeader());
    }

    private Optional<User> getLoggedInUser(Http.Request request) {
        Optional<Session> session =
                cache.getOptional(configuration.cacheKey() + getToken(request).orElse(""));
        if (session.isPresent()) {
            Optional<User> ou = session.map(s -> Ebean.find(User.class, s.getUserId()));
            if (ou.isPresent()) {
                User user = ou.get();
                user.setLoginRole(Role.Name.valueOf(session.get().getLoginRole()));
                return Optional.of(user);
            }
        }
        return Optional.empty();
    }

    @Override
    public CompletionStage<Result> call(Http.Request request) {
        Optional<User> ou = getLoggedInUser(request);
        if (ou.isPresent()) {
            User user = ou.get();
            return delegate.call(request.addAttr(Attrs.AUTHENTICATED_USER, user));
        }
        logger.info("Blocked unauthorized access to {}", request.path());
        return CompletableFuture.supplyAsync(Results::unauthorized);
    }

}
