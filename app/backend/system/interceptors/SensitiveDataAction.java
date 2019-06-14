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


import java.util.concurrent.CompletionStage;

import akka.stream.Materializer;
import com.google.inject.Inject;
import play.mvc.Http;
import play.mvc.Result;

// Action composition to ensure that no data classed as sensitive shall be sent to client.
class SensitiveDataAction extends JsonFilterAction<SensitiveDataPolicy> {

    @Inject
    SensitiveDataAction(Materializer materializer) {
        super(materializer);
    }

    @Override
    public CompletionStage<Result> call(Http.Request request) {
        return delegate.call(request)
                .thenCompose(result -> filterJsonResponse(result, configuration.sensitiveFieldNames()));
    }
}
