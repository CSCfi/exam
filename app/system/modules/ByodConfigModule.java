package system.modules;

import com.google.inject.AbstractModule;
import util.config.ByodConfigHandler;
import util.config.ByodConfigHandlerImpl;

public class ByodConfigModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(ByodConfigHandler.class).to(ByodConfigHandlerImpl.class);
    }
}
