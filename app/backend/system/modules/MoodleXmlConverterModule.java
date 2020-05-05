package backend.system.modules;

import com.google.inject.AbstractModule;

import backend.util.xml.MoodleXmlConverter;
import backend.util.xml.MoodleXmlConverterImpl;

public class MoodleXmlConverterModule extends AbstractModule {
    @Override
    protected void configure() {
        bind(MoodleXmlConverter.class).to(MoodleXmlConverterImpl.class);
    }
}
