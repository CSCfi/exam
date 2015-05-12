package base;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import global.Global;
import play.Configuration;
import play.Mode;

import java.io.File;


public class FakeGlobal extends Global {

    @Override
    public Configuration onLoadConfig(Configuration config, File path, ClassLoader classloader, Mode mode) {
        Config fake = ConfigFactory.parseFile(new File("conf/integrationtest.conf"));
        return new Configuration(fake.withFallback(config.underlying()));
    }

}
