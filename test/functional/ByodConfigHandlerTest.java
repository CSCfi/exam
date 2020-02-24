package functional;

import org.junit.Test;
import play.Application;
import play.inject.guice.GuiceApplicationBuilder;

import backend.util.config.ByodConfigHandler;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.running;

public class ByodConfigHandlerTest {

    private Application app = new GuiceApplicationBuilder().build();

    @Test
    public void testCalculateConfigKey() {
        running(app, () -> {
            ByodConfigHandler bch = app.injector().instanceOf(ByodConfigHandler.class);
            String key = bch.calculateConfigKey("123456");
            assertThat(key).isEqualTo("485445b7b7df8fe16b2b7e736eb74f6aaf203924d0ea92d87e179bb5a4c0be43");
        });

    }

    @Test
    public void testCreateConfigFile() {
        running(app, () -> {
            ByodConfigHandler bch = app.injector().instanceOf(ByodConfigHandler.class);
            byte[] pwd = bch.getEncryptedPassword("password", "salt");
            byte[] data = bch.getExamConfig("123456", pwd, "salt");
            // sanity check that we actually have a reasonably sized file content
            assertThat(data.length).isGreaterThan(1000);
        });
    }

}
