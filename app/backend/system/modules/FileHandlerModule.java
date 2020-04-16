package backend.system.modules;

import backend.util.file.FileHandler;
import backend.util.file.FileHandlerImpl;
import com.google.inject.AbstractModule;

public class FileHandlerModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(FileHandler.class).to(FileHandlerImpl.class);
    }
}
