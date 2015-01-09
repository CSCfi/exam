import com.avaje.ebean.Ebean;
import com.avaje.ebean.EbeanServer;
import com.avaje.ebean.config.ServerConfig;
import com.avaje.ebean.config.dbplatform.PostgresPlatform;
import com.avaje.ebeaninternal.api.SpiEbeanServer;
import com.avaje.ebeaninternal.server.ddl.DdlGenerator;
import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import models.Exam;
import models.Language;
import org.junit.*;

import play.Configuration;
import play.test.*;
import util.SitnetUtil;

import java.io.File;
import java.io.IOException;

import static org.fest.assertions.Assertions.*;

public class IntegrationTest {

    public static FakeApplication app;

    @BeforeClass
    public static void startApp() {
        Config config = ConfigFactory.parseFile(new File("conf/integrationtest.conf"));
        app = Helpers.fakeApplication(new Configuration(config).asMap());
        Helpers.start(app); // TODO: see if we need this running before resetting db, now it appears to be so
    }

    @Before
    public void dropCreateDb() throws IOException {
        EbeanServer server = Ebean.getServer("default");
        ServerConfig config = new ServerConfig();
        DdlGenerator generator = new DdlGenerator();
        generator.setup((SpiEbeanServer) server, new PostgresPlatform(), config);
         // Drop
        generator.runScript(false, generator.generateDropDdl());
        // Create
        generator.runScript(false, generator.generateCreateDdl());
        SitnetUtil.initializeDataModel(); // unfortunately we need to add these again
    }

    @After
    public void tearDown() {
        Helpers.stop(app);
    }

    @Test
    public void test() {
        assertThat(Ebean.find(Exam.class).findRowCount()).isGreaterThan(0);
        assertThat(Ebean.find(Language.class, "mg")).isNull();
        Language lang = new Language();
        lang.setCode("mg");
        lang.save();
        assertThat(Ebean.find(Language.class, "mg")).isNotNull();
    } 

}
