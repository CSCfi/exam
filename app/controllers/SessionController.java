package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import exceptions.MalformedDataException;
import exceptions.NotFoundException;
import models.*;
import org.joda.time.DateTime;
import play.Logger;
import play.cache.Cache;
import play.libs.Json;
import play.mvc.Result;
import util.AppUtil;

import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.*;

public class SessionController extends SitnetController {

    public static Result login() throws MalformedDataException {
        String loginType = ConfigFactory.load().getString("sitnet.login");
        Result result;
        switch (loginType) {
            case "HAKA":
                result = hakaLogin();
                break;
            case "DEBUG":
                result = devLogin();
                break;
            default:
                result = badRequest("login type not supported");
        }
        return result;
    }

    private static Result hakaLogin() {
        String eppn = toUtf8(request().getHeader("eppn"));
        if (eppn == null) {
            return badRequest("No credentials!");
        }
        User user = Ebean.find(User.class)
                .where()
                .eq("eppn", eppn)
                .findUnique();
        try {
            if (user == null) {
                user = createNewUser(eppn);
            } else {
                updateUser(user);
            }
        } catch (NotFoundException | AddressException e) {
            return badRequest(e.getMessage());
        }
        user.save();
        return createSession(toUtf8(request().getHeader("Shib-Session-ID")), user);
    }

    private static Result devLogin() throws MalformedDataException {
        Credentials credentials = bindForm(Credentials.class);
        Logger.debug("User login with username: {} and password: ***", credentials.getUsername() + "@funet.fi");
        if (credentials.getPassword() == null || credentials.getUsername() == null) {
            return unauthorized("sitnet_error_unauthenticated");
        }
        String md5psswd = AppUtil.encodeMD5(credentials.getPassword());
        User user = Ebean.find(User.class)
                .where().eq("eppn", credentials.getUsername() + "@funet.fi")
                .eq("password", md5psswd).findUnique();

        if (user == null) {
            return unauthorized("sitnet_error_unauthenticated");
        }
        return createSession(UUID.randomUUID().toString(), user);
    }

    private static UserLanguage getLanguage(String code) {
        UserLanguage language = null;
        if (code != null && !code.isEmpty()) {
            // for example: en-US -> en
            code = code.split("-")[0].toLowerCase();
            language = Ebean.find(UserLanguage.class)
                    .where()
                    .eq("nativeLanguageCode", code)
                    .findUnique();
        }
        if (language == null) {
            // Default to English
            language = Ebean.find(UserLanguage.class)
                    .where()
                    .eq("nativeLanguageCode", "en")
                    .findUnique();
        }
        return language;
    }

    private static Role getRole(String affiliation) throws NotFoundException {
        Role role = findRole(affiliation);
        if (role == null) {
            throw new NotFoundException("sitnet_error_role_not_found " + affiliation);
        }
        return role;
    }

    private static String validateEmail(String email) throws AddressException {
        new InternetAddress(email).validate();
        return email;
    }

    private static void updateUser(User user) throws AddressException {
        user.setUserIdentifier(toUtf8(request().getHeader("schacPersonalUniqueCode")));
        user.setEmail(validateEmail(toUtf8(request().getHeader("mail"))));
        user.setLastName(toUtf8(request().getHeader("sn")));
        user.setFirstName(toUtf8(request().getHeader("displayName")));
        user.setEmployeeNumber(toUtf8(request().getHeader("employeeNumber")));
        user.setLogoutUrl(toUtf8(request().getHeader("logouturl")));
    }

    private static User createNewUser(String eppn) throws NotFoundException, AddressException {
        User user = new User();
        user.getRoles().add(getRole(toUtf8(request().getHeader("unscoped-affiliation"))));
        user.setUserLanguage(getLanguage(toUtf8(request().getHeader("preferredLanguage"))));
        user.setEppn(eppn);
        updateUser(user);
        return user;
    }

    private static Result createSession(String token, User user) {
        Session session = new Session();
        session.setSince(DateTime.now());
        session.setUserId(user.getId());
        session.setValid(true);
        session.setXsrfToken();

        Cache.set(SITNET_CACHE_KEY + token, session);

        ObjectNode result = Json.newObject();
        result.put("id", user.getId());
        result.put("token", token);
        result.put("firstname", user.getFirstName());
        result.put("lastname", user.getLastName());
        result.put("lang", user.getUserLanguage().getUILanguageCode());
        result.put("roles", Json.toJson(user.getRoles()));
        result.put("hasAcceptedUserAgreament", user.isHasAcceptedUserAgreament());

        response().setCookie("XSRF-TOKEN", session.getXsrfToken());

        return ok(result);
    }

