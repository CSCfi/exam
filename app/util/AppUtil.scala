/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

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
