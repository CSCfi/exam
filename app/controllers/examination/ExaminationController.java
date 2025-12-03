// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.examination;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import controllers.admin.SettingsController;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.typesafe.config.Config;
import controllers.base.BaseController;
import controllers.iop.transfer.api.ExternalAttachmentLoader;
import impl.AutoEvaluationHandler;
import impl.mail.EmailComposer;
import io.ebean.DB;
import io.ebean.text.PathProperties;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.SecureRandom;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import miscellaneous.config.ByodConfigHandler;
import miscellaneous.datetime.DateTimeHandler;
import models.admin.GeneralSettings;
import models.assessment.ExamInspection;
import models.enrolment.ExamEnrolment;
import models.enrolment.ExamParticipation;
import models.exam.Exam;
import models.facility.ExamRoom;
import models.iop.CollaborativeExam;
import models.questions.ClozeTestAnswer;
import models.questions.EssayAnswer;
import models.sections.ExamSectionQuestion;
import models.user.User;
import org.apache.pekko.actor.ActorSystem;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.Environment;
import play.db.ebean.Transactional;
import play.libs.concurrent.ClassLoaderExecutionContext;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import repository.ExaminationRepository;
import scala.concurrent.duration.Duration;
import scala.jdk.javaapi.OptionConverters;
import security.Authenticated;
import system.interceptors.ExamActionRouter;
import system.interceptors.SensitiveDataPolicy;
import validation.answer.ClozeTestAnswerDTO;
import validation.answer.ClozeTestAnswerValidator;
import validation.answer.EssayAnswerDTO;
import validation.answer.EssayAnswerValidator;
import validation.core.Attrs;

@SensitiveDataPolicy(sensitiveFieldNames = { "score", "defaultScore", "correctOption", "claimChoiceType", "configKey" })
public class ExaminationController extends BaseController {

    protected final EmailComposer emailComposer;
    protected final ExaminationRepository examinationRepository;
    protected final ActorSystem actor;
    protected final ClassLoaderExecutionContext httpExecutionContext;
    private final AutoEvaluationHandler autoEvaluationHandler;
    protected final Environment environment;
    private final ExternalAttachmentLoader externalAttachmentLoader;
    private final ByodConfigHandler byodConfigHandler;
    protected final DateTimeHandler dateTimeHandler;
    private final Config config;

    private final Logger logger = LoggerFactory.getLogger(ExaminationController.class);

    @Inject
    public ExaminationController(
        EmailComposer emailComposer,
        ExaminationRepository examinationRepository,
        ActorSystem actor,
        AutoEvaluationHandler autoEvaluationHandler,
        Environment environment,
        ClassLoaderExecutionContext httpExecutionContext,
        ExternalAttachmentLoader externalAttachmentLoader,
        ByodConfigHandler byodConfigHandler,
        DateTimeHandler dateTimeHandler,
        Config config
    ) {
        this.emailComposer = emailComposer;
        this.examinationRepository = examinationRepository;
        this.actor = actor;
        this.autoEvaluationHandler = autoEvaluationHandler;
        this.environment = environment;
        this.httpExecutionContext = httpExecutionContext;
        this.externalAttachmentLoader = externalAttachmentLoader;
        this.byodConfigHandler = byodConfigHandler;
        this.dateTimeHandler = dateTimeHandler;
        this.config = config;
    }

    private Result postProcessClone(ExamEnrolment enrolment, Optional<Exam> oe) {
        if (oe.isEmpty()) {
            return internalServerError();
        }
        Exam newExam = oe.get();
        if (enrolment.getCollaborativeExam() != null) {
            try {
                externalAttachmentLoader.fetchExternalAttachmentsAsLocal(newExam).get();
            } catch (InterruptedException | ExecutionException e) {
                logger.error("Could not fetch external attachments!", e);
            }
        }
        newExam.setCloned(true);
        newExam.setDerivedMaxScores();
        examinationRepository.processClozeTestQuestions(newExam);
        return ok(newExam, getPath(false));
    }

