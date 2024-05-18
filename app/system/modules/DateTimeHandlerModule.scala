package system.modules

import com.google.inject.AbstractModule
import util.datetime.DateTimeHandler
import util.datetime.DateTimeHandlerImpl

class DateTimeHandlerModule extends AbstractModule:
  override def configure(): Unit = bind(classOf[DateTimeHandler]).to(classOf[DateTimeHandlerImpl])
