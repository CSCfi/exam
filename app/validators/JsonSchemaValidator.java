// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validators;

import com.fasterxml.jackson.databind.JsonNode;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.Environment;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

class JsonSchemaValidator extends Action<JsonValidator> {

    private final Logger logger = LoggerFactory.getLogger(JsonSchemaValidator.class);

    private final Environment env;

    @Inject
    JsonSchemaValidator(Environment env) {
        this.env = env;
    }

    private JsonSchema getSchema() throws IOException {
        String fileName = String.format(
            "%s/conf/schemas/%s.json",
            env.rootPath().getAbsolutePath(),
            configuration.schema()
        );
        JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V4);
        InputStream is = new FileInputStream(fileName);
        JsonSchema schema = factory.getSchema(is);
        is.close();
        return schema;
    }

    private boolean isValid(JsonNode input) throws Exception {
        Set<ValidationMessage> errors = getSchema().validate(input);
        errors.forEach(e ->
            logger.error("JSON validation error: schema={}, err={}", configuration.schema(), e.getMessage())
        );
        return errors.isEmpty();
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
