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

package backend.system.interceptors;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;

import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;

import backend.models.Session;
import backend.security.SessionHandler;

public class ExamActionRouterImpl extends Action<ExamActionRouter> {

    private final SessionHandler sessionHandler;

    @Inject
    public ExamActionRouterImpl(SessionHandler sessionHandler) {
        this.sessionHandler = sessionHandler;
    }

    @Override
    public CompletionStage<Result> call(Http.Request request) {
        Optional<Session> session = sessionHandler.getSession(request);
        if (session.isPresent() && session.get().isTemporalStudent()) {
            return CompletableFuture.supplyAsync(
                    () -> redirect(request.path().replace("/app/", "/app/iop/"))
            );
        }
        return delegate.call(request);
    }

}
