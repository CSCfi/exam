// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package functional;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.running;

import base.IntegrationTestCase;
import miscellaneous.config.ByodConfigHandler;
import org.junit.Test;

public class ByodConfigHandlerTest extends IntegrationTestCase {

    @Test
    public void testCalculateConfigKey() {
        running(
            app,
            () -> {
                ByodConfigHandler bch = app.injector().instanceOf(ByodConfigHandler.class);
                String key = bch.calculateConfigKey("123456", "quit");
                assertThat(key).isEqualTo("8bc05b365a8093e0aeb7f4c3c3021a077bf454f12d1e232dcdef2b6f3d1098f7");
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
                byte[] data = bch.getExamConfig("123456", pwd, "salt", "quit");
                // sanity check that we actually have a reasonably sized file content
                assertThat(data.length).isGreaterThan(1000);
            }
        );
    }
}
