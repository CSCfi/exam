// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.interceptors;

import com.google.inject.Inject;
import java.util.concurrent.CompletionStage;
import org.apache.pekko.stream.Materializer;
import play.mvc.Http;
import play.mvc.Result;

// Action composition to ensure that no data classed as sensitive shall be sent to the client.
class SensitiveDataAction extends JsonFilterAction<SensitiveDataPolicy> {

    @Inject
    SensitiveDataAction(Materializer materializer) {
        super(materializer);
    }

    @Override
    public CompletionStage<Result> call(Http.Request request) {
        return delegate
            .call(request)
            .thenCompose(result -> filterJsonResponse(result, configuration.sensitiveFieldNames()));
    }
}
