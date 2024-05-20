// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.modules

import com.google.inject.AbstractModule
import miscellaneous.file.FileHandler
import miscellaneous.file.FileHandlerImpl

class FileHandlerModule extends AbstractModule:
  override def configure(): Unit = bind(classOf[FileHandler]).to(classOf[FileHandlerImpl])
