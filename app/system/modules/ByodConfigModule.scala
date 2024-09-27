package system.modules

import com.google.inject.AbstractModule
import util.config.ByodConfigHandler
import util.config.ByodConfigHandlerImpl

class ByodConfigModule extends AbstractModule:
  override def configure(): Unit = bind(classOf[ByodConfigHandler]).to(classOf[ByodConfigHandlerImpl])
