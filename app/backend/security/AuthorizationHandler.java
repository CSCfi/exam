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

import be.objectify.deadbolt.java.ConfigKeys;
import be.objectify.deadbolt.java.DeadboltHandler;
import be.objectify.deadbolt.java.DynamicResourceHandler;
import be.objectify.deadbolt.java.models.Subject;
import backend.controllers.base.BaseController;
import io.ebean.Ebean;
import backend.models.Role;
import backend.models.Session;
import backend.models.User;
import play.cache.SyncCacheApi;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;


@Singleton
class AuthorizationHandler implements DeadboltHandler {

    private final SyncCacheApi cache;

    @Inject
    AuthorizationHandler(final SyncCacheApi cacheApi) {
        this.cache = cacheApi;
    }

    @Override
    public CompletableFuture<Optional<Result>> beforeAuthCheck(Http.Context context) {
        return CompletableFuture.supplyAsync(Optional::empty);
    }

    @Override
    public CompletionStage<Optional<? extends Subject>> getSubject(final Http.Context context) {
        String token = BaseController.getToken(context).orElse("");
        Session session = cache.get(BaseController.SITNET_CACHE_KEY + token);
        User user = session == null ? null : Ebean.find(User.class, session.getUserId());
        // filter out roles not found in session
        if (user != null) {
            if (session.isTemporalStudent()) {
                user.getRoles().clear();
                user.getRoles().add(Ebean.find(Role.class).where().eq("name", Role.Name.STUDENT.toString()).findUnique());
            } else {
                user.setRoles(user.getRoles().stream()
                        .filter((r) -> r.getName().equals(session.getLoginRole()))
                        .collect(Collectors.toList()));
            }
        }
        return CompletableFuture.supplyAsync(() -> Optional.ofNullable(user));
    }

    @Override
    public CompletionStage<Result> onAuthFailure(Http.Context context, Optional<String> optional) {
        return CompletableFuture.supplyAsync(() -> Results.forbidden("Authentication failure"));
    }

    @Override
    public CompletionStage<Optional<DynamicResourceHandler>> getDynamicResourceHandler(Http.Context context) {
        return CompletableFuture.completedFuture(Optional.of(new CombinedRoleAndPermissionHandler()));
    }

    @Override
    public String handlerName() {
        return ConfigKeys.DEFAULT_HANDLER_KEY;
    }

}
