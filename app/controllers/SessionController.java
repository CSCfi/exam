package controllers;

import Exceptions.MalformedDataException;
import Exceptions.UnauthorizedAccessException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import models.*;
import org.joda.time.DateTime;
import play.Logger;
import play.cache.Cache;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

import java.util.*;

public class SessionController extends SitnetController {

    public static Result login() throws MalformedDataException, UnauthorizedAccessException {

        User user = null;

        String loginType= ConfigFactory.load().getString("sitnet.login");
        if(loginType.equals("DEBUG"))
        {
            Credentials credentials = bindForm(Credentials.class);
            Logger.debug("User login with username: {} and password: ***", credentials.getUsername() +"@funet.fi");
            String md5psswd = SitnetUtil.encodeMD5(credentials.getPassword());


            user = Ebean.find(User.class)
                    .select("id, eppn, email, firstName, lastName, userLanguage")
                    .where().eq("eppn", credentials.getUsername() +"@funet.fi")
                    .eq("password", md5psswd).findUnique();

            if (user == null) {
                return unauthorized("Incorrect username or password.");
            }
        }
        else if(loginType.equals("HAKA"))
        {
            Map<String, String[]> attributes = request().headers();
            String eppn = request().getHeader("eppn");

            user = Ebean.find(User.class)
                    .where()
                    .eq("eppn", eppn)
                    .findUnique();

            // First login -> crea
            if(user == null)
            {
                user = new User();

                user.setAttributes(attributes);
                user.setEppn(request().getHeader("eppn"));

                String email = request().getHeader("mail");
//                String email = (request().getHeader("mail") == null ? request().getHeader("SHIB_mail") : request().getHeader("mail"));

                user.setEmail(email);
                user.setLastName(request().getHeader("sn"));
                user.setFirstName(request().getHeader("displayName"));

                String language = request().getHeader("preferredLanguage");
                if(language != null && (language.length() > 0)) {
                    user.getUserLanguage().setNativeLanguageCode(language);
                    user.getUserLanguage().setUILanguageCode(language);
                }
                else
                {
                    UserLanguage lang = Ebean.find(UserLanguage.class)
                            .where()
                            .eq("nativeLanguageCode", "en")
                            .findUnique();

                    user.setUserLanguage(lang);
                }

                String shibRole = request().getHeader("unscoped-affiliation");
                Logger.debug("unscoped-affiliation: "+ shibRole);
                SitnetRole srole = getRole(shibRole);
                if(srole == null)
                    return notFound("Cannot assign role "+ shibRole);
                else
                    ((List<SitnetRole>)user.getRoles()).add(srole);

                user.save();
            }
        }

        // User exists in the system -> log in
        String token = UUID.randomUUID().toString();
        Session session = new Session();
        session.setSince(DateTime.now());
        session.setUserId(user.getId());
        session.setValid(true);
        Cache.set(SITNET_CACHE_KEY + token, session);
        ObjectNode result = Json.newObject();
        result.put("id", user.getId());
        result.put("token", token);
        result.put("firstname", user.getFirstName());
        result.put("lastname", user.getLastName());
        result.put("roles", Json.toJson(user.getRoles()));
        result.put("eulaAccepted", user.isHasAcceptedUserAgreament());
        return ok(result);
    }

//  public static Result shiblogin() throws MalformedDataException, UnauthorizedAccessException {
//
//        Map<String, String[]> attributes = request().headers();
//        String eppn = request().getHeader("eppn");
//
//        User user = Ebean.find(User.class)
//                .where()
//                .eq("email", eppn)
//                .findUnique();
//
//        // First login -> create user
//        if(user == null)
//        {
//            user = new User();
//
//            user.setAttributes(attributes);
//            user.setEmail(request().getHeader("eppn"));
//            user.setLastName(request().getHeader("sn"));
//            user.setFirstName(request().getHeader("displayName"));
//
//            String shibRole = request().getHeader("unscoped-affiliation");
//            SitnetRole srole = getRole(shibRole);
//            if(srole == null)
//                return notFound("Cannot assign role "+ shibRole);
//            else
//                ((List<SitnetRole>)user.getRoles()).add(srole);
//
//            user.save();
//        }
//
//        // User exists in the system -> log in
//        String token = UUID.randomUUID().toString();
//        Session session = new Session();
//        session.setSince(DateTime.now());
//        session.setUserId(user.getId());
//        user.setAttributes(attributes);
//
//        Cache.set(SITNET_CACHE_KEY + token, session);
//        ObjectNode result = Json.newObject();
//        result.put("token", token);
//        result.put("firstname", user.getFirstName());
//        result.put("lastname", user.getLastName());
//        result.put("roles", Json.toJson(user.getRoles()));
//        return ok(result);
//    }

    static private SitnetRole getRole(String affiliation) {

        Map<String, List<String>> roles = getRoles();

        if (roles.get("STUDENT").contains(affiliation)) {
            SitnetRole srole = Ebean.find(SitnetRole.class)
                    .where()
                    .eq("name", "STUDENT")
                    .findUnique();

            return srole;
        }
        else if(roles.get("ADMIN").contains(affiliation)) {
            SitnetRole srole = Ebean.find(SitnetRole.class)
                    .where()
                    .eq("name", "ADMIN")
                    .findUnique();

            return srole;
        }
        else if (roles.get("TEACHER").contains(affiliation)) {
            SitnetRole srole = Ebean.find(SitnetRole.class)
                    .where()
                    .eq("name", "TEACHER")
                    .findUnique();

            return srole;
        }
        else
            return null;
    }

    static private Map<String, List<String>> getRoles()
    {
        String[] students = ConfigFactory.load().getString("sitnet.roles.student").split(",");
        String[] teachers = ConfigFactory.load().getString("sitnet.roles.teacher").split(",");
        String[] admins = ConfigFactory.load().getString("sitnet.roles.admin").split(",");

        Map<String, List<String>> roles = new HashMap<String, List<String>>();

        List<String> studentRoles = new ArrayList<String>();
        for(int i = 0; i<students.length; i++) {
            studentRoles.add(students[i].trim());
        }
        roles.put("STUDENT", studentRoles);

        List<String> teacherRoles = new ArrayList<String>();
        for(int i = 0; i<teachers.length; i++) {
            teacherRoles.add(teachers[i].trim());
        }
        roles.put("TEACHER", teacherRoles);

        List<String> adminRoles = new ArrayList<String>();
        for(int i = 0; i<admins.length; i++) {
            adminRoles.add(admins[i].trim());
        }
        roles.put("ADMIN", adminRoles);

        return roles;
    }

    public static Result logout() {
        String token = request().getHeader(SITNET_TOKEN_HEADER_KEY);
        String key = SITNET_CACHE_KEY + token;
        String loginType = ConfigFactory.load().getString("sitnet.login");
        if (loginType.equals("HAKA")) {
            Session session = (Session) Cache.get(key);
            session.setValid(false);
            Cache.set(key, session);
        } else {
            Cache.remove(key);
        }
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result ping() {
        return ok("pong");
    }
}
