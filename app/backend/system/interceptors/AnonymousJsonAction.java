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
import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
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
      .thenCompose(
        result -> {
          if (result.header(ANONYMOUS_HEADER).isPresent()) {
            final String key = configuration.contextParamKey();
            Optional<Set<Long>> ids = request.attrs().getOptional(TypedKey.create(key));
            return filterJsonResponse(result, ids.orElse(Collections.emptySet()), configuration.filteredProperties());
          }
          return CompletableFuture.completedFuture(result);
        }
      );
  }
}
