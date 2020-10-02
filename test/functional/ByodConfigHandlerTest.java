package functional;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.running;

import backend.util.config.ByodConfigHandler;
import org.junit.Test;
import play.Application;
import play.inject.guice.GuiceApplicationBuilder;

public class ByodConfigHandlerTest {
    private Application app = new GuiceApplicationBuilder().build();

    @Test
    public void testCalculateConfigKey() {
        running(
            app,
            () -> {
                ByodConfigHandler bch = app.injector().instanceOf(ByodConfigHandler.class);
                String key = bch.calculateConfigKey("123456");
                assertThat(key).isEqualTo("3a4072a8144f15ad5d10fc6d6632bdff0ee5b9c7532b9832bd9e58c52f9bcf24");
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
