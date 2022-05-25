package system.modules;

import com.google.inject.AbstractModule;
import util.xml.MoodleXmlExporter;
import util.xml.MoodleXmlExporterImpl;
import util.xml.MoodleXmlImporter;
import util.xml.MoodleXmlImporterImpl;

public class MoodleXmlConverterModule extends AbstractModule {

    @Override
    protected void configure() {
        bind(MoodleXmlExporter.class).to(MoodleXmlExporterImpl.class);
        bind(MoodleXmlImporter.class).to(MoodleXmlImporterImpl.class);
    }
}
