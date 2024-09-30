// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.interceptors;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import org.apache.pekko.stream.Materializer;
import play.libs.typedmap.TypedKey;
import play.mvc.Http;
import play.mvc.Result;

public class AnonymousJsonAction extends JsonFilterAction<Anonymous> {

    public static final String ANONYMOUS_HEADER = "Anonymous";
    public static final String CONTEXT_KEY = "ids";

    @Inject
    public AnonymousJsonAction(Materializer materializer) {
        super(materializer);
    }

    @Override
    public CompletionStage<Result> call(Http.Request request) {
        return delegate
            .call(request)
            .thenCompose(result -> {
                if (result.header(ANONYMOUS_HEADER).isPresent()) {
                    final String key = configuration.contextParamKey();
                    Optional<Set<Long>> ids = request.attrs().getOptional(TypedKey.create(key));
                    return filterJsonResponse(
                        result,
                        ids.orElse(Collections.emptySet()),
                        configuration.filteredProperties()
                    );
                }
                return CompletableFuture.completedFuture(result);
            });
    }
}
