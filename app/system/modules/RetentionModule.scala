// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.modules

import com.google.inject.{AbstractModule, Provides, Singleton}
import com.typesafe.config.Config
import features.retention.services.{IopRetentionClient, RetentionPolicy, XmRetentionClient}

class RetentionModule extends AbstractModule:
  override def configure(): Unit =
    bind(classOf[IopRetentionClient]).to(classOf[XmRetentionClient])

  // Read once at startup, so an invalid period fails the application start
  @Provides
  @Singleton
  def retentionPolicy(config: Config): RetentionPolicy = RetentionPolicy.fromConfig(config)
