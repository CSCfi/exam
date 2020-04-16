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

package backend.system;

import backend.models.Session;
import backend.security.SessionHandler;
import com.google.inject.Inject;
import java.lang.reflect.Method;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import org.joda.time.DateTime;
import play.http.ActionCreator;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;

public class SystemRequestHandler implements ActionCreator {
  private final SessionHandler sessionHandler;

  @Inject
  public SystemRequestHandler(SessionHandler sessionHandler) {
    this.sessionHandler = sessionHandler;
  }

  @Override
  public Action.Simple createAction(Http.Request request, Method actionMethod) {
    Optional<Session> os = sessionHandler.getSession(request);
    AuditLogger.log(request, os.orElse(null));
    os.ifPresent(s -> updateExpiration(request, s));
    return propagateAction(os.orElse(null));
  }

  private Action.Simple propagateAction(Session session) {
    return new Action.Simple() {

      @Override
      public CompletionStage<Result> call(Http.Request request) {
        return delegate
          .call(request)
          .thenApply(
            r -> {
              r = r.withHeaders("Cache-Control", "no-cache;no-store", "Pragma", "no-cache");
              // If ongoing exam, we need to decorate every response with that knowledge
              if (session != null && session.getOngoingExamHash() != null) {
                r = r.withHeader("x-exam-start-exam", session.getOngoingExamHash());
              }
              if (session != null && session.getUpcomingExamHash() != null) {
                r = r.withHeader("x-exam-upcoming-exam", session.getUpcomingExamHash());
              }
              if (session != null && session.getWrongMachineData() != null) {
                r = r.withHeader("x-exam-wrong-machine", session.getWrongMachineData());
              }
              if (session != null && session.getWrongRoomData() != null) {
                r = r.withHeader("x-exam-wrong-room", session.getWrongRoomData());
              }
              return r;
            }
          );
      }
    };
  }

  private void updateExpiration(Http.Request request, Session session) {
    if (!request.path().contains("checkSession")) {
      session.setSince(DateTime.now());
      sessionHandler.updateSession(request, session);
    }
  }
}
