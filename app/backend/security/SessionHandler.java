package backend.security;

import java.util.Optional;

import com.google.inject.ImplementedBy;
import play.mvc.Http;

import backend.models.Session;

@ImplementedBy(SessionHandlerImpl.class)
public interface SessionHandler {

    Optional<Session> getSession(Http.RequestHeader request);
    Optional<String> getSessionToken(Http.RequestHeader request);
    void updateSession(Http.RequestHeader request, Session session);
    String createSession(Http.RequestHeader request, Session session);
    void flushSession(String token);
}
