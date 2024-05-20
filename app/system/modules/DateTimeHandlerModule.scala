// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.modules

import com.google.inject.AbstractModule
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.datetime.DateTimeHandlerImpl

class DateTimeHandlerModule extends AbstractModule:
  override def configure(): Unit = bind(classOf[DateTimeHandler]).to(classOf[DateTimeHandlerImpl])
