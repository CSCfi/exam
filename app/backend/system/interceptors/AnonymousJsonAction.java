/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */

package backend.system.interceptors;

import akka.stream.Materializer;
import org.springframework.util.StringUtils;
import play.mvc.Http;
import play.mvc.Result;

import javax.inject.Inject;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public class AnonymousJsonAction extends JsonFilterAction<Anonymous> {

    public static final String ANONYMOUS_HEADER = "Anonymous";
    public static final String CONTEXT_KEY = "ids";

    @Inject
    public AnonymousJsonAction(Materializer materializer) {
        super(materializer);
    }

    @Override
    @SuppressWarnings("unchecked")
    public CompletionStage<Result> call(Http.Context ctx) {
        return delegate.call(ctx).thenCompose(result -> {
            if (result.header(ANONYMOUS_HEADER).isPresent()) {
                final String key = configuration.contextParamKey();
                Set<Long> ids = null;
                if (!StringUtils.isEmpty(key)) {
                    ids = (Set<Long>) ctx.args.get(key);
                }
                return filterJsonResponse(result, ids, configuration.filteredProperties());
            }
            return CompletableFuture.supplyAsync(() -> result);
        });
    }

}
