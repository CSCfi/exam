package security;

import be.objectify.deadbolt.core.models.Subject;
import be.objectify.deadbolt.java.AbstractDeadboltHandler;
import com.avaje.ebean.Ebean;
import controllers.BaseController;
import models.Session;
import models.User;
import play.cache.Cache;
import play.libs.F;
import play.mvc.Http;
import play.mvc.Result;

import java.util.Optional;
import java.util.stream.Collectors;

public class DeadboltHandler extends AbstractDeadboltHandler {

    @Override
    public F.Promise<Optional<Result>> beforeAuthCheck(Http.Context context) {
        return F.Promise.promise(Optional::empty);
    }

    @Override
    public F.Promise<Optional<Subject>> getSubject(Http.Context context) {
        String token = context.request().getHeader(BaseController.SITNET_TOKEN_HEADER_KEY);
        Session session = (Session) Cache.get(BaseController.SITNET_CACHE_KEY + token);
        User user = session == null ? null : Ebean.find(User.class, session.getUserId());
        // filter out roles not found in session
        if (user != null) {
            user.setRoles(user.getRoles().stream().filter((r) -> r.getName().equals(session.getLoginRole())).collect(Collectors.toList()));
        }
        return F.Promise.promise(() -> Optional.ofNullable(user));
    }

    @Override
    public F.Promise<Result> onAuthFailure(Http.Context context, String content) {
        return F.Promise.promise(() -> forbidden("Authentication failure"));
    }

}
