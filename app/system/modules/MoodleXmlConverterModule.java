package system.modules;

import com.google.inject.AbstractModule;
import util.xml.MoodleXmlConverter;
import util.xml.MoodleXmlConverterImpl;

public class MoodleXmlConverterModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(MoodleXmlConverter.class).to(MoodleXmlConverterImpl.class);
    }
}
