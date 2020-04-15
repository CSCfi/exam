/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.controllers;

import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URLDecoder;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import be.objectify.deadbolt.java.actions.SubjectPresent;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import org.joda.time.DateTime;
import org.joda.time.Minutes;
import play.Environment;
import play.Logger;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;

import backend.controllers.base.ActionMethod;
import backend.controllers.base.BaseController;
import backend.controllers.iop.transfer.api.ExternalExamAPI;
import backend.exceptions.NotFoundException;
import backend.models.ExamEnrolment;
import backend.models.Language;
import backend.models.Organisation;
import backend.models.Reservation;
import backend.models.Role;
import backend.models.Session;
import backend.models.User;
import backend.models.dto.Credentials;
import backend.security.SessionHandler;
import backend.util.AppUtil;
import backend.util.config.ConfigReader;
import backend.util.datetime.DateTimeUtils;

public class SessionController extends BaseController {

    private final Environment environment;

    private final SessionHandler sessionHandler;

    private final ExternalExamAPI externalExamAPI;

    private final ConfigReader configReader;

    private static final Logger.ALogger logger = Logger.of(SessionController.class);

    private static final String LOGIN_TYPE = ConfigFactory.load().getString("sitnet.login");
    private static final String CSRF_COOKIE = ConfigFactory.load().getString("play.filters.csrf.cookie.name");
    private static final Boolean MULTI_STUDENT_ID_ON =
            ConfigFactory.load().getBoolean("sitnet.user.studentIds.multiple.enabled");
    private static final String MULTI_STUDENT_ID_ORGS =
            ConfigFactory.load().getString("sitnet.user.studentIds.multiple.organisations");
    private static final int SESSION_TIMEOUT_MINUTES = 30;

    private static final String URN_PREFIX = "urn:";

    @Inject
    public SessionController(Environment environment, SessionHandler sessionHandler, ExternalExamAPI externalExamAPI,
                             ConfigReader configReader) {
        this.environment = environment;
        this.sessionHandler = sessionHandler;
        this.externalExamAPI = externalExamAPI;
        this.configReader = configReader;
    }

    @ActionMethod
    public CompletionStage<Result> login(Http.Request request) {
        CompletionStage<Result> result;
        switch (LOGIN_TYPE) {
            case "HAKA":
                result = hakaLogin(request);
                break;
            case "DEBUG":
                result = devLogin(request);
                break;
            default:
                result = wrapAsPromise(badRequest("login type not supported"));
        }
        return result;
    }

    private CompletionStage<Result> hakaLogin(Http.Request request) {
        Optional<String> id = parse(request.header("eppn").orElse(""));
        if (!id.isPresent()) {
            return wrapAsPromise(badRequest("No credentials!"));
        }
        String eppn = id.get();
        Reservation externalReservation = getUpcomingExternalReservation(eppn);
        boolean isTemporaryVisitor = externalReservation != null;
        User user = Ebean.find(User.class)
                .where()
                .eq("eppn", eppn)
                .findOne();
        boolean newUser = user == null;
        try {
            if (newUser) {
                user = createNewUser(eppn, request, isTemporaryVisitor);
            } else {
                updateUser(user, request);
            }
        } catch (NotFoundException | AddressException e) {
            return wrapAsPromise(badRequest(e.getMessage()));
        }
        user.setLastLogin(new Date());
        user.save();
        if (newUser) {
            associateWithPreEnrolments(user);
        }
        return handleExternalReservationAndCreateSession(user, externalReservation, request);
    }

    private CompletionStage<Result> devLogin(Http.Request request) {
        if (!environment.isDev()) {
            return wrapAsPromise(unauthorized("Developer login mode not allowed while in production!"));
        }
        Credentials credentials = bindForm(Credentials.class, request);
        logger.debug("User login with username: {}", credentials.getUsername() + "@funet.fi");
        if (credentials.getPassword() == null || credentials.getUsername() == null) {
            return wrapAsPromise(unauthorized("sitnet_error_unauthenticated"));
        }
        String pwd = AppUtil.encodeMD5(credentials.getPassword());
        User user = Ebean.find(User.class)
                .where().eq("eppn", credentials.getUsername() + "@funet.fi")
                .eq("password", pwd).findOne();

        if (user == null) {
            return wrapAsPromise(unauthorized("sitnet_error_unauthenticated"));
        }
        user.setLastLogin(new Date());
        user.update();
        // In dev environment we will not fiddle with the role definitions here regarding visitor status
        Reservation externalReservation = getUpcomingExternalReservation(user.getEppn());
        return handleExternalReservationAndCreateSession(user, externalReservation, request);
    }

    private CompletionStage<Result> handleExternalReservationAndCreateSession(User user, Reservation reservation, Http.Request request) {
        if (reservation != null) {
            try {
                return handleExternalReservation(user, reservation).
                        thenApplyAsync(r -> createSession(user, true, request));
            } catch (MalformedURLException e) {
                return wrapAsPromise(internalServerError());
            }
        } else {
            return wrapAsPromise(createSession(user, false, request));
        }
    }

