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

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import be.objectify.deadbolt.java.actions.SubjectPresent;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.base.ActionMethod;
import controllers.base.BaseController;
import controllers.iop.transfer.api.ExternalExamAPI;
import exceptions.NotFoundException;
import io.ebean.DB;
import java.net.MalformedURLException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
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
import models.ExamEnrolment;
import models.Language;
import models.Organisation;
import models.Reservation;
import models.Role;
import models.User;
import models.dto.Credentials;
import org.apache.commons.codec.digest.DigestUtils;
import org.joda.time.DateTime;
import org.joda.time.Minutes;
import org.joda.time.format.ISODateTimeFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.Environment;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import repository.EnrolmentRepository;
import util.config.ConfigReader;
import util.datetime.DateTimeHandler;

public class SessionController extends BaseController {

    private final Environment environment;
    private final ExternalExamAPI externalExamAPI;
    private final ConfigReader configReader;
    private final EnrolmentRepository enrolmentRepository;
    private final DateTimeHandler dateTimeHandler;

    private final Logger logger = LoggerFactory.getLogger(SessionController.class);

    private static final int SESSION_TIMEOUT_MINUTES = 30;
    private static final String URN_PREFIX = "urn:";
    private static final Map<String, String> SESSION_HEADER_MAP = Map.of(
        "x-exam-start-exam",
        "ongoingExamHash",
        "x-exam-upcoming-exam",
        "upcomingExamHash",
        "x-exam-wrong-machine",
        "wrongMachineData",
        "x-exam-unknown-machine",
        "unknownMachineData",
        "x-exam-wrong-room",
        "wrongRoomData",
        "x-exam-wrong-agent-config",
        "wrongAgent"
    );

    @Inject
    public SessionController(
        Environment environment,
        ExternalExamAPI externalExamAPI,
        ConfigReader configReader,
        EnrolmentRepository enrolmentRepository,
        DateTimeHandler dateTimeHandler
    ) {
        this.environment = environment;
        this.externalExamAPI = externalExamAPI;
        this.configReader = configReader;
        this.enrolmentRepository = enrolmentRepository;
        this.dateTimeHandler = dateTimeHandler;
    }

    @ActionMethod
    public CompletionStage<Result> login(Http.Request request) {
        return switch (configReader.getLoginType()) {
            case "HAKA" -> hakaLogin(request);
            case "DEBUG" -> devLogin(request);
            default -> wrapAsPromise(badRequest("login type not supported"));
        };
    }

    private CompletionStage<Result> hakaLogin(Http.Request request) {
        Optional<String> id = parse(request.header("eppn").orElse(""));
        if (id.isEmpty()) {
            return wrapAsPromise(badRequest("No credentials!"));
        }
        String eppn = id.get();
        Reservation externalReservation = getUpcomingExternalReservation(eppn);
        boolean isTemporaryVisitor = externalReservation != null;
        User user = DB.find(User.class).where().eq("eppn", eppn).findOne();
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
            return wrapAsPromise(unauthorized("i18n_error_unauthenticated"));
        }
        String pwd = DigestUtils.md5Hex(credentials.getPassword());
        User user = DB
            .find(User.class)
            .where()
            .eq("eppn", credentials.getUsername() + "@funet.fi")
            .eq("password", pwd)
            .findOne();

