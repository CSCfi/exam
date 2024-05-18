// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.interceptors;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;

public class ExamActionRouterImpl extends Action<ExamActionRouter> {

    @Override
    public CompletionStage<Result> call(Http.Request request) {
        if (request.session().get("visitingStudent").isPresent()) {
            return CompletableFuture.completedFuture(redirect(request.path().replace("/app/", "/app/iop/")));
        }
        return delegate.call(request);
    }
}
