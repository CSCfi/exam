package system.modules;

import util.config.ConfigReader;
import util.config.ConfigReaderImpl;
import com.google.inject.AbstractModule;

public class ConfigReaderModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(ConfigReader.class).to(ConfigReaderImpl.class);
    }
}
