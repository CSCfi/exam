// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package util

import impl.EmailComposer
import models.Exam
import models.User
import play.api.Logger

object AppUtil:
  private val logger = Logger(this.getClass)
  def notifyPrivateExamEnded(recipients: Set[User], exam: Exam, composer: EmailComposer): Unit =
    recipients.foreach(r =>
      composer.composePrivateExamEnded(r, exam)
      logger.info(s"Email sent to ${r.getEmail}")
    )
