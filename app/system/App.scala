// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system

import com.google.inject.AbstractModule
import org.joda.time.DateTimeZone
import play.api.Logging

import java.nio.charset.Charset
import javax.inject.Singleton

@Singleton
class App extends AbstractModule with Logging:
  // Set global JVM defaults before any other code runs
  Charset.defaultCharset.displayName match
    case "UTF-8" => ()
    case encoding =>
      logger.warn(
        s"Default encoding is other than UTF-8 ($encoding). This might cause problems with non-ASCII character handling!"
      )
  DateTimeZone.setDefault(DateTimeZone.forID("UTC"))

  override def configure(): Unit = bind(classOf[SystemInitializer]).asEagerSingleton()
