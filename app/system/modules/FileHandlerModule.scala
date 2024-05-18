package system.modules

import com.google.inject.AbstractModule
import util.file.FileHandler
import util.file.FileHandlerImpl

class FileHandlerModule extends AbstractModule:
  override def configure(): Unit = bind(classOf[FileHandler]).to(classOf[FileHandlerImpl])
