package system.modules;

import util.xml.MoodleXmlConverter;
import util.xml.MoodleXmlConverterImpl;
import com.google.inject.AbstractModule;

public class MoodleXmlConverterModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(MoodleXmlConverter.class).to(MoodleXmlConverterImpl.class);
    }
}