    private boolean isUserPreEnrolled(String mail, User user) {
        return mail.equalsIgnoreCase(user.getEmail()) || mail.equalsIgnoreCase(user.getEppn());
    }

    private void associateWithPreEnrolments(User user) {
        // Associate pre-enrolment with a real user now that he/she is logged in
        Ebean.find(ExamEnrolment.class)
                .where()
                .isNotNull("preEnrolledUserEmail")
                .findSet()
                .stream()
                .filter(ee -> isUserPreEnrolled(ee.getPreEnrolledUserEmail(), user))
                .forEach(ee -> {
                    ee.setPreEnrolledUserEmail(null);
                    ee.setUser(user);
                    ee.update();
                });
    }

    private Reservation getUpcomingExternalReservation(String eppn) {
        DateTime now = DateTimeUtils.adjustDST(new DateTime());
        int lookAheadMinutes = Minutes.minutesBetween(now, now.plusDays(1).withMillisOfDay(0)).getMinutes();
        DateTime future = now.plusMinutes(lookAheadMinutes);
        List<Reservation> reservations = Ebean.find(Reservation.class).where()
                .eq("externalUserRef", eppn)
                .isNotNull("externalRef")
                .le("startAt", future)
                .gt("endAt", now)
                .orderBy("startAt")
                .findList();
        return reservations.isEmpty() ? null : reservations.get(0);
    }

