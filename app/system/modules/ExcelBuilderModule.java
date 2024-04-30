package system.modules;

import com.google.inject.AbstractModule;
import util.excel.ExcelBuilder;
import util.excel.ExcelBuilderImpl;

public class ExcelBuilderModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(ExcelBuilder.class).to(ExcelBuilderImpl.class);
    }
}
