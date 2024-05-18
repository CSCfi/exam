package system.modules

import com.google.inject.AbstractModule
import util.xml.MoodleXmlExporter
import util.xml.MoodleXmlExporterImpl
import util.xml.MoodleXmlImporter
import util.xml.MoodleXmlImporterImpl

class MoodleXmlConverterModule extends AbstractModule:
  override def configure(): Unit =
    bind(classOf[MoodleXmlExporter]).to(classOf[MoodleXmlExporterImpl])
    bind(classOf[MoodleXmlImporter]).to(classOf[MoodleXmlImporterImpl])
