// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.modules

import com.google.inject.AbstractModule
import miscellaneous.excel.ExcelBuilder
import miscellaneous.excel.ExcelBuilderImpl

class ExcelBuilderModule extends AbstractModule:
  override def configure(): Unit = bind(classOf[ExcelBuilder]).to(classOf[ExcelBuilderImpl])
