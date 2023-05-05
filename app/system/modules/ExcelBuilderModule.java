package system.modules;

import com.google.inject.AbstractModule;
import util.config.ByodConfigHandler;
import util.config.ByodConfigHandlerImpl;
import util.excel.ExcelBuilder;
import util.excel.ExcelBuilderImpl;

public class ExcelBuilderModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(ExcelBuilder.class).to(ExcelBuilderImpl.class);
    }
}
