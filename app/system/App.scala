// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system

import com.google.inject.AbstractModule
import play.libs.pekko.PekkoGuiceSupport
import system.actors.*

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
