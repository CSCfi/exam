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
        AuditLogger.log(request);
        return propagateAction();
    }

    private Action.Simple propagateAction() {
        return new Action.Simple() {

            @Override
            public CompletionStage<Result> call(Http.Request request) {
                return delegate
                    .call(request)
                    .thenApply(
                        r -> {
                            r = r.withHeaders("Cache-Control", "no-cache;no-store", "Pragma", "no-cache");
                            Http.Session respSession = r.session();
                            Http.Session reqSession = request.session();
                            if (respSession == null && reqSession == null) {
                                return r;
                            }
                            Http.Session session = respSession == null ? reqSession : respSession;
                            if (!request.path().contains("checkSession")) { // update expiration
                                session = session.adding("since", ISODateTimeFormat.dateTime().print(DateTime.now()));
                            }
                            r = decorate(r, session, "ongoingExamHash", "x-exam-start-exam");
                            r = decorate(r, session, "upcomingExamHash", "x-exam-upcoming-exam");
                            r = decorate(r, session, "wrongMachineData", "x-exam-wrong-machine");
                            r = decorate(r, session, "wrongRoomData", "x-exam-wrong-room");
                            return r.withSession(session);
                        }
                    );
            }
        };
    }

    private Result decorate(Result result, Http.Session session, String key, String header) {
        return session.get(key).isPresent()
            ? result.withHeader(header, session.get(key).get())
            : result.withoutHeader(header);
    }
}
