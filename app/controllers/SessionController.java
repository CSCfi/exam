package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import exceptions.NotFoundException;
import models.*;
import models.dto.Credentials;
import org.joda.time.DateTime;
import play.Environment;
import play.Logger;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import util.AppUtil;

import javax.inject.Inject;
import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.*;

public class SessionController extends BaseController {

    @Inject
    Environment environment;

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
        Optional<String> id = parse(request().getHeader("eppn"));
        if (!id.isPresent()) {
            return badRequest("No credentials!");
        }
        String eppn = id.get();
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
        if (!environment.isDev()) {
            return unauthorized();
        }
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
        user.update();
        return createSession(user);
    }

    private static Language getLanguage(String code) {
        Language language = null;
        if (code != null) {
            // for example: en-US -> en
            String lcCode = code.split("-")[0].toLowerCase();
            language = Ebean.find(Language.class, lcCode);
        }
        if (language == null) {
            // Default to English
            language = Ebean.find(Language.class, "en");
        }
        return language;
    }

    private Optional<String> validateEmail(String email) {
        try {
            new InternetAddress(email).validate();
        } catch (AddressException e) {
            return Optional.empty();
        }
        return Optional.of(email);
    }

    private String parseUserIdentifier(String src) {
        return src.substring(src.lastIndexOf(":") + 1);
    }

    private Optional<String> parseDisplayName(Http.Request request) {
        return parse(request.getHeader("displayName")).map(n ->
                n.indexOf(" ") > 0 ? n.substring(0, n.lastIndexOf(" ")) : n);
    }

    private String parseGivenName(Http.Request request) {
        return parse(request.getHeader("givenName"))
                .orElse(parseDisplayName(request)
                        .orElseThrow(IllegalArgumentException::new));
    }

    private Organisation findOrganisation(String attribute) {
        return Ebean.find(Organisation.class).where().eq("code", attribute).findUnique();
    }

    private void updateUser(User user) throws AddressException {
        user.setOrganisation(parse(request().getHeader("homeOrganisation"))
                .map(this::findOrganisation).orElse(null));
        user.setUserIdentifier(parse(request().getHeader("schacPersonalUniqueCode"))
                .map(this::parseUserIdentifier).orElse(null));
        user.setEmail(parse(request().getHeader("mail"))
                .flatMap(this::validateEmail).orElseThrow(AddressException::new));

        user.setLastName(parse(request().getHeader("sn")).orElseThrow(IllegalArgumentException::new));
        user.setFirstName(parseGivenName(request()));
        user.setEmployeeNumber(parse(request().getHeader("employeeNumber")).orElse(null));
        user.setLogoutUrl(parse(request().getHeader("logouturl")).orElse(null));
    }

    private User createNewUser(String eppn) throws NotFoundException, AddressException {
        User user = new User();
        user.getRoles().addAll(parseRoles(parse(request().getHeader("unscoped-affiliation"))
                .orElseThrow(NotFoundException::new)));
        user.setLanguage(getLanguage(parse(request().getHeader("preferredLanguage")).orElse(null)));
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
        Map<Role, List<String>> roleMapping = getConfiguredRoleMapping();
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

    private static Map<Role, List<String>> getConfiguredRoleMapping() {
        Role student = Ebean.find(Role.class).where().eq("name", Role.Name.STUDENT.toString()).findUnique();
        Role teacher = Ebean.find(Role.class).where().eq("name", Role.Name.TEACHER.toString()).findUnique();
        Role admin = Ebean.find(Role.class).where().eq("name", Role.Name.ADMIN.toString()).findUnique();
        Map<Role, List<String>> roles = new HashMap<>();
        roles.put(student, ConfigFactory.load().getStringList("sitnet.roles.student"));
        roles.put(teacher, ConfigFactory.load().getStringList("sitnet.roles.teacher"));
        roles.put(admin, ConfigFactory.load().getStringList("sitnet.roles.admin"));
        return roles;
    }

    @ActionMethod
    public Result logout() {
        Session session = getSession();
        Result result = ok();
        if (session != null) {
            User user = Ebean.find(User.class, session.getUserId());
            session.setValid(false);
            updateSession(session);
            Logger.info("Set session for user #{} as invalid", session.getUserId());
            if (user != null && user.getLogoutUrl() != null) {
                ObjectNode node = Json.newObject();
                node.put("logoutUrl", user.getLogoutUrl());
                result = ok(Json.toJson(node));
            }
        }
        response().discardCookie("csrfToken");
        session().clear();
        return result;
    }

    @ActionMethod
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

    @ActionMethod
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

    private static Optional<String> parse(String src) {
        if (src == null || src.isEmpty()) {
            return Optional.empty();
        }
        try {
            return Optional.of(URLDecoder.decode(src, "UTF-8"));
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }
    }

}
