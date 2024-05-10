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

package system

import com.google.inject.AbstractModule
import play.libs.pekko.PekkoGuiceSupport
import system.actors._

import javax.inject.Singleton

@Singleton
class App extends AbstractModule with PekkoGuiceSupport:
  override def configure(): Unit =
    bind(classOf[SystemInitializer]).asEagerSingleton()
    bindActor(classOf[ExamAutoSaverActor], "exam-auto-saver-actor")
    bindActor(classOf[ReservationPollerActor], "reservation-checker-actor")
    bindActor(classOf[AutoEvaluationNotifierActor], "auto-evaluation-notifier-actor")
    bindActor(classOf[AssessmentTransferActor], "assessment-transfer-actor")
    bindActor(classOf[ExamExpirationActor], "exam-expiration-actor")
    bindActor(classOf[ReservationReminderActor], "reservation-reminder-actor")
    bindActor(classOf[CollaborativeAssessmentSenderActor], "collaborative-assessment-sender-actor")
    bindActor(classOf[ExternalExamExpirationActor], "external-exam-expiration-actor")
