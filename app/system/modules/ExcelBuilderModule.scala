package system.modules

import com.google.inject.AbstractModule
import util.excel.ExcelBuilder
import util.excel.ExcelBuilderImpl

class ExcelBuilderModule extends AbstractModule:
  override def configure(): Unit = bind(classOf[ExcelBuilder]).to(classOf[ExcelBuilderImpl])
