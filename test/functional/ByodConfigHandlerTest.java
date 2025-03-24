package functional;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.running;

import base.IntegrationTestCase;
import org.junit.Test;
import util.config.ByodConfigHandler;

public class ByodConfigHandlerTest extends IntegrationTestCase {

    @Test
    public void testCalculateConfigKey() {
        running(app, () -> {
            ByodConfigHandler bch = app.injector().instanceOf(ByodConfigHandler.class);
            String key = bch.calculateConfigKey("123456", "quit");
            assertThat(key).isEqualTo("359c551f6a3881ab54e744a5edc3c0eacaa5444873a9f1342d512e2609574051");
        });
    }

    @Test
    public void testCreateConfigFile() {
        running(app, () -> {
            ByodConfigHandler bch = app.injector().instanceOf(ByodConfigHandler.class);
            byte[] pwd = bch.getEncryptedPassword("password", "salt");
            byte[] data = bch.getExamConfig("123456", pwd, "salt", "quit");
            // sanity check that we actually have a reasonably sized file content
            assertThat(data.length).isGreaterThan(1000);
        });
    }
}
