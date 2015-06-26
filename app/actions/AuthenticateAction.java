package actions;

import controllers.SitnetController;
import exceptions.AuthenticateException;
import models.Session;
import org.joda.time.DateTime;
import play.cache.Cache;
import play.libs.F.Promise;
import play.mvc.Action;
import play.mvc.Http.Context;
import play.mvc.Result;

public class AuthenticateAction extends Action<Authenticate> {

    public static final String SITNET_CACHE_KEY = "user.session.";
    public static final int SITNET_TIMEOUT_MINUTES = 30;

    @Override
    public Promise<Result> call(Context ctx) throws Throwable {
        String token = ctx.request().getHeader(SitnetController.SITNET_TOKEN_HEADER_KEY);
        Session session = (Session) Cache.get(SITNET_CACHE_KEY + token);
        if (null == session) {
            throw new AuthenticateException("Invalid token: no such token.");
        }
        DateTime lastValidMoment = DateTime.now().minusMinutes(SITNET_TIMEOUT_MINUTES);
        if (session.getSince().isBefore(lastValidMoment)) {
            throw new AuthenticateException("Invalid token: token expired.");
        }
        session.setSince(DateTime.now());
        Cache.set(SITNET_CACHE_KEY + token, session);
        return delegate.call(ctx);
    }
}
