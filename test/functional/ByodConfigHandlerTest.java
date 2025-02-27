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
            assertThat(key).isEqualTo("f775f524e898feaab8f110ac76ee49ea0b1c5a62b5ce53d24b53fce1132d2168");
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
