package system.modules;

import com.google.inject.AbstractModule;
import util.datetime.DateTimeHandler;
import util.datetime.DateTimeHandlerImpl;

public class DateTimeHandlerModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(DateTimeHandler.class).to(DateTimeHandlerImpl.class);
    }
}
