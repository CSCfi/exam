package security;

import be.objectify.deadbolt.java.AbstractDeadboltHandler;
import be.objectify.deadbolt.java.models.Subject;
import com.avaje.ebean.Ebean;
import controllers.BaseController;
import models.Session;
import models.User;
import net.sf.ehcache.Cache;
import net.sf.ehcache.CacheManager;
import net.sf.ehcache.Element;
import play.mvc.Http;
import play.mvc.Result;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;


public class DeadboltHandler extends AbstractDeadboltHandler {

    // Can't use DI here
    private Cache cache = CacheManager.getInstance().getCache("play");

    @Override
    public CompletableFuture<Optional<Result>> beforeAuthCheck(Http.Context context) {
        return CompletableFuture.supplyAsync(Optional::empty);
    }

    @Override
    public CompletionStage<Optional<? extends Subject>> getSubject(final Http.Context context) {
        String token = BaseController.getToken(context);
        Element element = cache.get(BaseController.SITNET_CACHE_KEY + token);
        if (element != null) {
            Session session = (Session) element.getObjectValue();
            User user = session == null ? null : Ebean.find(User.class, session.getUserId());
            // filter out roles not found in session
            if (user != null) {
                user.setRoles(user.getRoles().stream()
                        .filter((r) -> r.getName().equals(session.getLoginRole()))
                        .collect(Collectors.toList()));
            }
            return CompletableFuture.supplyAsync(() -> Optional.ofNullable(user));
        } else {
            return CompletableFuture.supplyAsync(Optional::empty);
        }
    }

    @Override
    public CompletableFuture<Result> onAuthFailure(Http.Context context, String content) {
        return  CompletableFuture.supplyAsync(() -> forbidden("Authentication failure"));
    }


}