    private CompletionStage<Result> postProcessExisting(
        Exam clone,
        User user,
        CollaborativeExam ce,
        Http.Request request
    ) {
        // sanity check
        if (!clone.hasState(Exam.State.INITIALIZED, Exam.State.STUDENT_STARTED)) {
            return wrapAsPromise(forbidden());
        }
        return examinationRepository
            .findEnrolment(user, clone, ce, false)
            .thenComposeAsync(
                optionalEnrolment -> {
                    if (optionalEnrolment.isEmpty()) {
                        return wrapAsPromise(forbidden());
                    }
                    ExamEnrolment enrolment = optionalEnrolment.get();
                    return getEnrolmentError(
                        // allow state = initialized
                        enrolment,
                        request
                    ).thenComposeAsync(
                        error -> {
                            if (error.isPresent()) {
                                return wrapAsPromise(error.get());
                            }
                            return examinationRepository
                                .createFinalExam(clone, user, enrolment)
                                .thenComposeAsync(
                                    e -> wrapAsPromise(ok(e, getPath(false))),
                                    httpExecutionContext.current()
                                );
                        },
                        httpExecutionContext.current()
                    );
                },
                httpExecutionContext.current()
            );
    }

    private CompletionStage<Result> createClone(
        Exam prototype,
        User user,
        CollaborativeExam ce,
        Http.Request request,
        boolean isInitialization
    ) {
        return examinationRepository
            .findEnrolment(user, prototype, ce, isInitialization)
            .thenComposeAsync(
                optionalEnrolment -> {
                    if (optionalEnrolment.isEmpty()) {
                        return wrapAsPromise(forbidden());
                    }
                    ExamEnrolment enrolment = optionalEnrolment.get();
                    return getEnrolmentError(
                        // allow state = initialized
                        enrolment,
                        request
                    ).thenComposeAsync(
                        error -> {
                            if (error.isPresent()) {
                                return wrapAsPromise(error.get());
                            }
                            return examinationRepository
                                .createExam(prototype, user, enrolment)
                                .thenApplyAsync(oe -> postProcessClone(enrolment, oe), httpExecutionContext.current());
                        },
                        httpExecutionContext.current()
                    );
                },
                httpExecutionContext.current()
            );
    }

    private CompletionStage<Result> prepareExam(CollaborativeExam ce, String hash, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        PathProperties pp = getPath(false);
        return examinationRepository
            .getPrototype(hash, ce, pp)
            .thenComposeAsync(
                optionalPrototype ->
                    examinationRepository
                        .getPossibleClone(hash, user, ce, pp)
                        .thenComposeAsync(
                            possibleClone -> {
                                if (optionalPrototype.isEmpty() && possibleClone.isEmpty()) {
                                    return wrapAsPromise(notFound());
                                }
                                if (possibleClone.isEmpty()) {
                                    // Exam is not started yet, create a new one for the student
                                    return createClone(optionalPrototype.get(), user, ce, request, false);
                                } else {
                                    // Exam started already
                                    return postProcessExisting(possibleClone.get(), user, ce, request);
                                }
                            },
                            httpExecutionContext.current()
                        ),
                httpExecutionContext.current()
            );
    }

