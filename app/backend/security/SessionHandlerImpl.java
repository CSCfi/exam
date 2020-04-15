package backend.security;

import java.util.Optional;
import java.util.UUID;

import com.google.inject.Inject;
import com.typesafe.config.ConfigFactory;
import play.cache.SyncCacheApi;
import play.mvc.Http;

import backend.models.Session;

public class SessionHandlerImpl implements SessionHandler {

    private static final String LOGIN_TYPE = ConfigFactory.load().getString("sitnet.login");
    private static final String TOKEN_HEADER = "x-exam-authentication";
    private static final String CACHE_PREFIX = "user.session.";

    @Inject
    private SyncCacheApi cache;

    @Override
    public Optional<Session> getSession(Http.RequestHeader request) {
        String token = request.header(LOGIN_TYPE.equals("HAKA") ? "Shib-Session-ID" : TOKEN_HEADER).orElse("");
        return cache.get(CACHE_PREFIX + token);
    }

    @Override
    public Optional<String> getSessionToken(Http.RequestHeader request) {
        return request.header(LOGIN_TYPE.equals("HAKA") ? "Shib-Session-ID" : TOKEN_HEADER);
    }

    @Override
    public void updateSession(Http.RequestHeader request, Session session) {
        String token = request.header(LOGIN_TYPE.equals("HAKA") ? "Shib-Session-ID" : TOKEN_HEADER).orElse("");
        cache.set(CACHE_PREFIX + token, session);
    }

    @Override
    public String createSession(Http.RequestHeader request, Session session) {
        String token = createToken(request).orElse("INVALID");
        cache.set(CACHE_PREFIX + token, session);
        return token;
    }

    private Optional<String> createToken(Http.RequestHeader request) {
        return LOGIN_TYPE.equals("HAKA") ?
                request.header("Shib-Session-ID") :
                Optional.of(UUID.randomUUID().toString());
    }

}
