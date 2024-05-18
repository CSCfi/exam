package system.modules

import com.google.inject.AbstractModule
import util.config.ConfigReader
import util.config.ConfigReaderImpl

class ConfigReaderModule extends AbstractModule:
  override def configure(): Unit = bind(classOf[ConfigReader]).to(classOf[ConfigReaderImpl])
