package system.modules;

import util.file.FileHandler;
import util.file.FileHandlerImpl;
import com.google.inject.AbstractModule;

public class FileHandlerModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(FileHandler.class).to(FileHandlerImpl.class);
    }
}
