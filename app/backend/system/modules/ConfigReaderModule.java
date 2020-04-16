package backend.system.modules;

import backend.util.config.ConfigReader;
import backend.util.config.ConfigReaderImpl;
import com.google.inject.AbstractModule;

public class ConfigReaderModule extends AbstractModule {

  @Override
  protected void configure() {
    bind(ConfigReader.class).to(ConfigReaderImpl.class);
  }
}
