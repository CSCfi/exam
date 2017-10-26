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

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.StreamSupport;

class JsonSchemaValidator extends Action<JsonValidator> {

    private Environment env;
    private JsonSchema schema;

    @Inject
    JsonSchemaValidator(Environment env) throws Exception {
        this.env = env;
        this.schema = getSchema();
    }

    private String readFile(String path) throws IOException {
        byte[] encoded = Files.readAllBytes(Paths.get(path));
        return new String(encoded, Charset.defaultCharset());
    }

    private JsonSchema getSchema() throws IOException, ProcessingException {
        String text = readFile(String.format("%s/conf/schemas/%s.json", env.rootPath().getAbsolutePath(), configuration.schema()));
        JsonNode schemaNode = JsonLoader.fromString(text);
        JsonSchemaFactory factory = JsonSchemaFactory.byDefault();
        return factory.getJsonSchema(schemaNode);
    }

    private boolean isValid(JsonNode input) throws Exception {
        ProcessingReport report = schema.validate(input);
        if (!report.isSuccess()) {
            StreamSupport.stream(report.spliterator(), false).forEach(m -> {
                Logger.error(m.getMessage());
            });
        }
        return report.isSuccess();
    }

    @Override
    public CompletionStage<Result> call(Http.Context ctx) {
        try {
            if (!isValid(ctx.request().body().asJson())) {
                return CompletableFuture.supplyAsync(Results::internalServerError);
            }
        } catch (Exception e) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        return delegate.call(ctx);
    }

}
