package validators;


import com.fasterxml.jackson.databind.JsonNode;
import com.github.fge.jackson.JsonLoader;
import com.github.fge.jsonschema.core.exceptions.ProcessingException;
import com.github.fge.jsonschema.core.report.ProcessingReport;
import com.github.fge.jsonschema.main.JsonSchema;
import com.github.fge.jsonschema.main.JsonSchemaFactory;
import com.google.inject.Inject;
import play.Environment;
import play.Logger;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import java.io.File;
import java.io.IOException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.StreamSupport;

class JsonSchemaValidator extends Action<JsonValidator> {

    private Environment env;

    @Inject
    JsonSchemaValidator(Environment env) {
        this.env = env;
    }

    private JsonSchema getSchema() throws IOException, ProcessingException {
        String fileName = String.format("%s/conf/schemas/%s.json",
                env.rootPath().getAbsolutePath(), configuration.schema());
        JsonNode schemaNode = JsonLoader.fromFile(new File(fileName));
        JsonSchemaFactory factory = JsonSchemaFactory.byDefault();
        return factory.getJsonSchema(schemaNode);
    }

    private boolean isValid(JsonNode input) throws Exception {
        ProcessingReport report = getSchema().validate(input);
        if (!report.isSuccess()) {
            StreamSupport.stream(report.spliterator(), true).forEach(
                    m -> Logger.error("JSON validation error: schema={}, err={}",
                            configuration.schema(), m.getMessage()));
        }
        return report.isSuccess();
    }

    @Override
    public CompletionStage<Result> call(Http.Context ctx) {
        try {
            if (!isValid(ctx.request().body().asJson())) {
                return CompletableFuture.supplyAsync(Results::badRequest);
            }
        } catch (Exception e) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        return delegate.call(ctx);
    }

}
