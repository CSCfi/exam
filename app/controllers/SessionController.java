package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import exceptions.NotFoundException;
import models.*;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import util.AppUtil;

import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.*;

public class SessionController extends BaseController {

    public Result login() {
        Result result;
        switch (LOGIN_TYPE) {
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

    private Result hakaLogin() {
        String eppn = parse(request().getHeader("eppn"));
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
        user.setLastLogin(new Date());
        user.save();
        return createSession(user);
    }

    private Result devLogin() {
        Credentials credentials = bindForm(Credentials.class);
        Logger.debug("User login with username: {}", credentials.getUsername() + "@funet.fi");
        if (credentials.getPassword() == null || credentials.getUsername() == null) {
            return unauthorized("sitnet_error_unauthenticated");
        }
        String pwd = AppUtil.encodeMD5(credentials.getPassword());
        User user = Ebean.find(User.class)
                .where().eq("eppn", credentials.getUsername() + "@funet.fi")
                .eq("password", pwd).findUnique();

        if (user == null) {
            return unauthorized("sitnet_error_unauthenticated");
        }
        user.setLastLogin(new Date());
        user.save();
        return createSession(user);
    }

    private static Language getLanguage(String code) {
        Language language = null;
        if (code != null) {
            // for example: en-US -> en
            code = code.split("-")[0].toLowerCase();
            language = Ebean.find(Language.class, code);
        }
        if (language == null) {
            // Default to English
            language = Ebean.find(Language.class, "en");
        }
        return language;
    }

    private static String validateEmail(String email) throws AddressException {
        if (email == null) {
            throw new AddressException("no email address for user");
        }
        new InternetAddress(email).validate();
        return email;
    }

    private static String parseUserIdentifier(String src) {
        if (src == null) {
            return null;
        }
        return src.substring(src.lastIndexOf(":") + 1);
    }

    private static String parseGivenName(Http.Request request) {
        String givenName = parse(request.getHeader("givenName"));
        if (givenName == null) {
            String displayName = parse(request.getHeader("displayName"));
            givenName = displayName.substring(displayName.lastIndexOf(" ") + 1);
        }
        return givenName;
    }

    private static Organisation findOrganisation(String attribute) {
        if (attribute == null) {
            return null;
        }
        return Ebean.find(Organisation.class).where().eq("code", attribute).findUnique();
    }

    private static void updateUser(User user) throws AddressException {
        user.setOrganisation(findOrganisation(parse(request().getHeader("homeOrganisation"))));
        user.setUserIdentifier(parseUserIdentifier(parse(request().getHeader("schacPersonalUniqueCode"))));
        user.setEmail(validateEmail(parse(request().getHeader("mail"))));
        user.setLastName(parse(request().getHeader("sn")));
        user.setFirstName(parseGivenName(request()));
        user.setEmployeeNumber(parse(request().getHeader("employeeNumber")));
        user.setLogoutUrl(parse(request().getHeader("logouturl")));
    }

    private static User createNewUser(String eppn) throws NotFoundException, AddressException {
        User user = new User();
        user.getRoles().addAll(parseRoles(parse(request().getHeader("unscoped-affiliation"))));
        user.setLanguage(getLanguage(parse(request().getHeader("preferredLanguage"))));
        user.setEppn(eppn);
        updateUser(user);
        return user;
    }

    private Result createSession(User user) {
        Session session = new Session();
        session.setSince(DateTime.now());
        session.setUserId(user.getId());
        session.setValid(true);
        // If user has just one role, set it as the one used for login
        if (user.getRoles().size() == 1) {
            session.setLoginRole(user.getRoles().get(0).getName());
        }

        String token = createSession(session);

        ObjectNode result = Json.newObject();
        result.put("id", user.getId());
        result.put("token", token);
        result.put("firstname", user.getFirstName());
        result.put("lastname", user.getLastName());
        result.put("lang", user.getLanguage().getCode());
        result.set("roles", Json.toJson(user.getRoles()));
        result.set("permissions", Json.toJson(user.getPermissions()));
        result.put("userAgreementAccepted", user.isUserAgreementAccepted());
        result.put("userIdentifier", user.getUserIdentifier());
        return ok(result);
    }

    // prints HAKA attributes, used for debugging
    public Result getAttributes() {
        Map<String, String[]> attributes = request().headers();
        ObjectNode node = Json.newObject();

        for (Map.Entry<String, String[]> entry : attributes.entrySet()) {
            node.put(entry.getKey(), Arrays.toString(entry.getValue()));
        }

        return ok(node);
    }

    private static Set<Role> parseRoles(String attribute) throws NotFoundException {
        Map<Role, List<String>> roleMapping = getRoleMapping();
        Set<Role> userRoles = new HashSet<>();
        for (String affiliation : attribute.split(";")) {
            for (Map.Entry<Role, List<String>> entry : roleMapping.entrySet()) {
                if (entry.getValue().contains(affiliation)) {
                    userRoles.add(entry.getKey());
                    break;
                }
            }
        }
        if (userRoles.isEmpty()) {
            throw new NotFoundException("sitnet_error_role_not_found " + attribute);
        }
        return userRoles;
    }

    static private Map<Role, List<String>> getRoleMapping() {
        Role student = Ebean.find(Role.class).where().eq("name", Role.Name.STUDENT.toString()).findUnique();
        Role teacher = Ebean.find(Role.class).where().eq("name", Role.Name.TEACHER.toString()).findUnique();
        Role admin = Ebean.find(Role.class).where().eq("name", Role.Name.ADMIN.toString()).findUnique();
        Map<Role, List<String>> roles = new HashMap<>();
        roles.put(student, ConfigFactory.load().getStringList("sitnet.roles.student"));
        roles.put(teacher, ConfigFactory.load().getStringList("sitnet.roles.teacher"));
        roles.put(admin, ConfigFactory.load().getStringList("sitnet.roles.admin"));
        return roles;
    }

    public Result logout() {
        Session session = getSession();
        Result result = ok();
        if (session != null) {
            User user = Ebean.find(User.class, session.getUserId());
            session.setValid(false);
            updateSession(session);
            Logger.info("Set session for user #{} as invalid", session.getUserId());
            if (user.getLogoutUrl() != null) {
                ObjectNode node = Json.newObject();
                node.put("logoutUrl", user.getLogoutUrl());
                result = ok(Json.toJson(node));
            }
        }
        response().discardCookie("csrfToken");
        session().clear();
        return result;
    }

    public Result setLoginRole(Long uid, String roleName) {
        Session session = getSession();
        if (session == null) {
            return unauthorized();
        }
        User user = Ebean.find(User.class, uid);
        if (user == null) {
            return notFound();
        }
        Role role = Ebean.find(Role.class).where().eq("name", roleName).findUnique();
        if (role == null) {
            return notFound();
        }
        if (!user.getRoles().contains(role)) {
            return forbidden();
        }
        session.setLoginRole(roleName);
        updateSession(session);
        return ok();
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result extendSession() {
        Session session = getSession();
        if (session == null) {
            return unauthorized();
        }
        session.setSince(DateTime.now());
        updateSession(session);
        return ok();
    }

    public Result checkSession() {
        Session session = getSession();
        if (session == null || session.getSince() == null) {
            Logger.info("Session not found");
            return ok("no_session");
        }
        DateTime expirationTime = session.getSince().plusMinutes(SITNET_TIMEOUT_MINUTES);
        DateTime alarmTime = expirationTime.minusMinutes(2);
        Logger.debug("Session expiration due at {}", expirationTime);
        if (expirationTime.isBeforeNow()) {
            Logger.info("Session has expired");
            return ok("no_session");
        } else if (alarmTime.isBeforeNow()) {
            return ok("alarm");
        }
        return ok();
    }

    private static String parse(String src) {
        if (src == null || src.isEmpty()) {
            return null;
        }
        try {
            return URLDecoder.decode(src, "UTF-8");
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }
    }

}
