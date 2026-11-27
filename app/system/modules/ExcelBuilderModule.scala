// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.modules

import com.google.inject.AbstractModule
import services.excel.{ExcelBuilder, ExcelBuilderImpl}

class ExcelBuilderModule extends AbstractModule:
  override def configure(): Unit = bind(classOf[ExcelBuilder]).to(classOf[ExcelBuilderImpl])
