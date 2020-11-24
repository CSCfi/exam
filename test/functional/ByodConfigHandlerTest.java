package functional;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.running;

import backend.util.config.ByodConfigHandler;
import base.IntegrationTestCase;
import org.junit.Test;
import play.Application;
import play.inject.guice.GuiceApplicationBuilder;

public class ByodConfigHandlerTest extends IntegrationTestCase {
    private Application app = new GuiceApplicationBuilder().build();

    @Test
    public void testCalculateConfigKey() {
        running(
            app,
            () -> {
                ByodConfigHandler bch = app.injector().instanceOf(ByodConfigHandler.class);
                String key = bch.calculateConfigKey("123456");
                assertThat(key).isEqualTo("7eaf7f312acd3594c65f1c01f822a5df6cfd9c868ee77e5a0918edb0dba13efd");
            }
        );
    }

    @Test
    public void testCreateConfigFile() {
        running(
            app,
            () -> {
                ByodConfigHandler bch = app.injector().instanceOf(ByodConfigHandler.class);
                byte[] pwd = bch.getEncryptedPassword("password", "salt");
                byte[] data = bch.getExamConfig("123456", pwd, "salt");
                // sanity check that we actually have a reasonably sized file content
                assertThat(data.length).isGreaterThan(1000);
            }
        );
    }
}
