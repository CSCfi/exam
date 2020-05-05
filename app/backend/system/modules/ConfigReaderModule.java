package backend.system.modules;

import com.google.inject.AbstractModule;

import backend.util.config.ConfigReader;
import backend.util.config.ConfigReaderImpl;

public class ConfigReaderModule extends AbstractModule {
    @Override
    protected void configure() {
        bind(ConfigReader.class).to(ConfigReaderImpl.class);
    }
}