    private CompletionStage<Result> handleExternalReservation(User user, Reservation reservation) throws MalformedURLException {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where().eq("reservation", reservation).findOne();
        if (enrolment != null) {
            // already imported
            return wrapAsPromise(ok());
        }
        reservation.setUser(user);
        reservation.update();
        return externalExamAPI.requestEnrolment(user, reservation)
                .thenApplyAsync(e -> e == null ? internalServerError() : ok());

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
            logger.warn("User has invalid email: {}", email);
            return Optional.empty();
        }
        return Optional.of(email);
    }

    private String parseStudentIdDomain(String src) {
        String parts = src.split("studentID:")[1];
        return parts.split(":")[0];
    }

    private String parseStudentIdValue(String src) {
        String parts = src.split("studentID:")[1];
        String[] valueParts = parts.split(":");
        return valueParts.length > 1 ? valueParts[1] : "null";
    }

    private String parseUserIdentifier(String src) {
        if (!MULTI_STUDENT_ID_ON || !src.startsWith(URN_PREFIX)) {
            // No specific handling
            return src.substring(src.lastIndexOf(":") + 1);
        } else {
            return Arrays.stream(src.split(";"))
                    .filter(s -> s.contains("studentID:"))
                    .collect(Collectors.toMap(
                            this::parseStudentIdDomain,
                            this::parseStudentIdValue,
                            (v1, v2) -> {
                                logger.error("Duplicate user identifier key for values {} and {}. It will be marked with a null string", v1, v2);
                                return "null";
                            },
                            () -> new TreeMap<>(Comparator.comparingInt(o -> !MULTI_STUDENT_ID_ORGS.contains(o)
                                    ? 1000 : MULTI_STUDENT_ID_ORGS.indexOf(o)))
                            )
                    ).entrySet().stream()
                    .map(e -> String.format("%s:%s", e.getKey(), e.getValue()))
                    .collect(Collectors.joining(" "));
        }
    }

    private Optional<String> parseDisplayName(Http.Request request) {
        return parse(request.header("displayName").orElse("")).map(n ->
                n.indexOf(" ") > 0 ? n.substring(0, n.lastIndexOf(" ")) : n);
    }

    private String parseGivenName(Http.Request request) {
        return parse(request.header("givenName").orElse(""))
                .orElse(parseDisplayName(request)
                        .orElseThrow(IllegalArgumentException::new));
    }

    private Organisation findOrganisation(String attribute) {
        return Ebean.find(Organisation.class).where().eq("code", attribute).findOne();
    }

    private void updateUser(User user, Http.Request request) throws AddressException {
        user.setOrganisation(parse(request.header("homeOrganisation").orElse(""))
                .map(this::findOrganisation).orElse(null));
        user.setUserIdentifier(parse(request.header("schacPersonalUniqueCode").orElse(""))
                .map(this::parseUserIdentifier).orElse(null));
        user.setEmail(parse(request.header("mail").orElse(""))
                .flatMap(this::validateEmail).orElseThrow(() -> new AddressException("invalid mail address")));

        user.setLastName(parse(request.header("sn").orElse(""))
                .orElseThrow(IllegalArgumentException::new));
        user.setFirstName(parseGivenName(request));
        user.setEmployeeNumber(parse(request.header("employeeNumber").orElse("")).orElse(null));
        user.setLogoutUrl(parse(request.header("logouturl").orElse("")).orElse(null));
    }

    private User createNewUser(String eppn, Http.Request request, boolean ignoreRoleNotFound) throws NotFoundException, AddressException {
        User user = new User();
        user.getRoles().addAll(parseRoles(parse(request.header("unscoped-affiliation").orElse(""))
                .orElseThrow(() -> new NotFoundException("role not found")), ignoreRoleNotFound));
        user.setLanguage(getLanguage(parse(request.header("preferredLanguage").orElse(""))
                .orElse(null)));
        user.setEppn(eppn);
        updateUser(user, request);
        return user;
    }

    private Result createSession(User user, boolean isTemporaryVisitor, Http.Request request) {
        Session session = new Session();
        session.setSince(DateTime.now());
        session.setUserId(user.getId());
        session.setValid(true);
        // If (regular) user has just one role, set it as the one used for login
        if (user.getRoles().size() == 1 && !isTemporaryVisitor) {
            session.setLoginRole(user.getRoles().get(0).getName());
        }
        List<Role> roles = isTemporaryVisitor ?
                Ebean.find(Role.class).where().eq("name", Role.Name.STUDENT.toString()).findList() :
                user.getRoles();
        if (isTemporaryVisitor) {
            session.setTemporalStudent(true);
            session.setLoginRole(roles.get(0).getName()); // forced login as student
        }
        String token = createSession(session, request);

        ObjectNode result = Json.newObject();
        result.put("id", user.getId());
        result.put("token", token);
        result.put("firstName", user.getFirstName());
        result.put("lastName", user.getLastName());
        result.put("lang", user.getLanguage().getCode());
        result.set("roles", Json.toJson(roles));
        result.set("permissions", Json.toJson(user.getPermissions()));
        result.put("userAgreementAccepted", user.isUserAgreementAccepted());
        result.put("userIdentifier", user.getUserIdentifier());
        result.put("email", user.getEmail());
        return ok(result);
    }

    // prints HAKA attributes, used for debugging
    @ActionMethod
    public Result getAttributes(Http.Request request) {
        Http.Headers attributes = request.getHeaders();
        ObjectNode node = Json.newObject();

        for (Map.Entry<String, List<String>> entry : attributes.asMap().entrySet()) {
            node.put(entry.getKey(), String.join(", ", entry.getValue()));
        }

        return ok(node);
    }

    private Set<Role> parseRoles(String attribute, boolean ignoreRoleNotFound) throws NotFoundException {
        Set<Role> userRoles = new HashSet<>();
        for (String affiliation : attribute.split(";")) {
            for (Map.Entry<Role, List<String>> entry : configReader.getRoleMapping().entrySet()) {
                if (entry.getValue().contains(affiliation)) {
                    userRoles.add(entry.getKey());
                    break;
                }
            }
        }
        if (userRoles.isEmpty() && !ignoreRoleNotFound) {
            throw new NotFoundException("sitnet_error_role_not_found " + attribute);
        }
        return userRoles;
    }

    @ActionMethod
    public Result logout(Http.Request request) {
        Result result = ok();
        Optional<Session> os = getSession(request);
        if (os.isPresent()) {
            Session session = os.get();
            User user = Ebean.find(User.class, session.getUserId());
            session.setValid(false);
            updateSession(session, request);
            logger.info("Set session for user #{} as invalid", session.getUserId());
            if (user != null && user.getLogoutUrl() != null) {
                ObjectNode node = Json.newObject();
                node.put("logoutUrl", user.getLogoutUrl());
                result = ok(Json.toJson(node));
            }
        }
        return environment.isDev() ? result : result.discardingCookie(CSRF_COOKIE);
    }

    @SubjectPresent
    public Result setLoginRole(Long uid, String roleName, Http.Request request) {
        Optional<Session> os = getSession(request);
        if (!os.isPresent()) {
            return unauthorized();
        }
        User user = Ebean.find(User.class, uid);
        if (user == null) {
            return notFound();
        }
        Role role = Ebean.find(Role.class).where().eq("name", roleName).findOne();
        if (role == null) {
            return notFound();
        }
        if (!user.getRoles().contains(role)) {
            return forbidden();
        }
        Session session = os.get();
        session.setLoginRole(roleName);
        updateSession(session, request);
        return ok();
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result extendSession(Http.Request request) {
        Optional<Session> os = getSession(request);
        if (!os.isPresent()) {
            return unauthorized();
        }
        Session session = os.get();
        session.setSince(DateTime.now());
        updateSession(session, request);
        return ok();
    }

    @ActionMethod
    public Result checkSession(Http.Request request) {
        Optional<Session> os = getSession(request);
        if (!os.isPresent() || os.get().getSince() == null) {
            logger.info("Session not found");
            return ok("no_session");
        }
        DateTime expirationTime = os.get().getSince().plusMinutes(SESSION_TIMEOUT_MINUTES);
        DateTime alarmTime = expirationTime.minusMinutes(2);
        logger.debug("Session expiration due at {}", expirationTime);
        if (expirationTime.isBeforeNow()) {
            logger.info("Session has expired");
            return ok("no_session");
        } else if (alarmTime.isBeforeNow()) {
            return ok("alarm");
        }
        return ok();
    }

    private Optional<Session> getSession(Http.Request request) {
        return sessionHandler.getSession(request);
    }

    private void updateSession(Session session, Http.Request request) {
        sessionHandler.updateSession(request, session);
    }

    private String createSession(Session session, Http.Request request) {
        return sessionHandler.createSession(request, session);
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
