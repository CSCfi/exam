// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package functional

import base.BaseIntegrationSpec
import services.config.ByodConfigHandler

// Extends BaseIntegrationSpec so the test configuration is pinned even when the suite is run
// outside sbt (e.g. from the IDE). Booting a Play app without it falls back to application.conf,
// i.e. the dev database, which Test mode would then evolve - downs included.
class ByodConfigHandlerSpec extends BaseIntegrationSpec:

  private lazy val byodConfigHandler = app.injector.instanceOf(classOf[ByodConfigHandler])

  "ByodConfigHandler" when:
    "calculating config key" should:
      "generate correct hash for given inputs" in:
        val key = byodConfigHandler.calculateConfigKey("123456", "quit")
        key must be("359c551f6a3881ab54e744a5edc3c0eacaa5444873a9f1342d512e2609574051")

    "creating config file" should:
      "generate reasonably sized config data" in:
        val pwd  = byodConfigHandler.getEncryptedPassword("password", "salt")
        val data = byodConfigHandler.getExamConfig("123456", pwd, "salt", "quit")

        // Sanity check that we actually have a reasonably sized file content
        data.length must be > 1000
