package controllers;

import Exceptions.MalformedDataException;
import Exceptions.UnauthorizedAccessException;
import actions.Authenticate;

import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.node.ObjectNode;

import models.Credentials;
import models.Session;
import models.User;

import org.joda.time.DateTime;

import play.Logger;
import play.cache.Cache;
import play.libs.Json;
import play.mvc.Result;

import java.util.UUID;

public class SessionController extends SitnetController {

    public static Result login() throws MalformedDataException, UnauthorizedAccessException {
        Credentials credentials = bindForm(Credentials.class);
        Logger.debug("User login with username: {} and password: ***", credentials.getUsername());
        User user = Ebean.find(User.class).where().eq("email", credentials.getUsername()).eq("password", credentials.getPassword()).findUnique();
        if (user == null) {
            return unauthorized("Incorrect username or password.");
        }
        String token = UUID.randomUUID().toString();
        Session session = new Session();
        session.setSince(DateTime.now());
        session.setUserId(user.getId());
        Cache.set(SITNET_CACHE_KEY + token, session);
        ObjectNode result = Json.newObject();
        result.put("token", token);
        result.put("firstname", user.getFirstName());
        result.put("lastname", user.getLastName());
        return ok(result);
    }

    @Authenticate
    public static Result logout() {
        String token = request().getHeader(SITNET_TOKEN_HEADER_KEY);
        Cache.remove(SITNET_CACHE_KEY + token);
        return ok("Successfully logged out!");
    }

    @Authenticate
    public static Result ping() {
        String token = request().getHeader(SITNET_TOKEN_HEADER_KEY);
        Session session = (Session) Cache.get(SITNET_CACHE_KEY + token);
        session.setSince(DateTime.now());
        Cache.set(SITNET_CACHE_KEY + token, session);
        return ok("pong");
    }
}
