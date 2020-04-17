package backend.system.modules;

import backend.util.xml.MoodleXmlConverter;
import backend.util.xml.MoodleXmlConverterImpl;
import com.google.inject.AbstractModule;

public class MoodleXmlConverterModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(MoodleXmlConverter.class).to(MoodleXmlConverterImpl.class);
    }
}
