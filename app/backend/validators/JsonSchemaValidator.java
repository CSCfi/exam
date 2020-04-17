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

package backend.validators;

import com.fasterxml.jackson.databind.JsonNode;
import com.github.fge.jackson.JsonLoader;
import com.github.fge.jsonschema.core.exceptions.ProcessingException;
import com.github.fge.jsonschema.core.report.ProcessingReport;
import com.github.fge.jsonschema.main.JsonSchema;
import com.github.fge.jsonschema.main.JsonSchemaFactory;
import com.google.inject.Inject;
import java.io.File;
import java.io.IOException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.StreamSupport;
import play.Environment;
import play.Logger;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

class JsonSchemaValidator extends Action<JsonValidator> {
    private static final Logger.ALogger logger = Logger.of(JsonSchemaValidator.class);

    private Environment env;

    @Inject
    JsonSchemaValidator(Environment env) {
        this.env = env;
    }

    private JsonSchema getSchema() throws IOException, ProcessingException {
        String fileName = String.format(
            "%s/conf/schemas/%s.json",
            env.rootPath().getAbsolutePath(),
            configuration.schema()
        );
        JsonNode schemaNode = JsonLoader.fromFile(new File(fileName));
        JsonSchemaFactory factory = JsonSchemaFactory.byDefault();
        return factory.getJsonSchema(schemaNode);
    }

    private boolean isValid(JsonNode input) throws Exception {
        ProcessingReport report = getSchema().validate(input);
        if (!report.isSuccess()) {
            StreamSupport
                .stream(report.spliterator(), true)
                .forEach(
                    m ->
                        logger.error("JSON validation error: schema={}, err={}", configuration.schema(), m.getMessage())
                );
        }
        return report.isSuccess();
    }

    @Override
    public CompletionStage<Result> call(Http.Request request) {
        try {
            if (!isValid(request.body().asJson())) {
                return CompletableFuture.completedFuture(Results.badRequest());
            }
        } catch (Exception e) {
            return CompletableFuture.completedFuture(Results.internalServerError());
        }
        return delegate.call(request);
    }
}
