package backend.security;

import backend.models.Session;
import com.google.inject.ImplementedBy;
import java.util.Optional;
import play.mvc.Http;

@ImplementedBy(SessionHandlerImpl.class)
public interface SessionHandler {
  Optional<Session> getSession(Http.RequestHeader request);
  Optional<String> getSessionToken(Http.RequestHeader request);
  void updateSession(Http.RequestHeader request, Session session);
  String createSession(Http.RequestHeader request, Session session);
  void flushSession(String token);
}
