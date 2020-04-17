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

import java.lang.reflect.Method;
import java.util.concurrent.CompletionStage;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.http.ActionCreator;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;

public class SystemRequestHandler implements ActionCreator {

    @Override
    public Action.Simple createAction(Http.Request request, Method actionMethod) {
        Http.Session session = request.session();
        AuditLogger.log(request);
        if (session.get("id").isPresent()) {
            return propagateAction(withUpdatedExpiration(request, session));
        }
        return propagateAction(session);
    }

    private Action.Simple propagateAction(Http.Session session) {
        return new Action.Simple() {

            @Override
            public CompletionStage<Result> call(Http.Request request) {
                return delegate
                    .call(request)
                    .thenApply(
                        r -> {
                            r = r.withHeaders("Cache-Control", "no-cache;no-store", "Pragma", "no-cache");
                            // If ongoing exam, we need to decorate every response with that knowledge
                            if (session.get("ongoingExamHash").isPresent()) {
                                r = r.withHeader("x-exam-start-exam", session.get("ongoingExamHash").get());
                            }
                            if (session.get("upcomingExamHash").isPresent()) {
                                r = r.withHeader("x-exam-upcoming-exam", session.get("upcomingExamHash").get());
                            }
                            if (session.get("wrongMachineData").isPresent()) {
                                r = r.withHeader("x-exam-wrong-machine", session.get("wrongMachineData").get());
                            }
                            if (session.get("wrongRoomData").isPresent()) {
                                r = r.withHeader("x-exam-wrong-room", session.get("wrongRoomData").get());
                            }
                            return r;
                        }
                    );
            }
        };
    }

    private Http.Session withUpdatedExpiration(Http.Request request, Http.Session session) {
        if (!request.path().contains("checkSession")) {
            return session.adding("since", ISODateTimeFormat.dateTime().print(DateTime.now()));
        }
        return session;
    }
}
