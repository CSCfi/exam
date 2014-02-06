package controllers;

import models.UserSession;
import org.joda.time.DateTime;
import org.joda.time.Period;
import play.cache.Cache;
import play.mvc.Controller;

public class SitnetController extends Controller {

    public static final String CACHE_KEY = "user.session.";
    public static final String SITNET_TOKEN_HEADER_KEY = "x-sitnet-authentication";

    protected static boolean isTokenValid() {
        Period tokenValidPeriod = new Period().withMinutes(30);
        String token = request().getHeader("SITNET_TOKEN_HEADER_KEY");
        UserSession session = (UserSession) Cache.get(CACHE_KEY + token);
        return session != null ? true : false;
    }
}
