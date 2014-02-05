package controllers;

import java.util.UUID;

import models.Credentials;
import models.User;
import models.UserSession;
import play.Logger;
import play.cache.Cache;
import play.data.Form;
import play.mvc.Controller;
import play.mvc.Result;

import java.sql.Timestamp;


public class Login extends Controller {

    public static Result login() {

        Form<Credentials> credentialsForm = Form.form(Credentials.class);
        Credentials credentials = credentialsForm.bindFromRequest().get();

        Logger.debug("username formilta:" + credentials.getUsername());
        Logger.debug("password formilta:" + credentials.getPassword());

        User user = UserController.authenticate(credentials.getUsername(), credentials.getPassword());

        if (user == null) {
            Logger.debug("Forbidden!");
            return forbidden("fail");
        } else {
            Logger.debug("Authenticated!");

            String uuid = UUID.randomUUID().toString();
            
            // TODO: Timestamp
            UserSession usession = new UserSession(user.getId(), user.getEmail(), new Timestamp(System.currentTimeMillis()), uuid);
            Cache.set("user.session."+ usession.getUid(), usession, 30 * 60);	// 30 * 60s == 30 minutes
            
            UserSession another = (UserSession)Cache.get("user.session."+ user.getId());
            Logger.debug(another.toString());
            
            
            Logger.debug("UUID:" + uuid);
            return ok(uuid);
        }
    }

    public static Result logout(String token) {
        return ok("success");
    }

    //todo: add method to get user data with proper token
    public static Result loggedin() {
        return ok("0");
    }

    //todo: add method to get token with proper password and username(? should we use oid or some else) combination

    //todo: add methods for list user from different groups

}
