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

package backend.system;

import com.google.inject.AbstractModule;
import play.libs.akka.AkkaGuiceSupport;
import backend.system.actors.AssessmentSenderActor;
import backend.system.actors.AutoEvaluationNotifierActor;
import backend.system.actors.ExamAutoSaverActor;
import backend.system.actors.ExamExpirationActor;
import backend.system.actors.ReservationPollerActor;
import backend.system.actors.ReservationReminderActor;

import javax.inject.Singleton;

@Singleton
public class App extends AbstractModule implements AkkaGuiceSupport {

    @Override
    protected void configure() {
        bind(SystemInitializer.class).asEagerSingleton();
        bindActor(ExamAutoSaverActor.class, "exam-auto-saver-actor");
        bindActor(ReservationPollerActor.class, "reservation-checker-actor");
        bindActor(AutoEvaluationNotifierActor.class, "auto-evaluation-notifier-actor");
        bindActor(AssessmentSenderActor.class, "assessment-sender-actor");
        bindActor(ExamExpirationActor.class, "exam-expiration-actor");
        bindActor(ReservationReminderActor.class, "reservation-reminder-actor");
    }

}
