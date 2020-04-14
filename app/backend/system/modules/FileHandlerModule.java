package backend.system.modules;

import com.google.inject.AbstractModule;

import backend.util.file.FileHandler;
import backend.util.file.FileHandlerImpl;

public class FileHandlerModule extends AbstractModule {
    @Override
    protected void configure() {
        bind(FileHandler.class).to(FileHandlerImpl.class);
    }
}
