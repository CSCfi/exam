package system.interceptors;

import controllers.base.BaseController;
import models.Session;
import play.cache.CacheApi;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;

import javax.inject.Inject;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public class ExamActionRouterImpl extends Action<ExamActionRouter> {

    @Inject
    CacheApi cache;

    @Override
    public CompletionStage<Result> call(Http.Context ctx) {
        String token = BaseController.getToken(ctx);
        Session session = cache.get(BaseController.SITNET_CACHE_KEY + token);
        if (session != null && session.isTemporalStudent()) {
            return CompletableFuture.supplyAsync(
                    () -> redirect(ctx.request().path().replace("/app/", "/app/iop/"))
            );
        }
        return delegate.call(ctx);
    }

}