    private CompletionStage<Result> prepareExam(String hash, Http.Request request) {
        return examinationRepository
            .getCollaborativeExam(hash)
            .thenComposeAsync(oce -> prepareExam(oce.orElse(null), hash, request), httpExecutionContext.current());
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @ExamActionRouter
    public CompletionStage<Result> startExam(String hash, Http.Request request) throws IOException {
        return prepareExam(hash, request);
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @ExamActionRouter
    public CompletionStage<Result> initializeExam(String hash, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        PathProperties pp = getPath(false);
        return examinationRepository
            .getCollaborativeExam(hash)
            .thenComposeAsync(
                oce -> {
                    CollaborativeExam ce = oce.orElse(null);
                    return examinationRepository
                        .getPrototype(hash, ce, pp)
                        .thenComposeAsync(
                            oe -> {
                                // check
                                return oe
                                    .map(exam ->
                                        examinationRepository
                                            .getPossibleClone(hash, user, ce, pp)
                                            .thenComposeAsync(
                                                pc -> {
                                                    if (pc.isPresent()) return wrapAsPromise(ok());
                                                    else {
                                                        return createClone(exam, user, ce, request, true);
                                                    }
                                                },
                                                httpExecutionContext.current()
                                            )
                                    )
                                    .orElseGet(() -> wrapAsPromise(ok()));
                            },
                            httpExecutionContext.current()
                        );
                },
                httpExecutionContext.current()
            );
    }

    public Result startLogin(Http.Request request) {
        String toolInitiateLogin = config.getString("lti.tool.initiate-login-url");
        String platformIssuer = config.getString("lti.platform.issuer");
        String targetLinkUri = config.getString("lti.platform.target-link-uri");
        String clientId = config.getString("lti.platform.client-id");

        String resourceId = request.getQueryString("resourceId");

        if (resourceId == null || resourceId.isBlank()) {
            return badRequest("Missing resourceId");
        }

        if (toolInitiateLogin.isEmpty() || platformIssuer.isEmpty() || targetLinkUri.isEmpty() || clientId.isEmpty()) {
            return badRequest("Missing required LTI settings (tool initiate url, issuer, target link uri, client id).");
        }

        String state = UUID.randomUUID().toString();
        String nonce = generateNonce();

        StringBuilder redirect = new StringBuilder(toolInitiateLogin);
        if (!toolInitiateLogin.contains("?")) redirect.append("?"); else redirect.append("&");
        redirect
            .append("iss=")
            .append(urlEncode(platformIssuer))
            .append("&login_hint=")
            .append(urlEncode("hint"))
            .append("&target_link_uri=")
            .append(urlEncode(targetLinkUri))
            .append("&client_id=")
            .append(urlEncode(clientId))
            .append("&nonce=")
            .append(urlEncode(nonce))
            .append("&state=")
            .append(urlEncode(state));

        // Persist state/nonce in session for verification
        return redirect(redirect.toString())
            .addingToSession(request, "lti_nonce", nonce)
            .addingToSession(request, "lti_state", state)
            .addingToSession(request, "lti_resource_id", resourceId);
    }

    public Result handleOidcLogin(Http.Request request) throws Exception {
        // Read query params
        String loginHint = request.getQueryString("login_hint");
        String redirectUri = request.getQueryString("redirect_uri");
        String state = request.getQueryString("state");
        String nonce = request.getQueryString("nonce");
        String clientId = request.getQueryString("client_id");

        // Required config
        String expectedClientId = config.getString("lti.platform.client-id");
        String deploymentId = config.getString("lti.platform.deployment-id");
        String issuer = config.getString("lti.platform.issuer");
        String keyId = config.getString("lti.platform.key-id");
        String privateKeyPath = config.getString("lti.platform.private-key");

        var ses = request.session();
        String resourceId = ses.getOptional("lti_resource_id").orElse(null);

        // Basic validation
        if (clientId == null || !expectedClientId.equals(clientId)) {
            return badRequest("Invalid client_id");
        }
        if (redirectUri == null || state == null || nonce == null) {
            return badRequest("Missing required parameters");
        }

        if (resourceId == null || resourceId.isBlank()) {
            return badRequest("Missing resourceId in session");
        }

        // TODO tarkista, että redirect uri on validi esim. sen pitää olla http://localhost:8888/moodle500/enrol/lti/launch.php
        //targetLinkUri

        // Build ID Token (5 minute expiry)
        Date now = new Date();
        Date exp = new Date(now.getTime() + 5 * 60 * 1000);

        Map<String, Object> contextClaim = new HashMap<>();
        contextClaim.put("id", "platorm-internal-id-12345678");
        contextClaim.put("label", "Oma tehtavava label");
        contextClaim.put("title", "Oma tehtava title");
        contextClaim.put("type", List.of("http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering"));

        Map<String, Object> resourceLink = new HashMap<>();

        //        String resourceId = "2788c809-8f36-4ea0-87ce-3a9191174971";
        logger.debug("ResourceId: " + resourceId);
        resourceLink.put("id", resourceId);

        resourceLink.put("title", "Tehtava moodle toolissa");

        Map<String, Object> custom = new HashMap<>();
        custom.put("id", resourceId);

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
            .issuer(issuer)
            .subject("user12345555") // your LMS-specific stable user id
            .audience(clientId)
            .expirationTime(exp)
            .issueTime(now)
            .jwtID(UUID.randomUUID().toString())
            .claim("nonce", nonce)
            // LTI 1.3 claims
            .claim("https://purl.imsglobal.org/spec/lti/claim/message_type", "LtiResourceLinkRequest")
            .claim("https://purl.imsglobal.org/spec/lti/claim/version", "1.3.0")
            .claim("https://purl.imsglobal.org/spec/lti/claim/deployment_id", deploymentId)
            .claim("https://purl.imsglobal.org/spec/lti/claim/target_link_uri", redirectUri)
            .claim(
                "https://purl.imsglobal.org/spec/lti/claim/roles",
                List.of("http://purl.imsglobal.org/vocab/lis/v2/membership#Learner")
            ) // FIXME
            .claim("https://purl.imsglobal.org/spec/lti/claim/context", contextClaim)
            .claim("https://purl.imsglobal.org/spec/lti/claim/resource_link", resourceLink)
            .claim("https://purl.imsglobal.org/spec/lti/claim/custom", custom)
            .build();

        // Sign JWT (RS256)
        RSAPrivateKey privateKey = loadPrivateKeyFromFile(privateKeyPath);
        SignedJWT signedJWT = new SignedJWT(
            new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(keyId).type(JOSEObjectType.JWT).build(),
            claims
        );
        signedJWT.sign(new RSASSASigner(privateKey));

        String idToken = signedJWT.serialize();

        // In Spring you did response.sendRedirect(...) — in Play just:
        String encodedToken = URLEncoder.encode(idToken, StandardCharsets.UTF_8);
        String encodedState = URLEncoder.encode(state, StandardCharsets.UTF_8);
        String frameLaunchUrl = "/integration/lti/launch-frame?id_token=" + encodedToken + "&state=" + encodedState;

        // --- Return a tiny auto-post page that submits inside THIS iframe
        String html = buildAutoPostHtml(redirectUri, idToken, state);

        return ok(html).as("text/html").withHeader("Cache-Control", "no-store").withHeader("Pragma", "no-cache");
        // Consider also:
        // .withHeader("Content-Security-Policy", "frame-ancestors https://your-spa-origin.example");
    }

    //    public Result handleOidcLogin(Http.Request request) throws Exception {
    //        // Read query params
    //        this.loginHint  = request.getQueryString("login_hint");
    //        this.redirectUri = request.getQueryString("redirect_uri");
    //        this.state      = request.getQueryString("state");
    //        this.nonce      = request.getQueryString("nonce");
    //        this.clientId   = request.getQueryString("client_id");
    //
    //        logger.debug("loginHint : {}", loginHint);
    //        logger.debug("redirectUri : {}", redirectUri);
    //        logger.debug("state     : {}", state);
    //        logger.debug("nonce     : {}", nonce);
    //        logger.debug("clientId   : {}", clientId);
    //
    //        // Required config
    //        String expectedClientId = config.getString("lti.platform.client-id");
    //
    //        // Basic validation
    //        if (clientId == null || !expectedClientId.equals(clientId)) {
    //            return badRequest("Invalid client_id");
    //        }
    //        if (redirectUri == null || state == null || nonce == null) {
    //            return badRequest("Missing required parameters");
    //        }
    //        logger.debug("handleOidcLogin: ok");
    //        return ok();
    //    }

    //    public Result loadLtiResourceLink(Http.Request request) throws Exception {
    //
    //        String deploymentId = config.getString("lti.platform.deployment-id");
    //        String issuer           = config.getString("lti.platform.issuer");
    //        String keyId            = config.getString("lti.platform.key-id");
    //        String privateKeyPath   = config.getString("lti.platform.private-key");
    //        String resourceId       = request.getQueryString("resourceId");
    //
    //
    //        // Build ID Token (5 minute expiry)
    //        Date now = new Date();
    //        Date exp = new Date(now.getTime() + 5 * 60 * 1000);
    //
    //        Map<String, Object> contextClaim = new HashMap<>();
    //        contextClaim.put("id", "platorm-internal-id-12345678");
    //        contextClaim.put("label", "Oma tehtavava label");
    //        contextClaim.put("title", "Oma tehtava title");
    //        contextClaim.put("type", List.of("http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering"));
    //
    //        Map<String, Object> resourceLink = new HashMap<>();
    //
    //        resourceLink.put("id", resourceId);
    //        resourceLink.put("title", "Tehtava moodle toolissa");
    //
    //        Map<String, Object> custom = new HashMap<>();
    //        custom.put("id", resourceId);
    //
    //        JWTClaimsSet claims = new JWTClaimsSet.Builder()
    //                .issuer(issuer)
    //                .subject("user12345555") // your LMS-specific stable user id
    //                .audience(clientId)
    //                .expirationTime(exp)
    //                .issueTime(now)
    //                .jwtID(UUID.randomUUID().toString())
    //                .claim("nonce", nonce)
    //
    //                // LTI 1.3 claims
    //                .claim("https://purl.imsglobal.org/spec/lti/claim/message_type", "LtiResourceLinkRequest")
    //                .claim("https://purl.imsglobal.org/spec/lti/claim/version", "1.3.0")
    //                .claim("https://purl.imsglobal.org/spec/lti/claim/deployment_id", deploymentId)
    //                .claim("https://purl.imsglobal.org/spec/lti/claim/target_link_uri", redirectUri)
    //                .claim("https://purl.imsglobal.org/spec/lti/claim/roles",
    //                        List.of("http://purl.imsglobal.org/vocab/lis/v2/membership#Learner")) // FIXME
    //                .claim("https://purl.imsglobal.org/spec/lti/claim/context", contextClaim)
    //                .claim("https://purl.imsglobal.org/spec/lti/claim/resource_link", resourceLink)
    //                .claim("https://purl.imsglobal.org/spec/lti/claim/custom", custom)
    //                .build();
    //
    //        // Sign JWT (RS256)
    //        RSAPrivateKey privateKey = loadPrivateKeyFromFile(privateKeyPath);
    //        SignedJWT signedJWT = new SignedJWT(
    //                new JWSHeader.Builder(JWSAlgorithm.RS256)
    //                        .keyID(keyId)
    //                        .type(JOSEObjectType.JWT)
    //                        .build(),
    //                claims
    //        );
    //        signedJWT.sign(new RSASSASigner(privateKey));
    //
    //        String idToken = signedJWT.serialize();
    //
    //        // --- Return a tiny auto-post page that submits inside THIS iframe
    //        String html = buildAutoPostHtml(redirectUri, idToken, state);
    //
    //        return ok(html)
    //                .as("text/html")
    //                .withHeader("Cache-Control", "no-store")
    //                .withHeader("Pragma", "no-cache");
    //    }
    //<iframe id="lti-frame2" name="lti-frame2" width="100%%" height="800" frameborder="0" allowfullscreen=""></iframe>
    //
    //            <form id="lti-form2" method="POST" target="lti-frame2" action="http://localhost:9000/integration/lti/resource">
    //                <input type="hidden" name="resourceId" value="2788c809-8f36-4ea0-87ce-3a9191174971">
    //            </form><!--container--><!--container--></div>
    private String buildAutoPostHtml(String postUrl, String idToken, String state) {
        return String.format(
            """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8"/>
              <title>LTI Launch</title>
            </head>
            <body>
              <form id="ltiLaunch" action="%s" method="POST" target="_self">
                <input type="hidden" name="id_token" value="%s"/>
                <input type="hidden" name="state" value="%s"/>
              </form>
              <noscript>
                <p>JavaScript is required to continue. Click the button below to launch.</p>
                <button form="ltiLaunch" type="submit">Continue</button>
              </noscript>
              <script>document.getElementById('ltiLaunch').submit();</script>
            </body>
            </html>
            """,
            escapeHtml(postUrl),
            escapeHtml(idToken),
            escapeHtml(state)
        );
    }

    public Result renderIframeLaunch(Http.Request request) {
        String idToken = request.getQueryString("id_token");
        String state = request.getQueryString("state");
        String targetLinkUri = config.getString("lti.platform.target-link-uri");

        String html = String.format(
            """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Launching Moodle</title>
                <style>iframe { border: 1px solid; width:1024px }</style>
            </head>
            <body>
            <h1>Exam Demo</h1>
            <p>Tässä voi olla examin omaa sisältöä</p>

            <iframe id="lti-frame" name="lti-frame" width="100%%" height="800" frameborder="0" allowfullscreen></iframe>

            <form id="lti-form" action="%s" method="POST" target="lti-frame">
                <input type="hidden" name="id_token" value="%s"/>
                <input type="hidden" name="state" value="%s"/>
            </form>

            <script>
                document.getElementById("lti-form").submit();
            </script>
            </body>
            </html>
            """,
            targetLinkUri,
            escapeHtml(idToken),
            escapeHtml(state)
        );

        return ok(html).as("text/html");
    }

    private String escapeHtml(String input) {
        return input.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private RSAPrivateKey loadPrivateKey(String pem) throws Exception {
        String privateKeyPEM = pem
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "")
            .replaceAll(System.lineSeparator(), "");

        byte[] encoded = Base64.getDecoder().decode(privateKeyPEM);
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return (RSAPrivateKey) kf.generatePrivate(keySpec);
    }

    public RSAPrivateKey loadPrivateKeyFromFile(String filePath) throws Exception {
        // Read the PEM file content
        String pem = new String(Files.readAllBytes(Paths.get(filePath)));
        return loadPrivateKey(pem);
    }

    private static String urlEncode(String s) {
        try {
            return URLEncoder.encode(s, StandardCharsets.UTF_8.toString());
        } catch (UnsupportedEncodingException e) {
            return s;
        }
    }

    private static String generateNonce() {
        SecureRandom secureRandom = new SecureRandom();
        byte[] nonceBytes = new byte[16];
        secureRandom.nextBytes(nonceBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(nonceBytes);
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @Transactional
    public CompletionStage<Result> turnExam(String hash, Http.Request request) {
        return getEnrolmentError(hash, request).thenApplyAsync(oe ->
            oe.orElseGet(() -> {
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                Exam exam = DB.find(Exam.class)
                    .fetch("examSections.sectionQuestions.question")
                    .where()
                    .eq("creator", user)
                    .eq("hash", hash)
                    .findOne();
                if (exam == null) {
                    return notFound("i18n_error_exam_not_found");
                }
                Optional<ExamParticipation> oep = findParticipation(exam, user);
                Http.Session session = request.session().removing("ongoingExamHash");
                if (oep.isPresent()) {
                    ExamParticipation ep = oep.get();
                    setDurations(ep);

                    GeneralSettings settings = SettingsController.getOrCreateSettings("review_deadline", null, "14");
                    int deadlineDays = Integer.parseInt(settings.getValue());
                    DateTime deadline = ep.getEnded().plusDays(deadlineDays);
                    ep.setDeadline(deadline);
                    ep.save();
                    exam.setState(Exam.State.REVIEW);
                    exam.update();
                    if (exam.isPrivate()) {
                        notifyTeachers(exam);
                    }
                    autoEvaluationHandler.autoEvaluate(exam);
                }
                return ok().withSession(session);
            })
        );
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @Transactional
    public CompletionStage<Result> abortExam(String hash, Http.Request request) {
        return getEnrolmentError(hash, request).thenApplyAsync(oe ->
            oe.orElseGet(() -> {
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                Exam exam = DB.find(Exam.class).where().eq("creator", user).eq("hash", hash).findOne();
                if (exam == null) {
                    return notFound("i18n_error_exam_not_found");
                }
                Optional<ExamParticipation> oep = findParticipation(exam, user);
                Http.Session session = request.session().removing("ongoingExamHash");
                if (oep.isPresent()) {
                    setDurations(oep.get());
                    oep.get().save();
                    exam.setState(Exam.State.ABORTED);
                    exam.update();
                    if (exam.isPrivate()) {
                        notifyTeachers(exam);
                    }
                    return ok().withSession(session);
                } else {
                    return forbidden().withSession(session);
                }
            })
        );
    }

    @Authenticated
    @With(EssayAnswerValidator.class)
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> answerEssay(String hash, Long questionId, Http.Request request) {
        return getEnrolmentError(hash, request).thenApplyAsync(oe ->
            oe.orElseGet(() -> {
                EssayAnswerDTO dto = request.attrs().get(Attrs.ESSAY_ANSWER);
                String essayAnswer = dto.answer();
                Optional<Long> objectVersion = dto.getObjectVersionAsJava();
                ExamSectionQuestion question = DB.find(ExamSectionQuestion.class, questionId);
                if (question == null) {
                    return forbidden();
                }
                EssayAnswer answer = question.getEssayAnswer();
                if (answer == null) {
                    answer = new EssayAnswer();
                } else if (objectVersion.isPresent()) {
                    answer.setObjectVersion(objectVersion.get());
                }
                answer.setAnswer(essayAnswer);
                answer.save();
                question.setEssayAnswer(answer);
                question.save();
                return ok(answer);
            })
        );
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> answerMultiChoice(String hash, Long qid, Http.Request request) {
        return getEnrolmentError(hash, request).thenApplyAsync(oe ->
            oe.orElseGet(() -> {
                ArrayNode node = (ArrayNode) request.body().asJson().get("oids");
                List<Long> optionIds = StreamSupport.stream(node.spliterator(), false).map(JsonNode::asLong).toList();
                ExamSectionQuestion question = DB.find(ExamSectionQuestion.class, qid);
                if (question == null) {
                    return forbidden();
                }
                question
                    .getOptions()
                    .forEach(o -> {
                        o.setAnswered(optionIds.contains(o.getId()));
                        o.update();
                    });
                return ok();
            })
        );
    }

    @Authenticated
    @With(ClozeTestAnswerValidator.class)
    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> answerClozeTest(String hash, Long questionId, Http.Request request) {
        return getEnrolmentError(hash, request).thenApplyAsync(oe ->
            oe.orElseGet(() -> {
                ExamSectionQuestion esq = DB.find(ExamSectionQuestion.class, questionId);
                if (esq == null) {
                    return forbidden();
                }
                ClozeTestAnswerDTO dto = request.attrs().get(Attrs.CLOZE_TEST_ANSWER);
                ClozeTestAnswer answer = esq.getClozeTestAnswer();
                if (answer == null) {
                    answer = new ClozeTestAnswer();
                } else {
                    long objectVersion = dto.getObjectVersionAsJava().orElse(0L);
                    answer.setObjectVersion(objectVersion);
                }
                answer.setAnswer(dto.answer());
                answer.save();
                return ok(answer, PathProperties.parse("(id, objectVersion, answer)"));
            })
        );
    }

    private Optional<ExamParticipation> findParticipation(Exam exam, User user) {
        return DB.find(ExamParticipation.class)
            .where()
            .eq("exam.id", exam.getId())
            .eq("user", user)
            .isNull("ended")
            .findOneOrEmpty();
    }

    private void setDurations(ExamParticipation ep) {
        DateTime now;
        if (ep.getExam().getImplementation() != Exam.Implementation.AQUARIUM) {
            now = DateTime.now();
        } else {
            now = ep.getReservation() == null
                ? dateTimeHandler.adjustDST(DateTime.now())
                : dateTimeHandler.adjustDST(DateTime.now(), ep.getReservation().getMachine().getRoom());
        }
        ep.setEnded(now);
        ep.setDuration(new DateTime(ep.getEnded().getMillis() - ep.getStarted().getMillis()));
    }

    protected CompletionStage<Optional<Result>> getEnrolmentError(ExamEnrolment enrolment, Http.Request request) {
        // If this is null, it means someone is either trying to access an exam by wrong hash
        // or the reservation is not in effect right now.
        if (enrolment == null) {
            return CompletableFuture.completedFuture(Optional.of(forbidden("i18n_reservation_not_found")));
        }
        Exam exam = enrolment.getExam();
        boolean isByod = exam != null && exam.getImplementation() == Exam.Implementation.CLIENT_AUTH;
        boolean isUnchecked = exam != null && exam.getImplementation() == Exam.Implementation.WHATEVER;
        if (isByod) {
            return CompletableFuture.completedFuture(
                OptionConverters.toJava(
                    byodConfigHandler
                        .checkUserAgent(request.asScala(), enrolment.getExaminationEventConfiguration().getConfigKey())
                        .map(play.api.mvc.Result::asJava)
                )
            );
        } else if (isUnchecked) {
            return CompletableFuture.completedFuture(Optional.empty());
        } else if (enrolment.getReservation() == null) {
            return CompletableFuture.completedFuture(Optional.of(forbidden("i18n_reservation_not_found")));
        } else if (enrolment.getReservation().getMachine() == null) {
            return CompletableFuture.completedFuture(Optional.of(forbidden("i18n_reservation_machine_not_found")));
        } else if (
            !environment.isDev() &&
            !enrolment.getReservation().getMachine().getIpAddress().equals(request.remoteAddress())
        ) {
            return examinationRepository
                .findRoom(enrolment)
                .thenApplyAsync(
                    or -> {
                        if (or.isEmpty()) {
                            return Optional.of(notFound());
                        }
                        ExamRoom room = or.get();
                        String message =
                            "i18n_wrong_exam_machine " +
                            room.getName() +
                            ", " +
                            room.getMailAddress().toString() +
                            ", i18n_exam_machine " +
                            enrolment.getReservation().getMachine().getName();
                        return Optional.of(forbidden(message));
                    },
                    httpExecutionContext.current()
                );
        }
        return CompletableFuture.completedFuture(Optional.empty());
    }

    public static PathProperties getPath(boolean includeEnrolment) {
        String path =
            "(id, name, state, instruction, hash, duration, cloned, external, implementation, " +
            "course(id, code, name), examType(id, type), executionType(id, type), " + // (
            "examParticipation(id), " + //
            "examLanguages(code), attachment(fileName), examOwners(firstName, lastName)" +
            "examInspections(*, user(id, firstName, lastName))" +
            "examSections(id, name, sequenceNumber, description, lotteryOn, lotteryItemCount," + // ((
            "examMaterials(name, author, isbn), " +
            "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, derivedMinScore, " + // (((
            "question(id, type, question, attachment(id, fileName))" +
            "options(id, answered, option(id, option))" +
            "essayAnswer(id, answer, objectVersion, attachment(fileName))" +
            "clozeTestAnswer(id, question, answer, objectVersion)" +
            ")))";
        return PathProperties.parse(includeEnrolment ? String.format("(exam%s)", path) : path);
    }

    private CompletionStage<Optional<Result>> getEnrolmentError(String hash, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment = DB.find(ExamEnrolment.class)
            .where()
            .eq("exam.hash", hash)
            .eq("exam.creator", user)
            .eq("exam.state", Exam.State.STUDENT_STARTED)
            .findOne();
        return getEnrolmentError(enrolment, request);
    }

    private void notifyTeachers(Exam exam) {
        Set<User> recipients = new HashSet<>();
        recipients.addAll(exam.getParent().getExamOwners());
        recipients.addAll(exam.getExamInspections().stream().map(ExamInspection::getUser).collect(Collectors.toSet()));
        actor
            .scheduler()
            .scheduleOnce(
                Duration.create(1, TimeUnit.SECONDS),
                () ->
                    recipients.forEach(r -> {
                        emailComposer.composePrivateExamEnded(r, exam);
                        logger.info("Email sent to {}", r.getEmail());
                    }),
                actor.dispatcher()
            );
    }
}
