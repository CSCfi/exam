package backend.system.modules;

import com.google.inject.AbstractModule;

import backend.util.config.ByodConfigHandler;
import backend.util.config.ByodConfigHandlerImpl;

public class ByodConfigModule extends AbstractModule {
    @Override
    protected void configure() {
        bind(ByodConfigHandler.class).to(ByodConfigHandlerImpl.class);
    }
}
