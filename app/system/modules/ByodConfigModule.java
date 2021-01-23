package system.modules;

import util.config.ByodConfigHandler;
import util.config.ByodConfigHandlerImpl;
import com.google.inject.AbstractModule;

public class ByodConfigModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(ByodConfigHandler.class).to(ByodConfigHandlerImpl.class);
    }
}