        if (user == null) {
            return wrapAsPromise(unauthorized("i18n_error_unauthenticated"));
        }
        user.setLastLogin(new Date());
        user.update();
        // In dev environment we will not fiddle with the role definitions here regarding visitor status
        Reservation externalReservation = getUpcomingExternalReservation(user.getEppn());
        return handleExternalReservationAndCreateSession(user, externalReservation, request);
    }

    private CompletionStage<Result> handleExternalReservationAndCreateSession(
        User user,
        Reservation reservation,
        Http.Request request
    ) {
        if (reservation != null) {
            try {
                return handleExternalReservation(user, reservation)
                    .thenComposeAsync(r -> createSession(user, true, request));
            } catch (MalformedURLException e) {
                return wrapAsPromise(internalServerError());
            }
        } else {
            return createSession(user, false, request);
        }
    }

    private boolean isUserPreEnrolled(String mail, User user) {
        return (mail.equalsIgnoreCase(user.getEmail()) || mail.equalsIgnoreCase(user.getEppn()));
    }

    private void associateWithPreEnrolments(User user) {
        // Associate pre-enrolment with a real user now that he/she is logged in
        DB
            .find(ExamEnrolment.class)
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
        DateTime now = dateTimeHandler.adjustDST(new DateTime());
        int lookAheadMinutes = Minutes.minutesBetween(now, now.plusDays(1).withMillisOfDay(0)).getMinutes();
        DateTime future = now.plusMinutes(lookAheadMinutes);
        List<Reservation> reservations = DB
            .find(Reservation.class)
            .where()
            .eq("externalUserRef", eppn)
            .isNotNull("externalRef")
            .le("startAt", future)
            .gt("endAt", now)
            .orderBy("startAt")
            .findList();
        return reservations.isEmpty() ? null : reservations.get(0);
    }

    private CompletionStage<Result> handleExternalReservation(User user, Reservation reservation)
        throws MalformedURLException {
        ExamEnrolment enrolment = DB.find(ExamEnrolment.class).where().eq("reservation", reservation).findOne();
        if (enrolment != null) {
            // already imported
            return wrapAsPromise(ok());
        }
        reservation.setUser(user);
        reservation.update();
        return externalExamAPI
            .requestEnrolment(user, reservation)
            .thenApplyAsync(e -> e == null ? internalServerError() : ok());
    }

    private static Language getLanguage(String code) {
        Language language = null;
        if (code != null) {
            // for example: en-US -> en
            String lcCode = code.split("-")[0].toLowerCase();
            language = DB.find(Language.class, lcCode);
        }
        if (language == null) {
            // Default to English
            language = DB.find(Language.class, "en");
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
        // urn:schac:personalUniqueCode:int:someID:xyz.fi:99999 => xyz.fi
        String attribute = src.substring(0, src.lastIndexOf(":"));
        return attribute.substring(attribute.lastIndexOf(":") + 1);
    }

    private String parseStudentIdValue(String src) {
        // urn:schac:personalUniqueCode:int:someID:xyz.fi:99999 => 9999
        String value = src.substring(src.lastIndexOf(":") + 1);
        return value.isBlank() || value.isEmpty() ? "null" : value;
    }

    private String parseUserIdentifier(String src) {
        if (!configReader.isMultiStudentIdEnabled() || !src.startsWith(URN_PREFIX)) {
            // No specific handling
            return src.substring(src.lastIndexOf(":") + 1);
        } else {
            return Arrays
                .stream(src.split(";"))
                .filter(s -> (s.contains("int:") || s.contains("fi:")) && !s.contains("esi:")) // TODO: make configurable?
                .collect(
                    Collectors.toMap(
                        this::parseStudentIdDomain,
                        this::parseStudentIdValue,
                        (v1, v2) -> {
                            logger.error(
                                "Duplicate user identifier key for values {} and {}. It will be marked with a null string",
                                v1,
                                v2
                            );
                            return "null";
                        },
                        () ->
                            new TreeMap<>(
                                Comparator.comparingInt(o ->
                                    !configReader.getMultiStudentOrganisations().contains(o)
                                        ? 1000
                                        : configReader.getMultiStudentOrganisations().indexOf(o)
                                )
                            )
                    )
                )
                .entrySet()
                .stream()
                .map(e -> String.format("%s:%s", e.getKey(), e.getValue()))
                .collect(Collectors.joining(" "));
        }
    }

    private Optional<String> parseDisplayName(Http.Request request) {
        return parse(request.header("displayName").orElse(""))
            .map(n -> n.indexOf(" ") > 0 ? n.substring(0, n.lastIndexOf(" ")) : n);
    }

    private String parseGivenName(Http.Request request) {
        return parse(request.header("givenName").orElse(""))
            .orElse(parseDisplayName(request).orElseThrow(IllegalArgumentException::new));
    }

    private Organisation findOrganisation(String attribute) {
        return DB.find(Organisation.class).where().eq("code", attribute).findOne();
    }

    private void updateUser(User user, Http.Request request) throws AddressException {
        user.setOrganisation(
            parse(request.header("homeOrganisation").orElse("")).map(this::findOrganisation).orElse(null)
        );
        user.setUserIdentifier(
            parse(request.header("schacPersonalUniqueCode").orElse("")).map(this::parseUserIdentifier).orElse(null)
        );
        user.setEmail(
            parse(request.header("mail").orElse(""))
                .flatMap(this::validateEmail)
                .orElseThrow(() -> new AddressException("invalid mail address"))
        );

        user.setLastName(parse(request.header("sn").orElse("")).orElseThrow(IllegalArgumentException::new));
        user.setFirstName(parseGivenName(request));
        user.setEmployeeNumber(parse(request.header("employeeNumber").orElse("")).orElse(null));
        user.setLogoutUrl(parse(request.header("logouturl").orElse("")).orElse(null));
    }

    private User createNewUser(String eppn, Http.Request request, boolean ignoreRoleNotFound)
        throws NotFoundException, AddressException {
        User user = new User();
        user
            .getRoles()
            .addAll(
                parseRoles(
                    parse(request.header("unscoped-affiliation").orElse(""))
                        .orElseThrow(() -> new NotFoundException("role not found")),
                    ignoreRoleNotFound
                )
            );
        user.setLanguage(getLanguage(parse(request.header("preferredLanguage").orElse("")).orElse(null)));
        user.setEppn(eppn);
        updateUser(user, request);
        return user;
    }

    private CompletionStage<Result> createSession(User user, boolean isTemporaryVisitor, Http.Request request) {
        Map<String, String> payload = new HashMap<>();
        payload.put("since", ISODateTimeFormat.dateTime().print(DateTime.now()));
        payload.put("id", user.getId().toString());
        payload.put("email", user.getEmail());
        if (!user.getPermissions().isEmpty()) {
            // For now we support just a single permission
            payload.put("permissions", user.getPermissions().get(0).getValue());
        }
        // If (regular) user has just one role, set it as the one used for login
        if (user.getRoles().size() == 1 && !isTemporaryVisitor) {
            payload.put("role", user.getRoles().get(0).getName());
        }
        List<Role> roles = isTemporaryVisitor
            ? DB.find(Role.class).where().eq("name", Role.Name.STUDENT.toString()).findList()
            : user.getRoles();
        if (isTemporaryVisitor) {
            payload.put("visitingStudent", "true");
            payload.put("role", roles.get(0).getName()); // forced login as student
        }
        ObjectNode result = Json.newObject();
        result.put("id", user.getId());
        result.put("firstName", user.getFirstName());
        result.put("lastName", user.getLastName());
        result.put("lang", user.getLanguage().getCode());
        result.set("roles", Json.toJson(roles));
        result.set("permissions", Json.toJson(user.getPermissions()));
        result.put("userAgreementAccepted", user.isUserAgreementAccepted());
        result.put("userIdentifier", user.getUserIdentifier());
        result.put("email", user.getEmail());
        return checkStudentSession(request, new Http.Session(payload), ok(result));
    }

    // prints HAKA attributes, used for debugging
    @ActionMethod
    public Result getAttributes(Http.Request request) {
        Http.Headers attributes = request.headers();
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
            throw new NotFoundException("i18n_error_role_not_found " + attribute);
        }
        return userRoles;
    }

    @ActionMethod
    public Result logout(Http.Request request) {
        Map<String, String> session = request.session().data();
        if (!session.isEmpty()) {
            Long userId = Long.parseLong(session.get("id"));
            User user = DB.find(User.class, userId);
            if (user != null && user.getLogoutUrl() != null) {
                ObjectNode node = Json.newObject();
                node.put("logoutUrl", user.getLogoutUrl());
                return ok(Json.toJson(node)).withNewSession().discardingCookie("PLAY_SESSION");
            }
        }
        Result result = ok().withNewSession().discardingCookie("PLAY_SESSION");
        return environment.isDev() ? result : result.discardingCookie(configReader.getCsrfCookie());
    }

    @SubjectPresent
    public CompletionStage<Result> setLoginRole(String roleName, Http.Request request) {
        Http.Session session = request.session();
        if (session.get("id").isEmpty()) {
            return wrapAsPromise(unauthorized());
        }
        User user = DB.find(User.class, Long.parseLong(session.get("id").get()));
        if (user == null) {
            return wrapAsPromise(notFound());
        }
        Role role = DB.find(Role.class).where().eq("name", roleName).findOne();
        if (role == null) {
            return wrapAsPromise(notFound());
        }
        if (!user.getRoles().contains(role)) {
            return wrapAsPromise(forbidden());
        }
        return checkStudentSession(request, session.adding("role", roleName), ok(role));
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    public Result extendSession(Http.Request request) {
        return ok().withSession(request.session().adding("since", ISODateTimeFormat.dateTime().print(DateTime.now())));
    }

    @ActionMethod
    public CompletionStage<Result> checkSession(Http.Request request) {
        Http.Session session = request.session();
        if (session.get("since").isEmpty()) {
            logger.info("Session not found");
            return wrapAsPromise(ok("no_session"));
        }
        DateTime expirationTime = ISODateTimeFormat
            .dateTimeParser()
            .parseDateTime(session.get("since").get())
            .plusMinutes(SESSION_TIMEOUT_MINUTES);
        DateTime alarmTime = expirationTime.minusMinutes(2);
        logger.debug("Session expiration due at {}", expirationTime);
        if (expirationTime.isBeforeNow()) {
            logger.info("Session has expired");
            return wrapAsPromise(ok("no_session").withNewSession());
        }
        String reason = alarmTime.isBeforeNow() ? "alarm" : "";
        // check for upcoming student reservations
        return checkStudentSession(request, session, ok(reason));
    }

    private CompletionStage<Result> checkStudentSession(Http.Request request, Http.Session session, Result result) {
        if (isStudent(session) && session.get("id").isPresent()) {
            return enrolmentRepository
                .getReservationHeaders(request, Long.parseLong(session.get("id").get()))
                .thenApplyAsync(
                    headers -> {
                        Http.Session newSession = updateSession(session, headers);
                        return result.withSession(newSession);
                    },
                    ec.current()
                );
        } else {
            return wrapAsPromise(result.withSession(session));
        }
    }

    private Http.Session updateSession(Http.Session session, Map<String, String> headers) {
        Map<String, String> payload = new HashMap<>(session.data());
        SESSION_HEADER_MAP
            .entrySet()
            .stream()
            .filter(e -> headers.containsKey(e.getKey()))
            .forEach(e -> payload.put(e.getValue(), headers.get(e.getKey())));
        SESSION_HEADER_MAP
            .entrySet()
            .stream()
            .filter(e -> !headers.containsKey(e.getKey()))
            .forEach(e -> payload.remove(e.getValue()));
        return new Http.Session(payload);
    }

    private boolean isStudent(Http.Session session) {
        return (session.get("role").isPresent() && Role.Name.STUDENT.toString().equals(session.get("role").get()));
    }

    private static Optional<String> parse(String src) {
        if (src == null || src.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(URLDecoder.decode(src, StandardCharsets.UTF_8));
    }
}