    // prints HAKA attributes, used for debugging
    @Restrict({@Group("ADMIN")})
    public static Result getAttributes() {

        Map<String, String[]> attributes = request().headers();
        ObjectNode node = Json.newObject();

        for (Map.Entry<String, String[]> entry : attributes.entrySet()) {
            node.put(entry.getKey(), Arrays.toString(entry.getValue()));
        }

        return ok(node);
    }

    static private Role findRole(String affiliation) {
        List<String> affiliations = Arrays.asList(affiliation.split(";"));

        Map<String, List<String>> roles = getRoles();
        String roleName = null;
        if (!Collections.disjoint(affiliations, roles.get("STUDENT"))) {
            roleName = "STUDENT";
        } else if (!Collections.disjoint(affiliations, roles.get("TEACHER"))) {
            roleName = "TEACHER";
        } else if (!Collections.disjoint(affiliations, roles.get("ADMIN"))) {
            roleName = "ADMIN";
        }
        return roleName == null ? null : Ebean.find(Role.class)
                .where()
                .eq("name", roleName)
                .findUnique();
    }

    static private Map<String, List<String>> getRoles() {
        String[] students = ConfigFactory.load().getString("sitnet.roles.student").split(",");
        String[] teachers = ConfigFactory.load().getString("sitnet.roles.teacher").split(",");
        String[] admins = ConfigFactory.load().getString("sitnet.roles.admin").split(",");

        Map<String, List<String>> roles = new HashMap<>();

        List<String> studentRoles = new ArrayList<>();
        for (String student : students) {
            studentRoles.add(student.trim());
        }
        roles.put("STUDENT", studentRoles);

        List<String> teacherRoles = new ArrayList<>();
        for (String teacher : teachers) {
            teacherRoles.add(teacher.trim());
        }
        roles.put("TEACHER", teacherRoles);

        List<String> adminRoles = new ArrayList<>();
        for (String admin : admins) {
            adminRoles.add(admin.trim());
        }
        roles.put("ADMIN", adminRoles);

        return roles;
    }

    public static Result logout() {
        response().discardCookie("XSRF-TOKEN");
        String token = request().getHeader(SITNET_TOKEN_HEADER_KEY);
        String key = SITNET_CACHE_KEY + token;
        Session session = (Session) Cache.get(key);
        if (session != null) {
            String loginType = ConfigFactory.load().getString("sitnet.login");
            String logoutUrl = null;
            User user = Ebean.find(User.class, session.getUserId());
            if (loginType.equals("HAKA")) {
                session.setValid(false);
                Cache.set(key, session);
                Logger.info("Set session as invalid {}", token);
            } else {
                Cache.remove(key);
            }
            if (user.getLogoutUrl() != null) {
                ObjectNode node = Json.newObject();
                node.put("logoutUrl", user.getLogoutUrl());
                return ok(Json.toJson(node));
            }
        }
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result extendSession() {
        String loginType = ConfigFactory.load().getString("sitnet.login");
        String token = request().getHeader(loginType.equals("HAKA") ? "Shib-Session-ID" : SITNET_TOKEN_HEADER_KEY);
        final String key = SITNET_CACHE_KEY + token;
        Session session = (Session) Cache.get(key);

        if (session == null) {
            return unauthorized();
        }

        session.setSince(DateTime.now());
        Cache.set(SITNET_CACHE_KEY + token, session);

        return ok();
    }

    public static Result checkSession() {

        String loginType = ConfigFactory.load().getString("sitnet.login");
        String token = request().getHeader(loginType.equals("HAKA") ? "Shib-Session-ID" : SITNET_TOKEN_HEADER_KEY);
        final String key = SITNET_CACHE_KEY + token;
        Session session = (Session) Cache.get(key);

        if (session == null || session.getSince() == null) {
            Logger.info("Session not found");
            return ok("no_session");
        }

        final long timeOut = SITNET_TIMEOUT_MINUTES * 60 * 1000;
        final long sessionTime = session.getSince().getMillis();
        final long end = sessionTime + timeOut;
        final long now = DateTime.now().getMillis();
        final long alarmTime = end - (2 * 60 * 1000); // now - 2 minutes

        if (Logger.isDebugEnabled()) {
            DateFormat df = new SimpleDateFormat("HH:mm:ss");
            Logger.debug(" - current time: " + df.format(now));
            Logger.debug(" - session ends: " + df.format(end));
        }

        // session has 2 minutes left
        if (now > alarmTime && now < end) {
            return ok("alarm");
        }

        // session ended check
        if (now > end) {
            Logger.info("Session has expired");
            return ok("no_session");
        }

        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result ping() {
        return ok("pong");
    }

    private static String toUtf8(String src) {
        if (src == null) {
            return null;
        }
        try {
            return URLDecoder.decode(src, "UTF-8");
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }
    }

}
