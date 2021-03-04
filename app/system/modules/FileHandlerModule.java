package system.modules;

import com.google.inject.AbstractModule;
import util.file.FileHandler;
import util.file.FileHandlerImpl;

public class FileHandlerModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(FileHandler.class).to(FileHandlerImpl.class);
    }
}
