package controllers;

import java.util.UUID;

import models.Credentials;
import models.User;
import models.UserSession;
import org.joda.time.DateTime;
import org.joda.time.Period;
import play.Logger;
import play.cache.Cache;
import play.data.Form;
import play.mvc.Controller;
import play.mvc.Result;

import java.sql.Timestamp;


public class SessionController extends SitnetController {

    public static Result login() {

        Form<Credentials> credentialsForm = Form.form(Credentials.class);
        Credentials credentials = credentialsForm.bindFromRequest().get();

        Logger.debug("username formilta:" + credentials.getUsername());
        Logger.debug("password formilta:" + credentials.getPassword());

        User user = UserController.authenticate(credentials.getUsername(), credentials.getPassword());

        if (user == null) {
            Logger.debug("Forbidden!");
            return unauthorized("fail");
        } else {
            Logger.debug("Authenticated!");

            String uuid = UUID.randomUUID().toString();

            // TODO: Timestamp
            UserSession userSession = new UserSession(user.getId(), user.getEmail(), new Timestamp(System.currentTimeMillis()), uuid);
            Cache.set(CACHE_KEY + userSession.getUid(), userSession);
            UserSession another = (UserSession) Cache.get(CACHE_KEY + user.getId());
            Logger.debug(another.toString());


            Logger.debug("UUID:" + uuid);
            return ok(uuid);
        }
    }

    public static Result logout() {
        if (!isTokenValid()) {
            ok("Cannot log out! - the token in already invalid!");
        }
        String token = request().getHeader("SITNET_TOKEN_HEADER_KEY");
        Cache.remove(CACHE_KEY + token);
        return ok("Successfully logged out!");
    }

    public static Result getUserInfoByToken() {
        if (!isTokenValid()) {
            unauthorized("Invalid token!");
        }
        String token = request().getHeader("SITNET_TOKEN_HEADER_KEY");
        UserSession session = (UserSession) Cache.get(CACHE_KEY + token);
        return ok(session.getEmail());
    }

    public static Result ping() {
        if (isTokenValid()) {
            String token = request().getHeader("SITNET_TOKEN_HEADER_KEY");
            UserSession session = (UserSession) Cache.get(CACHE_KEY + token);
            session.setTimestamp(new Timestamp(System.currentTimeMillis()));
            Cache.set(CACHE_KEY + token, session);
            ok("pong");
        }
        return unauthorized("kaboom");
    }
    //todo: add method to get token with proper password and username(? should we use oid or some else) combination

    //todo: add methods for list user from different groups

}
