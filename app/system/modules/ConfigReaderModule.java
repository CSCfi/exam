package system.modules;

import com.google.inject.AbstractModule;
import util.config.ConfigReader;
import util.config.ConfigReaderImpl;

public class ConfigReaderModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(ConfigReader.class).to(ConfigReaderImpl.class);
    }
}
