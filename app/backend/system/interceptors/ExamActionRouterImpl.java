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

package backend.system.interceptors;

import backend.controllers.base.BaseController;
import backend.models.Session;
import play.cache.SyncCacheApi;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;

import javax.inject.Inject;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public class ExamActionRouterImpl extends Action<ExamActionRouter> {

    private final SyncCacheApi cache;

    @Inject
    public ExamActionRouterImpl(SyncCacheApi cache) {
        this.cache = cache;
    }

    @Override
    public CompletionStage<Result> call(Http.Context ctx) {
        String token = BaseController.getToken(ctx).orElse("");
        Session session = cache.get(BaseController.SITNET_CACHE_KEY + token);
        if (session != null && session.isTemporalStudent()) {
            return CompletableFuture.supplyAsync(
                    () -> redirect(ctx.request().path().replace("/app/", "/app/iop/"))
            );
        }
        return delegate.call(ctx);
    }

}
