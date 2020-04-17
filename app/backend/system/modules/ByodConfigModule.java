package backend.system.modules;

import backend.util.config.ByodConfigHandler;
import backend.util.config.ByodConfigHandlerImpl;
import com.google.inject.AbstractModule;

public class ByodConfigModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(ByodConfigHandler.class).to(ByodConfigHandlerImpl.class);
    }
}
