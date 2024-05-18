// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.modules

import com.google.inject.AbstractModule
import util.config.ConfigReader
import util.config.ConfigReaderImpl

class ConfigReaderModule extends AbstractModule:
  override def configure(): Unit = bind(classOf[ConfigReader]).to(classOf[ConfigReaderImpl])
